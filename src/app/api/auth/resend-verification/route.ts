export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { nanoid } from 'nanoid';

function getDB(req: NextRequest) {
  const env = (req as unknown as { env?: { DB?: import('@/lib/db').D1Database } }).env;
  return env?.DB ?? (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

// POST /api/auth/resend-verification — resend email verification link
export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  if (session.emailVerified) {
    return NextResponse.json({ error: 'Email already verified.' }, { status: 400 });
  }

  const db = getDB(req);
  if (!db) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  // Throttle: check if a token was created in the last 2 minutes
  const recent = await db.prepare(
    `SELECT created_at FROM email_verification_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(session.userId).first<{ created_at: string }>();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < 2 * 60 * 1000) {
    return NextResponse.json({ error: 'Please wait 2 minutes before requesting a new link.' }, { status: 429 });
  }

  // Delete old tokens, create new one
  const token = nanoid(32);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').bind(session.userId).run().catch(() => null);
  await db.prepare(
    'INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(nanoid(), session.userId, token, expires, now).run();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const verificationUrl = `${siteUrl}/api/auth/verify-email?token=${token}`;
  console.log(`[verify-email] Resend for ${session.email}: ${verificationUrl}`);

  // TODO: swap console.log for a real email send when an email service is configured

  return NextResponse.json({ ok: true });
}
