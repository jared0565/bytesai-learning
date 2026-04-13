import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB, logAdminAction } from '@/lib/db';
import { scrapeAlisonDetail, scrapeAlisonSearch, ALISON_PROVIDER_ID } from '@/lib/alison';
import { sanitizeText, isValidSlug } from '@/lib/security';
import { nanoid } from 'nanoid';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

function slugifyCourse(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

function extractAlisonSlug(url: string): string | null {
  // Matches: https://alison.com/course/some-course-slug
  const m = url.match(/alison\.com\/course\/([a-z0-9][a-z0-9-]+)/i);
  return m ? m[1] : null;
}

// POST /api/admin/course-resolve
// Body: { url: string }  — any Alison course URL
// Returns: { slug, title, snippet } — the DB slug (existing or newly imported)
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: { input?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const input = (body.input ?? '').trim();
  if (!input) return NextResponse.json({ error: 'input is required.' }, { status: 422 });

  // Auto-detect: URL vs keyword
  let alisonSlug: string | null = null;
  if (input.startsWith('http')) {
    alisonSlug = extractAlisonSlug(input);
    if (!alisonSlug) {
      return NextResponse.json({ error: 'Not a recognised Alison course URL. Expected format: alison.com/course/course-slug' }, { status: 422 });
    }
  } else {
    // Keyword search — take first result
    const results = await scrapeAlisonSearch(input);
    if (!results.length) {
      return NextResponse.json({ error: `No Alison courses found for "${input}". Try a different keyword.` }, { status: 404 });
    }
    alisonSlug = results[0].slug;
  }

  // Check if already in DB
  const existing = await db.prepare(
    `SELECT slug, title, snippet FROM courses WHERE destination_url LIKE ? AND is_alison = 1 LIMIT 1`
  ).bind(`%/course/${alisonSlug}%`).first<{ slug: string; title: string; snippet: string | null }>();

  if (existing) {
    return NextResponse.json({ ok: true, slug: existing.slug, title: existing.title, snippet: existing.snippet, imported: false });
  }

  // Not in DB — scrape and import
  let detail;
  try {
    detail = await scrapeAlisonDetail(alisonSlug);
  } catch (err) {
    return NextResponse.json({ error: `Could not fetch course from Alison: ${err instanceof Error ? err.message : 'scrape failed'}` }, { status: 502 });
  }

  let dbSlug = slugifyCourse(detail.title);
  if (!isValidSlug(dbSlug)) dbSlug = `alison-${alisonSlug.slice(0, 80)}`;

  // Slug collision — course already exists under another URL, return it
  const collision = await db.prepare('SELECT slug, title, snippet FROM courses WHERE slug = ? LIMIT 1')
    .bind(dbSlug).first<{ slug: string; title: string; snippet: string | null }>();
  if (collision) {
    return NextResponse.json({ ok: true, slug: collision.slug, title: collision.title, snippet: collision.snippet, imported: false });
  }

  const id = `crs-${nanoid(12)}`;
  const now = new Date().toISOString();
  const outcomesJson = detail.outcomes?.length ? JSON.stringify(detail.outcomes) : null;

  const fields = {
    id,
    slug: dbSlug,
    provider_id: ALISON_PROVIDER_ID,
    title: sanitizeText(detail.title).slice(0, 200),
    content_type: 'course',
    category: detail.category ?? 'AI Foundations',
    level: detail.level ?? null,
    snippet: detail.description ?? null,
    long_description: null,
    learning_outcomes_json: outcomesJson,
    duration_text: detail.duration ?? null,
    official_link: detail.officialLink,
    destination_url: detail.affiliateUrl,
    affiliate_url: detail.affiliateUrl,
    is_affiliate: 1,
    is_alison: 1,
    affiliate_provider: 'alison',
    certification_type: detail.certType ?? 'Certificate (optional paid)',
    disclosure_label: 'Free to learn. We may earn a commission if you purchase a certificate.',
    cover_image_url: detail.coverImageUrl ?? null,
    og_image_url: detail.coverImageUrl ?? null,
    published_status: 'published',
    featured_priority: 0,
    popularity_score: 0,
    recent_views_30d: 0,
    unique_learners_30d: 0,
    starts_30d: 0,
    completion_rate: 0,
    enroll_count: detail.enrollCount ?? null,
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
      after: { source: 'course_resolve', alisonSlug, ...fields },
    });
    return NextResponse.json({ ok: true, slug: dbSlug, title: detail.title, snippet: detail.description, imported: true });
  } catch (err) {
    return NextResponse.json({ error: `DB insert failed: ${String(err)}` }, { status: 500 });
  }
}
