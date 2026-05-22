import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken, verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { runScan, discoverProviderCourses, getProvidersWithSamples } from '@/lib/scanner';

async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  const bearer = auth ? await verifyBearerToken(auth) : null;
  if (bearer) return bearer;

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// GET /api/admin/scan-courses — list providers with sample courses
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  try {
    const providers = await getProvidersWithSamples(db);
    return NextResponse.json({ providers });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch providers.' }, { status: 500 });
  }
}

// POST /api/admin/scan-courses
// Body: { provider: string, limit?: number, url?: string } — legacy single-provider scan
//       OR { providerId: string, limit?: number } — new discovery-based scan
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: {
    provider?: string;
    providerId?: string;
    limit?: number;
    url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50);

  // Legacy mode: provider slug matches a hardcoded scanner
  if (body.provider) {
    const result = await runScan(body.provider, { limit, db, url: body.url });
    if (!result) {
      return NextResponse.json({ error: `No scanner found for provider "${body.provider}".` }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  // Discovery mode: providerId from database
  if (body.providerId) {
    const providers = await getProvidersWithSamples(db);
    const provider = providers.find(p => p.id === body.providerId);
    if (!provider) {
      return NextResponse.json({ error: `Provider "${body.providerId}" not found or has no courses.` }, { status: 404 });
    }

    const courses = await discoverProviderCourses(provider, { limit, db });
    const newCount = courses.filter(c => c.status === 'new').length;
    const existingCount = courses.filter(c => c.status === 'existing').length;

    return NextResponse.json({
      provider: provider.name,
      providerId: provider.id,
      catalogUrl: (await import('@/lib/scanner/discovery')).deriveCatalogUrl(provider),
      total: courses.length,
      new: newCount,
      existing: existingCount,
      courses,
    });
  }

  return NextResponse.json({ error: 'Missing provider or providerId.' }, { status: 400 });
}
