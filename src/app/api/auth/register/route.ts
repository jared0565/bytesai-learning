import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { hashPassword, signSession, getSessionCookieOptions, COOKIE_NAME } from '@/lib/auth';
import { sanitizeEmail, isValidEmail, checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/security';
import { getDB, getUserByEmail } from '@/lib/db';

const RegisterSchema = z.object({
  email: z.string().min(5).max(320),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
  marketingConsent: z.boolean().optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations per 15 minutes per IP
  const key = getRateLimitKey(req, 'register');
  const limit = checkRateLimit(key, 5, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 422 });

  const { email: rawEmail, password, displayName } = parsed.data;
  const email = sanitizeEmail(rawEmail);

  if (!isValidEmail(email)) return NextResponse.json({ error: 'Invalid email address.' }, { status: 422 });

  // Verify Turnstile in production
  if (process.env.NODE_ENV === 'production' && process.env.TURNSTILE_BYPASS !== 'true') {
    const token = parsed.data.turnstileToken;
    if (!token) return NextResponse.json({ error: 'Bot protection token required.' }, { status: 422 });
    const tRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
    });
    const tData = await tRes.json() as { success: boolean };
    if (!tData.success) return NextResponse.json({ error: 'Bot protection check failed.' }, { status: 422 });
  }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  // Check existing user
  const existing = await getUserByEmail(db, email).catch(() => null);
  if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

  // Create user
  const userId = nanoid();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  const verificationToken = nanoid(32);
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  try {
    await db.batch([
      db.prepare(
        'INSERT INTO users (id, email, password_hash, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(userId, email, passwordHash, 'learner', 0, now, now),
      db.prepare(
        'INSERT INTO auth_identities (id, user_id, provider, provider_user_id, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(nanoid(), userId, 'email', email, now),
      db.prepare(
        'INSERT INTO user_profiles (user_id, display_name, dark_mode, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(userId, displayName ?? email.split('@')[0], 0, 'Europe/London', now, now),
      db.prepare(
        'INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(nanoid(), userId, verificationToken, verificationExpires, now),
    ]);
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  console.log(`[verify-email] Verification link for ${email}: ${siteUrl}/api/auth/verify-email?token=${verificationToken}`);

  // Issue session
  const token = await signSession({ userId, email, role: 'learner', displayName: displayName ?? email.split('@')[0], emailVerified: false });
  const { name, options } = getSessionCookieOptions(7 * 24 * 60 * 60);

  const res = NextResponse.json({ ok: true, redirectTo: '/dashboard' }, { status: 201 });
  res.cookies.set(name, token, options);
  return res;
}
