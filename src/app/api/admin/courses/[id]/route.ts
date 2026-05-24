import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { sanitizeText } from '@/lib/security';

async function requireAdmin(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

const VALID_STATUSES = ['draft', 'published', 'archived'];

// PATCH /api/admin/courses/[id] — update course fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as string)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }
    updates.published_status = body.status;
  }
  if (body.title !== undefined) updates.title = sanitizeText(body.title as string);
  if (body.category !== undefined) updates.category = body.category ? sanitizeText(body.category as string) : null;
  if (body.level !== undefined) updates.level = body.level ? sanitizeText(body.level as string) : null;
  if (body.snippet !== undefined) updates.snippet = body.snippet ? sanitizeText(body.snippet as string) : null;
  if (body.provider_id !== undefined) updates.provider_id = body.provider_id || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  const result = await db.prepare(`UPDATE courses SET ${setClauses} WHERE id = ?`).bind(...values).run();

  if (!result.success) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/courses/[id] — permanently delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { id } = await params;
  const result = await db.prepare('DELETE FROM courses WHERE id = ?').bind(id).run();

  if (!result.success) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
