import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { sanitizeText, isValidSlug } from '@/lib/security';
import { getDB, logAdminAction } from '@/lib/db';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// GET /api/admin/courses — list all courses (admin, unpaginated)
// Query param `slug` returns a single course for comparison
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');

  // Single-course lookup for comparison
  if (slug) {
    try {
      const course = await db.prepare(
        'SELECT id, slug, title, provider_id, category, level, published_status, is_alison, is_affiliate, official_link, snippet, cover_image_url, duration_text, created_at, updated_at FROM courses WHERE slug = ?'
      ).bind(slug).first<import('@/lib/db').Course>();
      if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
      return NextResponse.json({ course });
    } catch {
      return NextResponse.json({ error: 'Failed to fetch course.' }, { status: 500 });
    }
  }

  try {
    const result = await db.prepare(
      'SELECT id, slug, title, provider_id, category, level, published_status, is_alison, is_affiliate, featured_priority, popularity_score, created_at, updated_at FROM courses ORDER BY updated_at DESC LIMIT 200'
    ).all<import('@/lib/db').Course>();
    return NextResponse.json({ courses: result.results, total: result.results.length });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch courses.' }, { status: 500 });
  }
}

// PATCH /api/admin/courses/:id — update a course field
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const url = new URL(req.url);
  const courseId = url.searchParams.get('id');
  if (!courseId) {
    return NextResponse.json({ error: 'Missing or invalid course ID.' }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  // Allowed update fields (strict whitelist)
  const ALLOWED_FIELDS = [
    'published_status', 'featured_priority', 'snippet', 'long_description',
    'meta_title', 'meta_description', 'og_title', 'og_description', 'cover_image_url',
    'level', 'format_type', 'certification_type', 'last_verified_at',
  ];

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if ((body as Record<string, unknown>)[field] !== undefined) {
      const val = (body as Record<string, unknown>)[field];
      updates[field] = typeof val === 'string' ? sanitizeText(val) : val;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 422 });
  }

  updates.updated_at = new Date().toISOString();

  try {
    // Get before state for audit
    const before = await db.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).first();

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), courseId];
    await db.prepare(`UPDATE courses SET ${setClauses} WHERE id = ?`).bind(...values).run();

    await logAdminAction(db, {
      adminUserId: session.userId,
      actionType: 'UPDATE',
      entityType: 'course',
      entityId: courseId,
      before,
      after: updates,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin course PATCH error:', err);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}
