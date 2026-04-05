import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB, logAdminAction } from '@/lib/db';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// GET /api/admin/settings — read all settings
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const result = await db.prepare('SELECT key, value FROM site_settings').all<{ key: string; value: string }>();
    const settings: Record<string, string> = {};
    for (const row of result.results) settings[row.key] = row.value;
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: 'Failed to load settings.' }, { status: 500 });
  }
}

// PATCH /api/admin/settings — update one or more settings
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  // Only allow known setting keys
  const ALLOWED_KEYS = ['chatbot_mode', 'tracking_codes', 'article_gen_mode', 'article_gen_frequency'];
  const now = new Date().toISOString();

  try {
    for (const key of ALLOWED_KEYS) {
      if (key in body) {
        const value = typeof body[key] === 'string' ? body[key] as string : JSON.stringify(body[key]);
        await db.prepare(
          'INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
        ).bind(key, value, now).run();
      }
    }

    await logAdminAction(db, {
      adminUserId: session.userId,
      actionType: 'UPDATE',
      entityType: 'site_settings',
      entityId: Object.keys(body).filter(k => ALLOWED_KEYS.includes(k)).join(','),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}
