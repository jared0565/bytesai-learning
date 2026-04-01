import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeText, checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/security';

const AFFILIATE_ID = '27668723';
const AFFILIATE_PARAMS = `utm_source=alison_user&utm_medium=affiliate&utm_campaign=${AFFILIATE_ID}`;

const SearchSchema = z.object({
  query: z.string().min(1).max(200),
});

export interface AlisonCourse {
  title: string;
  path: string;          // e.g. "introduction-to-python"
  description?: string;
  affiliateUrl: string;
}

// ─── Parse Alison search results HTML ────────────────────────────────────────
function parseAlisonHTML(html: string): AlisonCourse[] {
  const courses: AlisonCourse[] = [];
  const seen = new Set<string>();

  // Strategy 1 — __NEXT_DATA__ (Alison uses Next.js)
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      const data = JSON.parse(nextMatch[1]) as Record<string, unknown>;
      const found = extractCoursesFromNextData(data);
      if (found.length > 0) return found.slice(0, 8);
    } catch { /* fall through */ }
  }

  // Strategy 2 — JSON-LD Course schema
  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const block of jsonLdBlocks) {
    try {
      const ld = JSON.parse(block[1]);
      const items = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        if (item['@type'] === 'Course' && item.url && item.name) {
          const path = (item.url as string).replace(/^https?:\/\/alison\.com\/course\//, '').replace(/[?#].*$/, '');
          if (path && !seen.has(path)) {
            seen.add(path);
            courses.push({
              title: String(item.name),
              path,
              description: item.description ? String(item.description).slice(0, 180) : undefined,
              affiliateUrl: `https://alison.com/course/${path}?${AFFILIATE_PARAMS}`,
            });
          }
        }
      }
    } catch { /* ignore */ }
  }
  if (courses.length >= 3) return courses.slice(0, 8);

  // Strategy 3 — regex: any href="/course/{path}" links
  const hrefRegex = /href="\/course\/([a-z0-9][a-z0-9-]+(?:\/[0-9]+)?)"/gi;
  let m: RegExpExecArray | null;

  while ((m = hrefRegex.exec(html)) !== null) {
    const path = m[1].replace(/\/[0-9]+$/, ''); // strip trailing /ID
    if (seen.has(path)) continue;
    seen.add(path);

    // Grab ±400 chars of context around the match to find the title
    const ctxStart = Math.max(0, m.index - 200);
    const ctxEnd = Math.min(html.length, m.index + 400);
    const ctx = html.slice(ctxStart, ctxEnd);

    const title = extractTitleFromContext(ctx, path);
    if (title) {
      courses.push({
        title,
        path,
        affiliateUrl: `https://alison.com/course/${path}?${AFFILIATE_PARAMS}`,
      });
    }

    if (courses.length >= 8) break;
  }

  return courses.slice(0, 8);
}

function extractTitleFromContext(ctx: string, slug: string): string {
  // Try common patterns
  const patterns = [
    /title="([^"]{5,120})"/,
    /aria-label="([^"]{5,120})"/,
    /"name"\s*:\s*"([^"]{5,120})"/,
    /alt="([^"]{5,120})"/,
    /<h[1-6][^>]*>([^<]{5,120})<\/h[1-6]>/i,
    /<(?:p|span)[^>]*class="[^"]*(?:title|name|course-title|card-title)[^"]*"[^>]*>([^<]{5,120})<\//i,
  ];
  for (const p of patterns) {
    const match = ctx.match(p);
    if (match) return match[1].trim();
  }
  // Fallback: humanise slug
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function extractCoursesFromNextData(obj: unknown, depth = 0): AlisonCourse[] {
  if (depth > 8 || !obj || typeof obj !== 'object') return [];
  const courses: AlisonCourse[] = [];
  const seen = new Set<string>();

  if (Array.isArray(obj)) {
    for (const item of obj) {
      courses.push(...extractCoursesFromNextData(item, depth + 1));
      if (courses.length >= 8) break;
    }
    return courses;
  }

  const record = obj as Record<string, unknown>;

  // Check if this node looks like a course
  if (
    typeof record.slug === 'string' &&
    typeof record.title === 'string' &&
    record.slug.length > 3
  ) {
    const path = record.slug;
    if (!seen.has(path)) {
      seen.add(path);
      courses.push({
        title: record.title,
        path,
        description: typeof record.description === 'string' ? record.description.slice(0, 180) : undefined,
        affiliateUrl: `https://alison.com/course/${path}?${AFFILIATE_PARAMS}`,
      });
    }
  }

  for (const val of Object.values(record)) {
    if (val && typeof val === 'object') {
      courses.push(...extractCoursesFromNextData(val, depth + 1));
      if (courses.length >= 8) break;
    }
  }

  return courses;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit: 20 Alison searches per hour per IP
  const key = getRateLimitKey(req, 'alison-search');
  const limit = checkRateLimit(key, 20, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const parsed = SearchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.' }, { status: 422 });

  const query = sanitizeText(parsed.data.query).trim();

  try {
    const searchUrl = `https://alison.com/courses?query=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      return NextResponse.json({ courses: [], query, fetchError: res.status });
    }

    const html = await res.text();
    const courses = parseAlisonHTML(html);

    return NextResponse.json({ courses, query, ok: true });
  } catch (err) {
    console.error('Alison search error:', err);
    return NextResponse.json({ courses: [], query, fetchError: 'timeout' });
  }
}
