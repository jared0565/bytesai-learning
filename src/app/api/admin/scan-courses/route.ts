import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken, verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { runScan } from '@/lib/scanner';

async function requireAdmin(req: NextRequest) {
  // Try Bearer token first (CLI/automation)
  const auth = req.headers.get('Authorization');
  const bearer = auth ? await verifyBearerToken(auth) : null;
  if (bearer) return bearer;

  // Fall back to session cookie (browser admin UI)
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// POST /api/admin/scan-courses
// Body: { provider: string, limit?: number }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });
  }

  let body: { provider?: string; limit?: number; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const providerId = body.provider?.trim();
  if (!providerId) {
    return NextResponse.json({ error: 'Missing provider.' }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50);

  const db = await getDB();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
  }

  const result = await runScan(providerId, { limit, db, url: body.url });
  if (!result) {
    return NextResponse.json({ error: `No scanner found for provider "${providerId}".` }, { status: 404 });
  }

  return NextResponse.json(result);
}
