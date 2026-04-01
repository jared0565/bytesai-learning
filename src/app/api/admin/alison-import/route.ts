export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { sanitizeText, isValidSlug } from '@/lib/security';
import { logAdminAction } from '@/lib/db';
import { nanoid } from 'nanoid';

const AFFILIATE_ID = '27668723';
const AFFILIATE_PARAMS = `utm_source=alison_user&utm_medium=affiliate&utm_campaign=${AFFILIATE_ID}`;
const ALISON_PROVIDER_ID = 'prov-alison';

function getDB(req: NextRequest) {
  const env = (req as unknown as { env?: { DB?: import('@/lib/db').D1Database } }).env;
  return env?.DB ?? (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

// ─── Scrape Alison search results ─────────────────────────────────────────────
async function scrapeAlisonSearch(query: string): Promise<Array<{ slug: string; title: string }>> {
  const url = `https://alison.com/courses?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000) });
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
      if (courses.length >= 3) return courses.slice(0, 12);
    } catch { /* fall through */ }
  }

  // Strategy 2: href="/course/{slug}" pattern
  const hrefRegex = /href="\/course\/([a-z0-9][a-z0-9-]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    const slug = m[1];
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
    /<h[1-6][^>]*>([^<]{5,120})<\/h[1-6]>/i,
  ];
  for (const p of patterns) {
    const m = ctx.match(p);
    if (m) return m[1].trim();
  }
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Scrape Alison course detail page ────────────────────────────────────────
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

async function scrapeAlisonDetail(slug: string): Promise<AlisonCourseDetail> {
  const officialLink = `https://alison.com/course/${slug}`;
  const affiliateUrl = `${officialLink}?${AFFILIATE_PARAMS}`;

  const res = await fetch(officialLink, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Alison detail returned ${res.status}`);

  const html = await res.text();
  const get = (pattern: RegExp) => html.match(pattern)?.[1]?.trim() ?? null;

  // Title
  const title =
    get(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
    get(/<title[^>]*>([^<]+)<\/title>/i) ??
    slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Description
  const description =
    get(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ??
    get(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);

  // Cover image
  const coverImageUrl = get(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

  // Learning outcomes — look for <li> items in outcomes/objectives sections
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

  // Duration — look for patterns like "3-4 Hours", "6 Hours", "1-2 weeks"
  const durationMatch = html.match(/(\d+(?:-\d+)?\s*(?:hours?|weeks?|days?|minutes?))/i);
  const duration = durationMatch ? durationMatch[1] : null;

  // Level
  const levelMatch = html.match(/\b(Beginner|Intermediate|Advanced|Expert|All Levels?)\b/i);
  const level = levelMatch
    ? levelMatch[1].replace(/all levels?/i, 'All Levels')
    : null;

  // Certificate type
  const hasCert = /diploma|certificate/i.test(html);
  const certType = hasCert ? 'Certificate (optional paid)' : null;

  // Category — look for breadcrumb or JSON-LD
  const categoryMatch = html.match(/"category"\s*:\s*"([^"]{3,80})"/i);
  const category = categoryMatch ? categoryMatch[1] : null;

  // Enrollment count — Alison shows "X,XXX Learners" or "X learners already enrolled"
  let enrollCount: number | null = null;
  const enrollPatterns = [
    /(\d[\d,]+)\s+(?:learners?|students?)\s+(?:already\s+)?enrolled/i,
    /enrolled[^<]{0,30}?(\d[\d,]+)\s+(?:learners?|students?)/i,
    /"numberOfStudents"\s*:\s*(\d+)/i,
    /(\d[\d,]+)\s+Learners/,
  ];
  for (const p of enrollPatterns) {
    const m = html.match(p);
    if (m) {
      enrollCount = parseInt(m[1].replace(/,/g, ''), 10);
      break;
    }
  }

  return {
    slug,
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

// ─── Schemas ──────────────────────────────────────────────────────────────────
const SearchSchema = z.object({ query: z.string().min(1).max(200) });
const FetchSchema = z.object({ slug: z.string().min(1).max(200) });
const ImportSchema = z.object({
  courses: z.array(z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    outcomes: z.array(z.string()).optional(),
    duration: z.string().nullable().optional(),
    level: z.string().nullable().optional(),
    coverImageUrl: z.string().nullable().optional(),
    officialLink: z.string(),
    affiliateUrl: z.string(),
    category: z.string().nullable().optional(),
    certType: z.string().nullable().optional(),
    dbCategory: z.string().nullable().optional(),   // admin-selected DB category
    publishedStatus: z.enum(['draft', 'published']).default('draft'),
    enrollCount: z.number().nullable().optional(),
  })).min(1).max(12),
});

// ─── GET — search Alison and return slugs + titles ────────────────────────────
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') ?? '';
  const slug = searchParams.get('slug') ?? '';

  const parsed = slug ? FetchSchema.safeParse({ slug }) : SearchSchema.safeParse({ query });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.' }, { status: 422 });

  try {
    if (slug) {
      const detail = await scrapeAlisonDetail(slug);
      return NextResponse.json({ detail });
    }
    const results = await scrapeAlisonSearch(query);
    return NextResponse.json({ results, query });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scrape failed.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

// ─── POST — import selected courses into D1 ───────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const db = getDB(req);
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.', detail: parsed.error.flatten() }, { status: 422 });

  const imported: Array<{ slug: string; id: string; dbSlug: string }> = [];
  const skipped: Array<{ slug: string; reason: string }> = [];
  const now = new Date().toISOString();

  for (const c of parsed.data.courses) {
    // Generate a unique slug for our DB
    let dbSlug = slugify(c.title);
    if (!isValidSlug(dbSlug)) dbSlug = `alison-${c.slug.slice(0, 80)}`;

    // Check uniqueness
    const existing = await db.prepare('SELECT id FROM courses WHERE slug = ?').bind(dbSlug).first<{ id: string }>();
    if (existing) {
      skipped.push({ slug: c.slug, reason: `slug "${dbSlug}" already exists` });
      continue;
    }

    const id = `crs-${nanoid(12)}`;
    const outcomesJson = c.outcomes?.length ? JSON.stringify(c.outcomes) : null;

    const fields = {
      id,
      slug: dbSlug,
      provider_id: ALISON_PROVIDER_ID,
      title: sanitizeText(c.title).slice(0, 200),
      content_type: 'course',
      category: c.dbCategory ?? c.category ?? 'AI Foundations',
      level: c.level ?? null,
      snippet: c.description ?? null,
      long_description: null,
      learning_outcomes_json: outcomesJson,
      duration_text: c.duration ?? null,
      official_link: c.officialLink,
      destination_url: c.affiliateUrl,
      affiliate_url: c.affiliateUrl,
      is_affiliate: 1,
      is_alison: 1,
      affiliate_provider: 'alison',
      certification_type: c.certType ?? 'Certificate (optional paid)',
      disclosure_label: 'Free to learn. We may earn a commission if you purchase a certificate.',
      cover_image_url: c.coverImageUrl ?? null,
      og_image_url: c.coverImageUrl ?? null,
      published_status: c.publishedStatus ?? 'draft',
      featured_priority: 0,
      popularity_score: 0,
      recent_views_30d: 0,
      unique_learners_30d: 0,
      starts_30d: 0,
      completion_rate: 0,
      enroll_count: c.enrollCount ?? null,
      last_verified_at: now.slice(0, 10),
      created_at: now,
      updated_at: now,
    };

    const columns = Object.keys(fields).join(', ');
    const placeholders = Object.keys(fields).map(() => '?').join(', ');

    try {
      await db.prepare(`INSERT INTO courses (${columns}) VALUES (${placeholders})`).bind(...Object.values(fields)).run();
      await logAdminAction(db, {
        adminUserId: session.userId,
        actionType: 'CREATE',
        entityType: 'course',
        entityId: id,
        after: { source: 'alison_import', alisonSlug: c.slug, ...fields },
      });
      imported.push({ slug: c.slug, id, dbSlug });
    } catch (err) {
      skipped.push({ slug: c.slug, reason: String(err) });
    }
  }

  return NextResponse.json({ ok: true, imported, skipped }, { status: imported.length ? 201 : 422 });
}
