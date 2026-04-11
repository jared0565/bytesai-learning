import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, signSession, getSessionCookieOptions, COOKIE_NAME } from '@/lib/auth';
import { sendEmail, buildWelcomeEmail } from '@/lib/email';

/** Resolve the true public origin — never localhost in production. */
function siteOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && !configured.includes('localhost')) return configured;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  if (host && !host.includes('localhost')) return `${proto}://${host}`;
  return 'https://learn.bytesai.uk';
}

// GET /api/auth/verify-email?token=xxx
export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  const token = new URL(req.url).searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${origin}/auth/login?error=invalid-token`);
  }

  const db = await getDB();
  if (!db) return NextResponse.redirect(`${origin}/auth/login?error=service-unavailable`);

  const row = await db.prepare(
    'SELECT * FROM email_verification_tokens WHERE token = ?'
  ).bind(token).first<{ id: string; user_id: string; expires_at: string }>();

  if (!row) {
    return NextResponse.redirect(`${origin}/auth/login?error=invalid-token`);
  }

  if (new Date(row.expires_at) < new Date()) {
    await db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').bind(row.id).run().catch(() => null);
    return NextResponse.redirect(`${origin}/auth/login?error=token-expired`);
  }

  // Mark email as verified and delete token
  await db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), row.user_id).run();
  await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(row.user_id).run().catch(() => null);

  // Send welcome email (fire-and-forget — don't block redirect)
  const userRow = await db.prepare('SELECT email, id FROM users WHERE id = ?').bind(row.user_id).first<{ email: string; id: string }>().catch(() => null);
  const profileRow = await db.prepare('SELECT display_name FROM user_profiles WHERE user_id = ?').bind(row.user_id).first<{ display_name: string | null }>().catch(() => null);
  if (userRow) {
    const { subject, html, text } = buildWelcomeEmail({
      displayName: profileRow?.display_name ?? userRow.email.split('@')[0],
      siteUrl: origin,
    });
    sendEmail({ to: userRow.email, subject, html, text }).catch(() => null);
  }

  // Refresh session cookie if the verifying user is currently logged in
  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;

  const res = NextResponse.redirect(`${origin}/dashboard?verified=1`);

  if (session && session.userId === row.user_id) {
    const newToken = await signSession({ ...session, emailVerified: true });
    const { name, options } = getSessionCookieOptions(7 * 24 * 60 * 60);
    res.cookies.set(name, newToken, options);
  }

  return res;
}
