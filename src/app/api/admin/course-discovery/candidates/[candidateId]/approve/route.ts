import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getDB } from '@/lib/db';
import { approveDiscoveryCandidate } from '@/lib/course-discovery/review';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { candidateId } = await params;
  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  try {
    const result = await approveDiscoveryCandidate(db, admin.userId, candidateId, body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Approval failed.';
    const status = message.includes('not found') ? 404 : message.includes('Failed to create') ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
