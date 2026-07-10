import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyBearerToken, COOKIE_NAME } from '@/lib/auth';
import { getDB, logAdminAction } from '@/lib/db';
import { nanoid } from 'nanoid';

async function requireAdmin(req: NextRequest) {
  // Accept session cookie (browser) or Bearer token (CLI/automation)
  const bearer = await verifyBearerToken(req.headers.get('authorization'));
  if (bearer) return bearer;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

const VALID_EDITORIAL = ['draft', 'in_review', 'approved', 'rejected'] as const;
const VALID_PUBLISHED = ['draft', 'published', 'archived'] as const;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, char => `\\${char}`);
}

// ── GET /api/admin/curated ────────────────────────────────────────────────────
// ?id=xxx  → single page (all fields)
// ?q=xxx   → searchable list (summary fields)
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  try {
    if (id) {
      const page = await db.prepare(
        `SELECT id, slug, title, summary, why_it_matters, what_changed, executive_implications,
                primary_course_rationale, primary_course_slug, categories_json, related_course_slugs_json, source_references_json,
                meta_title, meta_description, og_title, og_description, og_image_url, og_image_alt,
                og_image_data_json, share_image_prompt, social_share_copy_json,
                social_share_copy_model, social_share_copy_generated_at,
                editorial_review_status, published_status, last_verified_at, created_at, updated_at
         FROM curated_pages WHERE id = ?`
      ).bind(id).first<import('@/lib/db').CuratedPage>();
      if (!page) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
      return NextResponse.json({ page });
    }

    const rawQuery = (url.searchParams.get('q') ?? '').trim();
    const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '200', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 200;
    const where: string[] = [];
    const bindings: Array<string | number> = [];

    if (rawQuery) {
      const like = `%${escapeLike(rawQuery.toLowerCase())}%`;
      where.push(`(
        lower(title) LIKE ? ESCAPE '\\'
        OR lower(slug) LIKE ? ESCAPE '\\'
        OR lower(coalesce(summary, '')) LIKE ? ESCAPE '\\'
        OR lower(coalesce(primary_course_slug, '')) LIKE ? ESCAPE '\\'
        OR lower(coalesce(source_references_json, '')) LIKE ? ESCAPE '\\'
      )`);
      bindings.push(like, like, like, like, like);
    }

    const result = await db.prepare(
      `SELECT id, slug, title, summary, editorial_review_status, published_status,
              primary_course_slug, categories_json, why_it_matters, what_changed, executive_implications,
              meta_description, last_verified_at, view_count, last_viewed_at,
              referrer_counts_json, ai_generated, generated_model, generated_at,
              og_title, og_description, og_image_url, og_image_alt, og_image_data_json,
              share_image_prompt, social_share_copy_json, social_share_copy_model, social_share_copy_generated_at,
              created_at, updated_at
       FROM curated_pages
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY updated_at DESC
       LIMIT ?`
    ).bind(...bindings, limit).all<import('@/lib/db').CuratedPage>();
    return NextResponse.json({ pages: result.results, query: rawQuery || null, limit });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch curated pages.' }, { status: 500 });
  }
}

// ── POST /api/admin/curated — create a new curated page ──────────────────────
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const title = (body.title as string | undefined)?.trim();
  const slug = (body.slug as string | undefined)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  if (!title || !slug) return NextResponse.json({ error: 'title and slug are required.' }, { status: 422 });

  const now = new Date().toISOString();
  const id = `cp-${nanoid(10)}`;

  const relatedSlugs = Array.isArray(body.related_course_slugs) ? body.related_course_slugs : [];
  const sourceRefs = Array.isArray(body.source_references) ? body.source_references : [];

  try {
    await db.prepare(`
      INSERT INTO curated_pages (
        id, slug, title, summary, why_it_matters, what_changed, executive_implications,
        primary_course_slug, related_course_slugs_json, source_references_json,
        meta_title, meta_description,
        editorial_review_status, published_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'draft', ?, ?)
    `).bind(
      id, slug, title,
      (body.summary as string | undefined)?.trim() || null,
      (body.why_it_matters as string | undefined)?.trim() || null,
      (body.what_changed as string | undefined)?.trim() || null,
      (body.executive_implications as string | undefined)?.trim() || null,
      (body.primary_course_slug as string | undefined)?.trim() || null,
      relatedSlugs.length ? JSON.stringify(relatedSlugs) : null,
      sourceRefs.length ? JSON.stringify(sourceRefs) : null,
      (body.meta_title as string | undefined)?.trim() || null,
      (body.meta_description as string | undefined)?.trim() || null,
      now, now
    ).run();

    await logAdminAction(db, {
      adminUserId: session.userId,
      actionType: 'CREATE',
      entityType: 'curated_page',
      entityId: id,
      before: null,
      after: { id, slug, title },
    });

    return NextResponse.json({ ok: true, id, slug });
  } catch (e: unknown) {
    if ((e as { message?: string }).message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'A page with that slug already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create page.' }, { status: 500 });
  }
}

