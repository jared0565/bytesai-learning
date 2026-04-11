import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, signSession, getSessionCookieOptions, COOKIE_NAME } from '@/lib/auth';
import { sanitizeText } from '@/lib/security';

const VALID_FORMATS = ['video', 'article', 'mixed', 'interactive'] as const;

// GET /api/learner/profile
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const profile = await db.prepare(
      `SELECT display_name, bio, avatar_url, dark_mode, timezone,
              learning_goal, preferred_format, marketing_consent, created_at, updated_at
       FROM user_profiles WHERE user_id = ?`
    ).bind(session.userId).first<{
      display_name: string | null; bio: string | null; avatar_url: string | null;
      dark_mode: number; timezone: string | null; learning_goal: string | null;
      preferred_format: string | null; marketing_consent: number;
      created_at: string; updated_at: string;
    }>();
    return NextResponse.json({ profile: profile ?? null });
  } catch {
    return NextResponse.json({ error: 'Failed to load profile.' }, { status: 500 });
  }
}

// PATCH /api/learner/profile
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  const updates: Record<string, unknown> = {};

  if (body.display_name !== undefined) {
    const name = sanitizeText(body.display_name).slice(0, 100);
    if (name.length < 1) return NextResponse.json({ error: 'Display name cannot be empty.' }, { status: 422 });
    updates.display_name = name;
  }

  if (body.bio !== undefined) {
    updates.bio = sanitizeText(body.bio).slice(0, 500);
  }

  if (body.learning_goal !== undefined) {
    updates.learning_goal = sanitizeText(body.learning_goal).slice(0, 300);
  }

  if (body.preferred_format !== undefined) {
    if (body.preferred_format !== null && !VALID_FORMATS.includes(body.preferred_format as typeof VALID_FORMATS[number])) {
      return NextResponse.json({ error: 'Invalid preferred_format.' }, { status: 422 });
    }
    updates.preferred_format = body.preferred_format;
  }

  if (body.dark_mode !== undefined) {
    updates.dark_mode = body.dark_mode ? 1 : 0;
  }

  if (body.marketing_consent !== undefined) {
    updates.marketing_consent = body.marketing_consent ? 1 : 0;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 422 });
  }

  updates.updated_at = new Date().toISOString();

  try {
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE user_profiles SET ${setClauses} WHERE user_id = ?`)
      .bind(...Object.values(updates), session.userId).run();

    // Re-issue session cookie if displayName changed
    const res = NextResponse.json({ ok: true });
    if (updates.display_name && updates.display_name !== session.displayName) {
      const newToken = await signSession({
        userId: session.userId,
        email: session.email,
        role: session.role,
        displayName: updates.display_name as string,
      });
      const { name, options } = getSessionCookieOptions(7 * 24 * 60 * 60);
      res.cookies.set(name, newToken, options);
    }

    return res;
  } catch (err) {
    console.error('Profile PATCH error:', err);
    return NextResponse.json({ error: 'Failed to save profile.' }, { status: 500 });
  }
}
