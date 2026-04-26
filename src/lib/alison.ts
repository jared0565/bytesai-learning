/**
 * Shared Alison.com scraping utilities.
 * Used by both the admin importer and the article-gen auto-linker.
 */

import { sanitizeText } from '@/lib/security';

export const ALISON_AFFILIATE_ID = '27668723';
export const ALISON_AFFILIATE_PARAMS = `utm_source=alison_user&utm_medium=affiliate&utm_campaign=${ALISON_AFFILIATE_ID}`;
export const ALISON_PROVIDER_ID = 'prov-alison';

export const ALISON_FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Cache-Control': 'no-cache',
};

export interface AlisonCourseDetail {
  slug: string;
  title: string;
  description: string | null;
  outcomes: string[];
  duration: string | null;
  level: string | null;
  coverImageUrl: string | null;
  officialLink: string;
  affiliateUrl: string;
  category: string | null;
  certType: string | null;
  enrollCount: number | null;
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function scrapeAlisonSearch(query: string): Promise<Array<{ slug: string; title: string }>> {
  const url = `https://alison.com/courses?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: ALISON_FETCH_HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Alison search returned ${res.status}`);

  const html = await res.text();
  const courses: Array<{ slug: string; title: string }> = [];
  const seen = new Set<string>();

  // Strategy 1: __NEXT_DATA__
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1]);
      extractFromNextData(data, courses, seen, 0);
      if (courses.length > 0) return courses.slice(0, 12);
    } catch { /* fall through */ }
  }

  // Strategy 2: JSON-LD Course schema
  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const block of jsonLdBlocks) {
    try {
      const ld = JSON.parse(block[1]);
      const items: unknown[] = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        const it = item as Record<string, unknown>;
        if (it['@type'] === 'Course' && typeof it.url === 'string' && typeof it.name === 'string') {
          const slug = it.url
            .replace(/^https?:\/\/alison\.com\/course\//, '')
            .replace(/[?#].*$/, '')
            .replace(/\/[0-9]+$/, '');
          if (slug && !seen.has(slug)) {
            seen.add(slug);
            courses.push({ slug, title: it.name });
          }
        }
      }
    } catch { /* ignore */ }
  }
  if (courses.length >= 3) return courses.slice(0, 12);

  // Strategy 3: href="/course/{slug}" or "/course/{slug}/{id}" pattern
  const hrefRegex = /href="\/course\/([a-z0-9][a-z0-9-]+(?:\/[0-9]+)?)"/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    const slug = m[1].replace(/\/[0-9]+$/, '');
    if (seen.has(slug)) continue;
    seen.add(slug);
    const ctxStart = Math.max(0, m.index - 200);
    const ctx = html.slice(ctxStart, m.index + 400);
    const title = extractTitle(ctx, slug);
    if (title) courses.push({ slug, title });
    if (courses.length >= 12) break;
  }

  return courses.slice(0, 12);
}

function extractFromNextData(obj: unknown, out: Array<{ slug: string; title: string }>, seen: Set<string>, depth: number) {
  if (depth > 8 || !obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) { extractFromNextData(item, out, seen, depth + 1); if (out.length >= 12) return; }
    return;
  }
  const r = obj as Record<string, unknown>;
  if (typeof r.slug === 'string' && typeof r.title === 'string' && r.slug.length > 3 && !seen.has(r.slug)) {
    seen.add(r.slug);
    out.push({ slug: r.slug, title: r.title });
  }
  for (const val of Object.values(r)) {
    if (val && typeof val === 'object') { extractFromNextData(val, out, seen, depth + 1); if (out.length >= 12) return; }
  }
}

function extractTitle(ctx: string, slug: string): string {
  const patterns = [
    /title="([^"]{5,120})"/,
    /aria-label="([^"]{5,120})"/,
    /"name"\s*:\s*"([^"]{5,120})"/,
    /alt="([^"]{5,120})"/,
    /<h[1-6][^>]*>([^<]{5,120})<\/h[1-6]>/i,
    /<(?:p|span)[^>]*class="[^"]*(?:title|name|course-title|card-title)[^"]*"[^>]*>([^<]{5,120})<\//i,
  ];
  for (const p of patterns) {
    const m = ctx.match(p);
    if (m) return m[1].trim();
  }
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Detail ────────────────────────────────────────────────────────────────────

export async function scrapeAlisonDetail(alisonSlug: string): Promise<AlisonCourseDetail> {
  const officialLink = `https://alison.com/course/${alisonSlug}`;
  const affiliateUrl = `${officialLink}?${ALISON_AFFILIATE_PARAMS}`;

  const res = await fetch(officialLink, { headers: ALISON_FETCH_HEADERS, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Alison detail returned ${res.status}`);

  const html = await res.text();
  const get = (pattern: RegExp) => html.match(pattern)?.[1]?.trim() ?? null;

  const title =
    get(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
    get(/<title[^>]*>([^<]+)<\/title>/i) ??
    alisonSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const description =
    get(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ??
    get(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);

  const coverImageUrl = get(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

  const outcomesMatch = html.match(/(?:learning.?outcomes?|what.?you.?will.?learn|objectives?)[^<]*<\/[^>]+>([\s\S]{0,3000})/i);
  const outcomes: string[] = [];
  if (outcomesMatch) {
    const liRegex = /<li[^>]*>\s*(?:<[^>]+>)*([^<]{10,200})(?:<[^>]+>)*\s*<\/li>/gi;
    let lm: RegExpExecArray | null;
    while ((lm = liRegex.exec(outcomesMatch[1])) !== null && outcomes.length < 8) {
      const text = lm[1].trim();
      if (text) outcomes.push(text);
    }
  }

  const durationMatch = html.match(/(\d+(?:-\d+)?\s*(?:hours?|weeks?|days?|minutes?))/i);
  const duration = durationMatch ? durationMatch[1] : null;

  const levelMatch = html.match(/\b(Beginner|Intermediate|Advanced|Expert|All Levels?)\b/i);
  const level = levelMatch ? levelMatch[1].replace(/all levels?/i, 'All Levels') : null;

  const hasCert = /diploma|certificate/i.test(html);
  const certType = hasCert ? 'Certificate (optional paid)' : null;

  const categoryMatch = html.match(/"category"\s*:\s*"([^"]{3,80})"/i);
  const category = categoryMatch ? categoryMatch[1] : null;

  let enrollCount: number | null = null;
  const enrollPatterns = [
    /(\d[\d,]+)\s+(?:learners?|students?)\s+(?:already\s+)?enrolled/i,
    /enrolled[^<]{0,30}?(\d[\d,]+)\s+(?:learners?|students?)/i,
    /"numberOfStudents"\s*:\s*(\d+)/i,
    /(\d[\d,]+)\s+Learners/,
  ];
  for (const p of enrollPatterns) {
    const m = html.match(p);
    if (m) { enrollCount = parseInt(m[1].replace(/,/g, ''), 10); break; }
  }

  return {
    slug: alisonSlug,
    title: sanitizeText(title).slice(0, 200),
    description: description ? sanitizeText(description).slice(0, 500) : null,
    outcomes,
    duration,
    level,
    coverImageUrl,
    officialLink,
    affiliateUrl,
    category,
    certType,
    enrollCount,
  };
}
