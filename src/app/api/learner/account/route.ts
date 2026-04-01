export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

function getDB(req: NextRequest) {
  const env = (req as unknown as { env?: { DB?: import('@/lib/db').D1Database } }).env;
  return env?.DB ?? (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

// DELETE /api/learner/account
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = getDB(req);
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    // D1 foreign key cascade handles related rows if FK is enabled,
    // otherwise delete child rows first
    await db.prepare('DELETE FROM user_course_progress WHERE user_id = ?').bind(session.userId).run();
    await db.prepare('DELETE FROM course_events WHERE user_id = ?').bind(session.userId).run();
    await db.prepare('DELETE FROM user_profiles WHERE user_id = ?').bind(session.userId).run();
    await db.prepare('DELETE FROM users WHERE id = ?').bind(session.userId).run();

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return res;
  } catch (err) {
    console.error('Account DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 });
  }
}