// ── PATCH /api/admin/curated?id=xxx — update status and/or full content ───────
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const url = new URL(req.url);
  const pageId = url.searchParams.get('id');
  if (!pageId) return NextResponse.json({ error: 'Missing page ID.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  const updates: Record<string, unknown> = {};

  // Status fields
  if (body.editorial_review_status !== undefined) {
    if (!VALID_EDITORIAL.includes(body.editorial_review_status as typeof VALID_EDITORIAL[number])) {
      return NextResponse.json({ error: 'Invalid editorial_review_status.' }, { status: 422 });
    }
    updates.editorial_review_status = body.editorial_review_status;
  }
  if (body.published_status !== undefined) {
    if (!VALID_PUBLISHED.includes(body.published_status as typeof VALID_PUBLISHED[number])) {
      return NextResponse.json({ error: 'Invalid published_status.' }, { status: 422 });
    }
    updates.published_status = body.published_status;
  }

  // Content fields
  const contentFields = ['title', 'slug', 'summary', 'why_it_matters', 'what_changed',
    'executive_implications', 'primary_course_rationale', 'primary_course_slug',
    'meta_title', 'meta_description', 'og_title', 'og_description', 'og_image_url',
    'og_image_alt', 'og_image_data_json', 'share_image_prompt', 'social_share_copy_json',
    'social_share_copy_model', 'social_share_copy_generated_at'] as const;

  for (const field of contentFields) {
    if (field in body) {
      updates[field] = (body[field] as string | undefined)?.trim() || null;
    }
  }

  // Array fields — stringify for storage
  if ('related_course_slugs' in body) {
    const arr = Array.isArray(body.related_course_slugs) ? body.related_course_slugs : [];
    updates.related_course_slugs_json = arr.length ? JSON.stringify(arr) : null;
  }
  if ('categories_json' in body) {
    updates.categories_json = body.categories_json ?? null;
  }
  if ('source_references' in body) {
    const arr = Array.isArray(body.source_references) ? body.source_references : [];
    updates.source_references_json = arr.length ? JSON.stringify(arr) : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 422 });
  }

  updates.updated_at = new Date().toISOString();

  // Validate slug uniqueness if slug is being changed
  if (updates.slug) {
    const existing = await db.prepare(
      'SELECT id FROM curated_pages WHERE slug = ? AND id != ?'
    ).bind(updates.slug, pageId).first<{ id: string }>();
    if (existing) return NextResponse.json({ error: 'A page with that slug already exists.' }, { status: 409 });
  }

  try {
    const before = await db.prepare('SELECT * FROM curated_pages WHERE id = ?').bind(pageId).first();
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE curated_pages SET ${setClauses} WHERE id = ?`)
      .bind(...Object.values(updates), pageId).run();

    await logAdminAction(db, {
      adminUserId: session.userId,
      actionType: 'UPDATE',
      entityType: 'curated_page',
      entityId: pageId,
      before,
      after: updates,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}

// ── DELETE /api/admin/curated?id=xxx — permanently delete a page ──────────────
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const pageId = new URL(req.url).searchParams.get('id');
  if (!pageId) return NextResponse.json({ error: 'Missing page ID.' }, { status: 400 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const before = await db.prepare('SELECT * FROM curated_pages WHERE id = ?').bind(pageId).first();
    if (!before) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });

    await db.prepare('DELETE FROM curated_pages WHERE id = ?').bind(pageId).run();

    await logAdminAction(db, {
      adminUserId: session.userId,
      actionType: 'DELETE',
      entityType: 'curated_page',
      entityId: pageId,
      before,
      after: null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }
}
