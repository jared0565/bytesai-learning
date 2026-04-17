import { NextRequest } from 'next/server';
import { getDB } from '@/lib/db';

// Called via navigator.sendBeacon on pagehide — updates session duration.
// sendBeacon sends text/plain, so we use req.text() not req.json().
export async function POST(req: NextRequest) {
  let body: { sessionId?: string; duration?: number };
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch { return new Response(null, { status: 204 }); }

  const { sessionId, duration } = body;
  if (!sessionId || typeof duration !== 'number') return new Response(null, { status: 204 });

  const db = await getDB();
  if (!db) return new Response(null, { status: 204 });

  try {
    const capped = Math.min(Math.max(1, Math.round(duration)), 3600);
    await db.prepare(
      `UPDATE visitor_sessions SET duration_seconds = ?, last_active_at = ? WHERE id = ?`
    ).bind(capped, new Date().toISOString(), sessionId).run();
  } catch { /* ignore */ }

  return new Response(null, { status: 204 });
}
