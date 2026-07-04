import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken, verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { createCourseFromAdminInput } from '@/lib/admin/course-ingest';

async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  const bearer = auth ? await verifyBearerToken(auth) : null;
  if (bearer) return bearer;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// POST /api/admin/courses/ingest
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const result = await createCourseFromAdminInput(db, session.userId, body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error('Course ingest error:', err);
    return NextResponse.json({ error: 'Failed to create course.' }, { status: 500 });
  }
}
