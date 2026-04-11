import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { sendEmail, buildVerificationEmail } from '@/lib/email';
import { sanitizeEmail, isValidEmail } from '@/lib/security';

// POST /api/auth/resend-verification
// Accepts either a valid session cookie OR { email } in the body.
// This allows users whose session expired or was lost to still get a new link.
export async function POST(req: NextRequest) {
  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  // Try session first
  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;

  let userId: string;
  let email: string;
  let displayName: string;

  if (session) {
    // Authenticated via session cookie
    if (session.emailVerified) {
      return NextResponse.json({ error: 'Email already verified.' }, { status: 400 });
    }
    userId = session.userId;
    email = session.email;
    displayName = session.displayName ?? email.split('@')[0];
  } else {
    // No session — try email from request body
    let body: unknown;
    try { body = await req.json(); } catch { body = {}; }
    const rawEmail = (body as Record<string, unknown>).email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json({ error: 'Please enter your email address to resend the verification link.' }, { status: 400 });
    }
    const sanitized = sanitizeEmail(rawEmail);
    if (!isValidEmail(sanitized)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 422 });
    }

    // Look up user by email
    const user = await db.prepare(
      `SELECT u.id, u.email, u.email_verified, p.display_name
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.email = ?`
    ).bind(sanitized).first<{ id: string; email: string; email_verified: number; display_name: string | null }>();

    if (!user) {
      // Don't reveal whether email exists — return generic ok
      return NextResponse.json({ ok: true });
    }
    if (user.email_verified) {
      return NextResponse.json({ error: 'This email is already verified. Please sign in.' }, { status: 400 });
    }
    userId = user.id;
    email = user.email;
    displayName = user.display_name ?? email.split('@')[0];
  }

  // Throttle: check if a token was created in the last 2 minutes
  const recent = await db.prepare(
    `SELECT created_at FROM email_verification_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(userId).first<{ created_at: string }>();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < 2 * 60 * 1000) {
    return NextResponse.json({ error: 'Please wait 2 minutes before requesting a new link.' }, { status: 429 });
  }

  // Delete old tokens, create new one
  const token = nanoid(32);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(userId).run().catch(() => null);
  await db.prepare(
    'INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(nanoid(), userId, token, expires, now).run();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://learn.bytesai.uk';
  const verificationUrl = `${siteUrl}/api/auth/verify-email?token=${token}`;
  const { subject, html, text } = buildVerificationEmail({ displayName, verificationUrl, siteUrl });
  await sendEmail({ to: email, subject, html, text });

  return NextResponse.json({ ok: true });
}
