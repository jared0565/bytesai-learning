export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, signSession, getSessionCookieOptions, COOKIE_NAME } from '@/lib/auth';

function getDB(req: NextRequest) {
  const env = (req as unknown as { env?: { DB?: import('@/lib/db').D1Database } }).env;
  return env?.DB ?? (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

// GET /api/auth/verify-email?token=xxx
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid-token', req.url));
  }

  const db = getDB(req);
  if (!db) return NextResponse.redirect(new URL('/auth/login?error=service-unavailable', req.url));

  const row = await db.prepare(
    'SELECT * FROM email_verification_tokens WHERE token = ?'
  ).bind(token).first<{ id: string; user_id: string; expires_at: string }>();

  if (!row) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid-token', req.url));
  }

  if (new Date(row.expires_at) < new Date()) {
    await db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').bind(row.id).run().catch(() => null);
    return NextResponse.redirect(new URL('/auth/login?error=token-expired', req.url));
  }

  // Mark email as verified and delete token
  await db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), row.user_id).run();
  await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(row.user_id).run().catch(() => null);

  // Refresh session cookie if user is currently logged in
  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;

  const res = NextResponse.redirect(new URL('/dashboard?verified=1', req.url));

  if (session && session.userId === row.user_id) {
    const newToken = await signSession({ ...session, emailVerified: true });
    const { name, options } = getSessionCookieOptions(7 * 24 * 60 * 60);
    res.cookies.set(name, newToken, options);
  }

  return res;
}
