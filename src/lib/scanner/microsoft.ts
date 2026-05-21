/**
 * Microsoft Learn catalog scanner.
 * Catalog: https://learn.microsoft.com/en-us/training/browse/?subjects=artificial-intelligence&resource_type=course
 *
 * Microsoft Learn browse pages are JS-rendered. We use Firecrawl to execute
 * JavaScript and extract the rendered HTML, then regex-match course cards.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@/lib/db';
import type { CatalogScanner, ScannedCourse } from './types';
import { fetchHTMLWithFirecrawl, fetchHTML, resolveCourse } from './base';

const CATALOG_URL = 'https://learn.microsoft.com/en-us/training/browse/?subjects=artificial-intelligence&resource_type=course';

export const microsoftScanner: CatalogScanner = {
  id: 'microsoft',
  name: 'Microsoft Learn',
  catalogUrl: CATALOG_URL,

  async scan({ limit, db }) {
    // 1. Get Firecrawl API key from Cloudflare env
    let firecrawlKey: string | undefined;
    try {
      const { env } = await getCloudflareContext({ async: true });
      firecrawlKey = (env as Record<string, unknown>).FIRECRAWL_API_KEY as string | undefined;
    } catch { /* local dev — no Cloudflare context */ }

    // 2. Fetch rendered HTML via Firecrawl (fallback to raw fetch if no key)
    let html: string | null = null;
    if (firecrawlKey) {
      html = await fetchHTMLWithFirecrawl(CATALOG_URL, firecrawlKey, 4000);
    }
    if (!html) {
      html = await fetchHTML(CATALOG_URL, 15_000);
    }
    if (!html) return [];

    const seen = new Set<string>();
    const candidates: Array<{ title: string; url: string }> = [];

    // ── Strategy 1: training-card anchor pattern (rendered React cards) ──
    const cardRegex = /<a[^>]*href="(\/training\/(?:modules|paths)\/[^"]+)"[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = cardRegex.exec(html)) !== null) {
      const path = m[1];
      const url = normalizeMsUrl(path);
      if (seen.has(url)) continue;
      seen.add(url);

      // Walk back up to 2000 chars to find the card title
      const lookback = html.slice(Math.max(0, m.index - 2000), m.index);
      const title = extractBestTitle(lookback, path);
      if (title) candidates.push({ title, url });
      if (candidates.length >= limit * 2) break;
    }

    // ── Strategy 2: JSON-LD blocks (sometimes present) ──
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

    // ── Strategy 3: loose href fallback for any /training/modules/ or /training/paths/ ──
    const pathRegex = /href="(\/training\/(?:modules|paths)\/[a-z0-9-]+)\/?"/gi;
    while ((m = pathRegex.exec(html)) !== null) {
      const path = m[1];
      const url = normalizeMsUrl(path);
      if (seen.has(url)) continue;
      seen.add(url);

      const lookback = html.slice(Math.max(0, m.index - 1000), m.index);
      const title = extractBestTitle(lookback, path);
      if (title) candidates.push({ title, url });
      if (candidates.length >= limit * 2) break;
    }

    // 3. Resolve each candidate against the DB
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

function extractBestTitle(lookback: string, fallbackPath: string): string | null {
  // Priority: h3/h2 card title → span with "title" class → generic text near the link
  const h3Match = lookback.match(/<h[23][^>]*>([^<]{10,200})<\/h[23]>/i);
  if (h3Match) return cleanTitle(h3Match[1].trim());

  const spanMatch = lookback.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{10,200})<\/span>/i);
  if (spanMatch) return cleanTitle(spanMatch[1].trim());

  const textMatch = lookback.match(/>\s*([^<]{15,200}?)\s*<\/[^>]+>\s*$/i);
  if (textMatch) return cleanTitle(textMatch[1].trim());

  // Fallback: derive from URL path
  const slug = fallbackPath.split('/').pop() ?? '';
  if (slug.length > 3) {
    return cleanTitle(slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
  }
  return null;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
