import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB, logAdminAction } from '@/lib/db';
import { sanitizeText, isValidSlug } from '@/lib/security';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// GET /api/admin/providers — list all providers with course counts
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const result = await db.prepare(
      `SELECT p.id, p.slug, p.name, p.website_url, p.logo_url, p.affiliate_enabled, p.affiliate_disclosure, p.created_at, p.updated_at,
              COUNT(c.id) as course_count
       FROM providers p
       LEFT JOIN courses c ON c.provider_id = p.id AND c.published_status = 'published'
       GROUP BY p.id
       ORDER BY p.name`
    ).all<{
      id: string; slug: string; name: string; website_url: string | null;
      logo_url: string | null; affiliate_enabled: number; affiliate_disclosure: string | null;
      created_at: string; updated_at: string; course_count: number;
    }>();
    return NextResponse.json({ providers: result.results });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch providers.' }, { status: 500 });
  }
}

// POST /api/admin/providers — create a new provider
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: { slug: string; name: string; website_url?: string; logo_url?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  if (!body.slug || !isValidSlug(body.slug)) {
    return NextResponse.json({ error: 'Invalid or missing slug.' }, { status: 400 });
  }
  if (!body.name || body.name.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 });
  }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const existing = await db.prepare('SELECT id FROM providers WHERE slug = ?').bind(body.slug).first();
    if (existing) {
      return NextResponse.json({ error: 'A provider with this slug already exists.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await db.prepare(
      `INSERT INTO providers (id, slug, name, website_url, logo_url, affiliate_enabled, affiliate_disclosure, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)`
    ).bind(
      id,
      body.slug.trim(),
      sanitizeText(body.name.trim()),
      body.website_url?.trim() || null,
      body.logo_url?.trim() || null,
      now,
      now
    ).run();

    await logAdminAction(db, {
      adminUserId: session.userId,
      actionType: 'CREATE',
      entityType: 'provider',
      entityId: id,
      after: { slug: body.slug, name: body.name },
    });

    return NextResponse.json({ id, slug: body.slug, name: body.name });
  } catch {
    return NextResponse.json({ error: 'Failed to create provider.' }, { status: 500 });
  }
}

// PATCH /api/admin/providers — update a provider
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const url = new URL(req.url);
  const providerId = url.searchParams.get('id');
  if (!providerId) return NextResponse.json({ error: 'Missing provider ID.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  const ALLOWED_FIELDS = ['name', 'website_url', 'logo_url', 'affiliate_enabled', 'affiliate_disclosure'];

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      const val = body[field];
      if (field === 'affiliate_enabled') {
        updates[field] = val === 1 || val === true ? 1 : 0;
      } else {
        updates[field] = typeof val === 'string' ? sanitizeText(val.trim()) : val;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 422 });
  }

  updates.updated_at = new Date().toISOString();

  try {
    const before = await db.prepare('SELECT * FROM providers WHERE id = ?').bind(providerId).first();

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), providerId];
    await db.prepare(`UPDATE providers SET ${setClauses} WHERE id = ?`).bind(...values).run();

    await logAdminAction(db, {
      adminUserId: session.userId,
      actionType: 'UPDATE',
      entityType: 'provider',
      entityId: providerId,
      before,
      after: updates,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}
