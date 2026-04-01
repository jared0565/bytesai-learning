import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

async function requireAdmin(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// PATCH /api/admin/courses/[id] — change published_status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { id } = await params;
  const body = await req.json() as { status?: string };
  const status = body.status;

  if (!['draft', 'published', 'archived'].includes(status ?? '')) {
    return NextResponse.json({ error: 'Invalid status. Must be draft, published, or archived.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const result = await db.prepare(
    'UPDATE courses SET published_status = ?, updated_at = ? WHERE id = ?'
  ).bind(status, now, id).run();

  if (!result.success) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  return NextResponse.json({ ok: true, status });
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
