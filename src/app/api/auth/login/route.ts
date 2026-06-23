import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPassword, signSession, getSessionCookieOptions } from '@/lib/auth';
import { sanitizeEmail, isValidEmail, checkRateLimitAsync, getRateLimitKey, rateLimitResponse } from '@/lib/security';
import { getDB, getUserByEmail, getUserProfile, purgeOldAuditLogs } from '@/lib/db';

const LoginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes per IP
  const key = getRateLimitKey(req, 'login');
  const limit = await checkRateLimitAsync(key, 5, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.' }, { status: 422 });

  const { email: rawEmail, password } = parsed.data;
  const email = sanitizeEmail(rawEmail);

  if (!isValidEmail(email)) return NextResponse.json({ error: 'Invalid email address.' }, { status: 422 });

  // Turnstile check (production only, skip if keys not configured)
  {
    let turnstileSecret: string | undefined;
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const { env } = await getCloudflareContext({ async: true });
      turnstileSecret = String((env as Record<string, unknown>).TURNSTILE_SECRET_KEY ?? '').trim() || undefined;
    } catch {
      turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();
    }
    if (turnstileSecret) {
      const token = parsed.data.turnstileToken;
      if (!token) return NextResponse.json({ error: 'Bot protection token required.' }, { status: 422 });
      const tRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: turnstileSecret, response: token }),
      });
      const tData = await tRes.json() as { success: boolean };
      if (!tData.success) return NextResponse.json({ error: 'Bot protection check failed. Please try again.' }, { status: 422 });
    }
  }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  const user = await getUserByEmail(db, email).catch(() => null);

  // Always run password check to prevent timing attacks
  const passwordMatch = user?.password_hash
    ? await verifyPassword(password, user.password_hash)
    : await verifyPassword(password, 'dummy-hash-to-prevent-timing-attack');

  if (!user || !passwordMatch) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  // Get display name from profile
  const profile = await getUserProfile(db, user.id).catch(() => null);

  // Issue session
  const token = await signSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    displayName: profile?.display_name ?? email.split('@')[0],
    emailVerified: user.email_verified === 1,
  });
  const { name, options } = getSessionCookieOptions(7 * 24 * 60 * 60);

  // Update last_active_at
  await db.prepare('UPDATE users SET updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), user.id)
    .run()
    .catch(() => null);

  // Admin login: purge audit logs older than 24 months (fire-and-forget)
  if (user.role === 'admin') {
    purgeOldAuditLogs(db).catch(() => null);
  }

  // Unverified non-admin users must verify email first
  const isVerified = user.email_verified === 1;
  const redirectTo = !isVerified && user.role !== 'admin'
    ? '/auth/verify-pending'
    : user.role === 'admin' ? '/admin' : '/dashboard';
  const res = NextResponse.json({ ok: true, redirectTo }, { status: 200 });
  res.cookies.set(name, token, options);
  return res;
}
