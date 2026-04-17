import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDB } from '@/lib/db';

export async function POST(req: NextRequest) {
  let body: { visitorId?: string; referrer?: string; userAgent?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const { visitorId, referrer, userAgent } = body;
  if (!visitorId || typeof visitorId !== 'string' || visitorId.length > 64) {
    return NextResponse.json({ ok: false }, { status: 422 });
  }

  // Geo — CF header for country, CF context for city/region
  let country: string | null = req.headers.get('CF-IPCountry');
  let city: string | null = null;
  let region: string | null = null;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const cf = ctx.cf as Record<string, string | undefined> | undefined;
    if (cf) {
      country = cf.country ?? country;
      city = cf.city ?? null;
      region = cf.region ?? null;
    }
  } catch { /* local dev — no CF context */ }

  // Filter pseudo-country codes
  if (country === 'T1' || country === 'XX') country = null;

  const db = await getDB();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });

  const id = `vs-${nanoid(12)}`;
  const now = new Date().toISOString();

  try {
    await db.prepare(
      `INSERT INTO visitor_sessions (id, visitor_id, country, city, region, referrer, user_agent, started_at, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, visitorId, country, city, region, referrer?.slice(0, 500) ?? null, userAgent?.slice(0, 300) ?? null, now, now).run();
    return NextResponse.json({ sessionId: id });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
