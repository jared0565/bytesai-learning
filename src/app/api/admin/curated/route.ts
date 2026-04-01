export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { logAdminAction } from '@/lib/db';
import { nanoid } from 'nanoid';

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

const VALID_EDITORIAL = ['draft', 'in_review', 'approved', 'rejected'] as const;
const VALID_PUBLISHED = ['draft', 'published', 'archived'] as const;

// GET /api/admin/curated — list all curated pages
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = getDB(req);
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const result = await db.prepare(
      `SELECT id, slug, title, editorial_review_status, published_status, last_verified_at, created_at, updated_at
       FROM curated_pages ORDER BY updated_at DESC LIMIT 200`
    ).all<import('@/lib/db').CuratedPage>();
    return NextResponse.json({ pages: result.results });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch curated pages.' }, { status: 500 });
  }
}

// POST /api/admin/curated — create a new curated page
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = getDB(req);
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
        editorial_review_status, published_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'draft', ?, ?)
    `).bind(
      id, slug, title,
      (body.summary as string | undefined)?.trim() || null,
      (body.why_it_matters as string | undefined)?.trim() || null,
      (body.what_changed as string | undefined)?.trim() || null,
      (body.executive_implications as string | undefined)?.trim() || null,
      (body.primary_course_slug as string | undefined)?.trim() || null,
      relatedSlugs.length ? JSON.stringify(relatedSlugs) : null,
      sourceRefs.length ? JSON.stringify(sourceRefs) : null,
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

// PATCH /api/admin/curated?id=xxx — update editorial_review_status or published_status
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const url = new URL(req.url);
  const pageId = url.searchParams.get('id');
  if (!pageId) return NextResponse.json({ error: 'Missing page ID.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const db = getDB(req);
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  const updates: Record<string, unknown> = {};

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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 422 });
  }

  updates.updated_at = new Date().toISOString();

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
