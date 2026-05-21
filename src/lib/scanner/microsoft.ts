/**
 * Microsoft Learn catalog scanner.
 * Catalog: https://learn.microsoft.com/en-us/training/browse/?products=ai
 */

import type { D1Database } from '@/lib/db';
import type { CatalogScanner, ScannedCourse } from './types';
import { fetchHTML, resolveCourse } from './base';

export const microsoftScanner: CatalogScanner = {
  id: 'microsoft',
  name: 'Microsoft Learn',
  catalogUrl: 'https://learn.microsoft.com/en-us/training/browse/?products=ai',

  async scan({ limit, db }) {
    const html = await fetchHTML(this.catalogUrl, 15_000);
    if (!html) return [];

    const seen = new Set<string>();
    const candidates: Array<{ title: string; url: string }> = [];

    // Strategy 1: JSON-LD Course/TrainingMaterial blocks
    const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const block of jsonLdBlocks) {
      try {
        const ld = JSON.parse(block[1]);
        const items: unknown[] = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          const it = item as Record<string, unknown>;
          const type = (it['@type'] as string) ?? '';
          if (type === 'Course' || type === 'LearningResource') {
            const url = typeof it.url === 'string' ? it.url : null;
            const name = typeof it.name === 'string' ? it.name : null;
            if (url && name && !seen.has(url)) {
              seen.add(url);
              candidates.push({ title: name, url: normalizeMsUrl(url) });
            }
          }
        }
      } catch { /* ignore */ }
    }

    // Strategy 2: Look for data-api-name="training-card" links
    const cardRegex = /<a[^>]*href="(\/training\/(?:modules|paths)\/[^"]+)"[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = cardRegex.exec(html)) !== null) {
      const path = m[1];
      const url = normalizeMsUrl(path);
      if (seen.has(url)) continue;
      seen.add(url);

      // Try to find a title near the link — look back up to 1500 chars for the nearest heading/text
      const lookback = html.slice(Math.max(0, m.index - 1500), m.index);
      const titleMatch = lookback.match(/<h[23][^>]*>([^<]{10,200})<\/h[23]>/i) ??
                         lookback.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{10,200})<\/span>/i) ??
                         lookback.match(/>([^<]{10,200}?)\s*<\/a>/gi);
      const rawTitle = titleMatch
        ? titleMatch[titleMatch.length - 1][1].trim()
        : path.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      const title = cleanTitle(rawTitle);
      if (title) candidates.push({ title, url });
      if (candidates.length >= limit * 2) break;
    }

    // Strategy 3: match any /training/modules/ or /training/paths/ links with nearby text
    const pathRegex = /href="(\/training\/(?:modules|paths)\/[a-z0-9-]+)\/?"/gi;
    while ((m = pathRegex.exec(html)) !== null) {
      const path = m[1];
      const url = normalizeMsUrl(path);
      if (seen.has(url)) continue;
      seen.add(url);

      const lookback = html.slice(Math.max(0, m.index - 1000), m.index);
      const titleMatch = lookback.match(/<h[23][^>]*>([^<]{10,200})<\/h[23]>/i) ??
                         lookback.match(/>([^<]{10,120})<\/[^>]+>\s*$/i);
      const rawTitle = titleMatch ? titleMatch[titleMatch.length - 1][1].trim() : path.split('/').pop() ?? '';
      const title = cleanTitle(rawTitle);
      if (title) candidates.push({ title, url });
      if (candidates.length >= limit * 2) break;
    }

    // Deduplicate and resolve
    const results: ScannedCourse[] = [];
    for (const c of candidates.slice(0, limit)) {
      results.push(await resolveCourse(db, c.title, c.url, { fetchMeta: true, timeout: 8_000 }));
    }
    return results;
  },
};

function normalizeMsUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  const base = 'https://learn.microsoft.com';
  return base + (pathOrUrl.startsWith('/') ? '' : '/') + pathOrUrl.replace(/\/$/, '');
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
