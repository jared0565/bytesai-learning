import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getDB } from '@/lib/db';
import { reviewDiscoveryCandidate } from '@/lib/course-discovery/review';
import type { DiscoveryReviewAction } from '@/lib/course-discovery/types';

const ACTIONS = new Set(['ignore', 'reject', 'restore']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.action || !ACTIONS.has(body.action)) {
    return NextResponse.json({ error: 'action must be ignore, reject, or restore.' }, { status: 422 });
  }

  const { candidateId } = await params;
  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  try {
    const candidate = await reviewDiscoveryCandidate(db, admin.userId, candidateId, body.action as DiscoveryReviewAction);
    return NextResponse.json({ candidate });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Review failed.';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
