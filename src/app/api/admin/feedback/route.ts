import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// GET /api/admin/feedback?type=&sentiment=&reviewed=
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const sentiment = searchParams.get('sentiment');
  const reviewed = searchParams.get('reviewed');

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (type && ['general', 'article'].includes(type)) {
    conditions.push('type = ?');
    bindings.push(type);
  }
  if (sentiment && ['positive', 'neutral', 'negative'].includes(sentiment)) {
    conditions.push('sentiment = ?');
    bindings.push(sentiment);
  }
  if (reviewed === '0' || reviewed === '1') {
    conditions.push('reviewed = ?');
    bindings.push(Number(reviewed));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await db.prepare(
      `SELECT * FROM feedback ${where} ORDER BY created_at DESC LIMIT 300`
    ).bind(...bindings).all<{
      id: string; type: string; slug: string | null; page_url: string | null;
      sentiment: string | null; message: string | null; email: string | null;
      user_id: string | null; reviewed: number; created_at: string;
    }>();

    // Unread count (not reviewed)
    const unread = await db.prepare(
      'SELECT COUNT(*) as count FROM feedback WHERE reviewed = 0'
    ).first<{ count: number }>();

    return NextResponse.json({ feedback: result.results, unread: unread?.count ?? 0 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch feedback.' }, { status: 500 });
  }
}

// PATCH /api/admin/feedback — mark reviewed / unreviewed
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: { id?: string; reviewed?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  if (!body.id) return NextResponse.json({ error: 'Missing id.' }, { status: 422 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    await db.prepare('UPDATE feedback SET reviewed = ? WHERE id = ?')
      .bind(body.reviewed ? 1 : 0, body.id).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}

// DELETE /api/admin/feedback?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    await db.prepare('DELETE FROM feedback WHERE id = ?').bind(id).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }
}
