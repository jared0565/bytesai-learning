import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDB } from '@/lib/db';

export async function POST(req: NextRequest) {
  let body: { sessionId?: string; visitorId?: string; path?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }

  const { sessionId, visitorId, path } = body;
  if (!sessionId || !visitorId || !path) return NextResponse.json({ ok: false });

  const db = await getDB();
  if (!db) return NextResponse.json({ ok: false });

  const now = new Date().toISOString();
  try {
    await db.batch([
      db.prepare(
        `INSERT INTO page_views (id, session_id, visitor_id, path, occurred_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(`pv-${nanoid(12)}`, sessionId, visitorId, path.slice(0, 500), now),
      db.prepare(
        `UPDATE visitor_sessions SET last_active_at = ? WHERE id = ?`
      ).bind(now, sessionId),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
