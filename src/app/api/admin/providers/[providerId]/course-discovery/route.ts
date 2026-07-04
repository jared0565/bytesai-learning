import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getDB } from '@/lib/db';
import { getProviderDiscoveryState } from '@/lib/course-discovery/run';
import { getStrategiesForProvider } from '@/lib/course-discovery/strategies';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const { providerId } = await params;
  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const status = req.nextUrl.searchParams.get('status');
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50);
  const state = await getProviderDiscoveryState(db, providerId, { status, limit });
  if (!state) return NextResponse.json({ error: 'Provider not found.' }, { status: 404 });

  return NextResponse.json({
    ...state,
    strategies: getStrategiesForProvider(state.provider).map(strategy => ({
      id: strategy.id,
      label: strategy.label,
      defaultSourceUrl: strategy.getDefaultSourceUrl({
        provider: state.provider,
        sampleCourses: [],
      }),
    })),
  });
}
