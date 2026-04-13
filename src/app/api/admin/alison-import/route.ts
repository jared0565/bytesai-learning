import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { sanitizeText, isValidSlug } from '@/lib/security';
import { getDB, logAdminAction } from '@/lib/db';
import { nanoid } from 'nanoid';
import {
  scrapeAlisonSearch,
  scrapeAlisonDetail,
  ALISON_PROVIDER_ID,
  type AlisonCourseDetail,
} from '@/lib/alison';

export type { AlisonCourseDetail };

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
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
    dbCategory: z.string().nullable().optional(),
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

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.', detail: parsed.error.flatten() }, { status: 422 });

  const imported: Array<{ slug: string; id: string; dbSlug: string }> = [];
  const skipped: Array<{ slug: string; reason: string }> = [];
  const now = new Date().toISOString();

  for (const c of parsed.data.courses) {
    let dbSlug = slugify(c.title);
    if (!isValidSlug(dbSlug)) dbSlug = `alison-${c.slug.slice(0, 80)}`;

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
