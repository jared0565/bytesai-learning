// JWT-based auth — HttpOnly cookie sessions
// Roles: learner | admin

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  role: 'learner' | 'admin';
  displayName?: string;
  emailVerified?: boolean;
}

const COOKIE_NAME = 'bytesai_session';
const DEFAULT_EXPIRES = '7d';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? DEFAULT_EXPIRES;
  const expMs = parseDuration(expiresIn);
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + expMs) / 1000))
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAgeSeconds: number) {
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: maxAgeSeconds,
    },
  };
}

export { COOKIE_NAME };

// ─── Long-lived CLI token (for automated/CLI admin access) ───────────────────

/** Generate a non-expiring admin JWT for CLI/automation use.
 *  Call once from a logged-in admin session via GET /api/admin/cli-token.
 *  Store the result as the BYTESAI_CLI_TOKEN Worker secret.
 */
export async function signCliToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email, role: 'admin', purpose: 'cli' } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    // 10-year expiry — effectively permanent
    .setExpirationTime(Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60)
    .sign(getSecret());
}

/** Verify a Bearer token from Authorization header.
 *  Accepts both regular session JWTs and CLI tokens (purpose: cli).
 *  Returns the session payload if valid admin, null otherwise.
 */
export async function verifyBearerToken(authHeader: string | null): Promise<SessionPayload | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as SessionPayload;
    if (session.role !== 'admin') return null;
    return session;
  } catch {
    return null;
  }
}

function parseDuration(d: string): number {
  const match = d.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * multipliers[unit];
}

// ─── Unsubscribe tokens (1-year JWT, purpose: 'unsubscribe') ─────────

export async function signUnsubscribeToken(userId: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
  return new SignJWT({ userId, purpose: 'unsubscribe' } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getSecret());
}

export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if ((payload as Record<string, unknown>).purpose !== 'unsubscribe') return null;
    return (payload as Record<string, unknown>).userId as string ?? null;
  } catch {
    return null;
  }
}

// ─── Password hashing (Web Crypto — Cloudflare compatible) ────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    key, 256
  );
  const hash = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + hash.length);
  combined.set(salt);
  combined.set(hash, salt.length);
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
      key, 256
    );
    const hash = new Uint8Array(bits);
    if (hash.length !== storedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ storedHash[i];
    return diff === 0;
  } catch {
    return false;
  }
}
