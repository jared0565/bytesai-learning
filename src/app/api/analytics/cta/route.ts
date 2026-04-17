import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDB } from '@/lib/db';

const VALID_TYPES = new Set(['sign_in', 'get_started', 'create_account']);

export async function POST(req: NextRequest) {
  let body: { sessionId?: string; visitorId?: string; ctaType?: string; path?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }

  const { sessionId, visitorId, ctaType, path } = body;
  if (!sessionId || !visitorId || !path || !ctaType || !VALID_TYPES.has(ctaType)) {
    return NextResponse.json({ ok: false });
  }

  const db = await getDB();
  if (!db) return NextResponse.json({ ok: false });

  try {
    await db.prepare(
      `INSERT INTO cta_events (id, session_id, visitor_id, cta_type, path, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(`cta-${nanoid(10)}`, sessionId, visitorId, ctaType, path.slice(0, 500), new Date().toISOString()).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
