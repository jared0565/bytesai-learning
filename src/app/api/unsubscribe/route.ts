import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/auth';
import { getDB } from '@/lib/db';

// GET /api/unsubscribe?token=xxx
// One-click unsubscribe link included in marketing emails (CAN-SPAM requirement).
// No login required — the token is a signed JWT containing the user ID.
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/unsubscribe?error=missing-token', req.url));
  }

  const userId = await verifyUnsubscribeToken(token);
  if (!userId) {
    return NextResponse.redirect(new URL('/unsubscribe?error=invalid-token', req.url));
  }

  const db = await getDB();
  if (!db) {
    return NextResponse.redirect(new URL('/unsubscribe?error=service-unavailable', req.url));
  }

  try {
    await db.prepare(
      'UPDATE user_profiles SET marketing_consent = 0, updated_at = ? WHERE user_id = ?'
    ).bind(new Date().toISOString(), userId).run();

    return NextResponse.redirect(new URL('/unsubscribe?success=1', req.url));
  } catch {
    return NextResponse.redirect(new URL('/unsubscribe?error=update-failed', req.url));
  }
}
