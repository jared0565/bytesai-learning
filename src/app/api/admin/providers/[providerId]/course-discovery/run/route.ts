import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getDB } from '@/lib/db';
import { runProviderDiscovery } from '@/lib/course-discovery/run';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: { strategyId?: string; sourceUrl?: string | null; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { providerId } = await params;
  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  try {
    const result = await runProviderDiscovery(db, admin.userId, providerId, {
      strategyId: body.strategyId ?? 'auto',
      sourceUrl: body.sourceUrl ?? null,
      limit: body.limit,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Discovery failed.';
    const status = message.includes('Provider not found') ? 404 : message.includes('valid HTTPS') ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
