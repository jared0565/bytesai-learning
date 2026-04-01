import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { signSession, getSessionCookieOptions } from '@/lib/auth';

interface LinkedInUserInfo {
  sub: string;
  name: string;
  given_name?: string;
  email: string;
  email_verified?: boolean;
  picture?: string;
}

// GET /api/auth/oauth/linkedin/callback
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = req.cookies.get('oauth_state')?.value;

  const fail = (reason: string) => NextResponse.redirect(new URL(`/auth/login?error=${reason}`, req.url));

  if (!code || !state || !storedState || state !== storedState) return fail('oauth-state-mismatch');

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('oauth-not-configured');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const redirectUri = `${siteUrl}/api/auth/oauth/linkedin/callback`;

  // Exchange code for access token
  let linkedInUser: LinkedInUserInfo;
  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) return fail('oauth-token-exchange-failed');

    // LinkedIn OIDC userinfo endpoint
    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    linkedInUser = await userRes.json() as LinkedInUserInfo;
    if (!linkedInUser.email) return fail('oauth-no-email');
  } catch {
    return fail('oauth-fetch-failed');
  }

  const db = await getDB();
  if (!db) return fail('service-unavailable');

  const now = new Date().toISOString();
  let userId: string;
  let displayName: string;
  let role: 'learner' | 'admin' = 'learner';

  const identity = await db.prepare(
    `SELECT user_id FROM auth_identities WHERE provider = 'linkedin' AND provider_user_id = ?`
  ).bind(linkedInUser.sub).first<{ user_id: string }>();

  if (identity) {
    userId = identity.user_id;
    const user = await db.prepare('SELECT role FROM users WHERE id = ?').bind(userId).first<{ role: 'learner' | 'admin' }>();
    role = user?.role ?? 'learner';
    const profile = await db.prepare('SELECT display_name FROM user_profiles WHERE user_id = ?').bind(userId).first<{ display_name: string }>();
    displayName = profile?.display_name ?? linkedInUser.name;
  } else {
    const existingUser = await db.prepare('SELECT id, role FROM users WHERE email = ?').bind(linkedInUser.email).first<{ id: string; role: 'learner' | 'admin' }>();

    if (existingUser) {
      userId = existingUser.id;
      role = existingUser.role;
      await db.prepare(
        'INSERT OR IGNORE INTO auth_identities (id, user_id, provider, provider_user_id, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(nanoid(), userId, 'linkedin', linkedInUser.sub, now).run();
      await db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').bind(now, userId).run();
      const profile = await db.prepare('SELECT display_name FROM user_profiles WHERE user_id = ?').bind(userId).first<{ display_name: string }>();
      displayName = profile?.display_name ?? linkedInUser.name;
    } else {
      userId = nanoid();
      displayName = linkedInUser.name ?? linkedInUser.email.split('@')[0];
      await db.batch([
        db.prepare('INSERT INTO users (id, email, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, linkedInUser.email, 'learner', 1, now, now),
        db.prepare('INSERT INTO auth_identities (id, user_id, provider, provider_user_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(nanoid(), userId, 'linkedin', linkedInUser.sub, now),
        db.prepare('INSERT INTO user_profiles (user_id, display_name, dark_mode, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, displayName, 0, 'Europe/London', now, now),
      ]);
    }
  }

  const sessionToken = await signSession({ userId, email: linkedInUser.email, role, displayName, emailVerified: true });
  const { name, options } = getSessionCookieOptions(7 * 24 * 60 * 60);

  const res = NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/dashboard', req.url));
  res.cookies.set(name, sessionToken, options);
  res.cookies.delete('oauth_state');
  return res;
}
