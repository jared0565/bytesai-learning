/**
 * Shared scanner utilities — fetch helpers, deduplication, meta extraction.
 */

import type { D1Database } from '@/lib/db';
import type { ScannedCourse } from './types';

export const SCANNER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Cache-Control': 'no-cache',
};

export async function fetchHTML(url: string, timeout = 10_000): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: SCANNER_HEADERS, signal: AbortSignal.timeout(timeout) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Use Firecrawl to render JS-heavy pages (Alison search, Microsoft Learn browse, etc.). */
export async function fetchHTMLWithFirecrawl(url: string, apiKey: string, waitFor = 3000): Promise<string | null> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['html'], waitFor }),
      signal: AbortSignal.timeout(35_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { success?: boolean; data?: { html?: string } };
    return data.data?.html ?? null;
  } catch {
    return null;
  }
}

export function extractOpenGraph(html: string): { title: string | null; description: string | null; image: string | null } {
  const get = (pattern: RegExp) => html.match(pattern)?.[1]?.trim() ?? null;
  return {
    title: get(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ?? get(/<title[^>]*>([^<]+)<\/title>/i),
    description: get(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ?? get(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i),
    image: get(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i),
  };
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

/**
 * Check if a course already exists by official_link.
 * Returns the slug if found, null otherwise.
 */
export async function findExistingByUrl(db: D1Database, url: string): Promise<string | null> {
  try {
    const row = await db.prepare('SELECT slug FROM courses WHERE official_link = ?').bind(url).first<{ slug: string }>();
    return row?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if a course already exists by slugified title (secondary dedup).
 */
export async function findExistingByTitle(db: D1Database, title: string): Promise<string | null> {
  try {
    const slug = slugify(title);
    const row = await db.prepare('SELECT slug FROM courses WHERE slug = ?').bind(slug).first<{ slug: string }>();
    return row?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * Build a ScannedCourse with deduplication checks.
 * If new, optionally fetches the page for og:title/og:description/og:image.
 */
export async function resolveCourse(
  db: D1Database,
  title: string,
  url: string,
  opts: { fetchMeta?: boolean; timeout?: number } = {},
): Promise<ScannedCourse> {
  const existingSlug = await findExistingByUrl(db, url) ?? await findExistingByTitle(db, title);
  if (existingSlug) {
    return { title, url, status: 'existing', existingSlug };
  }

  let meta: ScannedCourse['meta'] = undefined;
  if (opts.fetchMeta) {
    const html = await fetchHTML(url, opts.timeout);
    if (html) {
      const og = extractOpenGraph(html);
      meta = {
        title: og.title && og.title !== title ? og.title : null,
        description: og.description,
        image: og.image,
      };
    }
  }

  return { title, url, status: 'new', meta };
}
