import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { signSession, getSessionCookieOptions } from '@/lib/auth';

function getDB(req: NextRequest) {
  const env = (req as unknown as { env?: { DB?: import('@/lib/db').D1Database } }).env;
  return env?.DB ?? (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  picture?: string;
}

// GET /api/auth/oauth/google/callback
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = req.cookies.get('oauth_state')?.value;

  const fail = (reason: string) => NextResponse.redirect(new URL(`/auth/login?error=${reason}`, req.url));

  if (!code || !state || !storedState || state !== storedState) return fail('oauth-state-mismatch');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('oauth-not-configured');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const redirectUri = `${siteUrl}/api/auth/oauth/google/callback`;

  // Exchange code for tokens
  let googleUser: GoogleUserInfo;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) return fail('oauth-token-exchange-failed');

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    googleUser = await userRes.json() as GoogleUserInfo;
    if (!googleUser.email) return fail('oauth-no-email');
  } catch {
    return fail('oauth-fetch-failed');
  }

  const db = getDB(req);
  if (!db) return fail('service-unavailable');

  // Find or create user
  let userId: string;
  let displayName: string;
  let role: 'learner' | 'admin' = 'learner';

  const now = new Date().toISOString();

  const identity = await db.prepare(
    `SELECT user_id FROM auth_identities WHERE provider = 'google' AND provider_user_id = ?`
  ).bind(googleUser.sub).first<{ user_id: string }>();

  if (identity) {
    // Existing Google user
    userId = identity.user_id;
    const user = await db.prepare('SELECT role FROM users WHERE id = ?').bind(userId).first<{ role: 'learner' | 'admin' }>();
    role = user?.role ?? 'learner';
    const profile = await db.prepare('SELECT display_name FROM user_profiles WHERE user_id = ?').bind(userId).first<{ display_name: string }>();
    displayName = profile?.display_name ?? googleUser.name;
  } else {
    // Check if email already registered
    const existingUser = await db.prepare('SELECT id, role FROM users WHERE email = ?').bind(googleUser.email).first<{ id: string; role: 'learner' | 'admin' }>();

    if (existingUser) {
      // Link Google identity to existing account
      userId = existingUser.id;
      role = existingUser.role;
      await db.prepare(
        'INSERT OR IGNORE INTO auth_identities (id, user_id, provider, provider_user_id, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(nanoid(), userId, 'google', googleUser.sub, now).run();
      // Mark email as verified since Google verified it
      await db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').bind(now, userId).run();
      const profile = await db.prepare('SELECT display_name FROM user_profiles WHERE user_id = ?').bind(userId).first<{ display_name: string }>();
      displayName = profile?.display_name ?? googleUser.name;
    } else {
      // Create new user
      userId = nanoid();
      displayName = googleUser.name ?? googleUser.email.split('@')[0];
      await db.batch([
        db.prepare('INSERT INTO users (id, email, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, googleUser.email, 'learner', 1, now, now),
        db.prepare('INSERT INTO auth_identities (id, user_id, provider, provider_user_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(nanoid(), userId, 'google', googleUser.sub, now),
        db.prepare('INSERT INTO user_profiles (user_id, display_name, dark_mode, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, displayName, 0, 'Europe/London', now, now),
      ]);
    }
  }

  const sessionToken = await signSession({ userId, email: googleUser.email, role, displayName, emailVerified: true });
  const { name, options } = getSessionCookieOptions(7 * 24 * 60 * 60);

  const res = NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/dashboard', req.url));
  res.cookies.set(name, sessionToken, options);
  res.cookies.delete('oauth_state');
  return res;
}
