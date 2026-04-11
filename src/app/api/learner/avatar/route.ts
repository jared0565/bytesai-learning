import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

interface R2Bucket {
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
}

async function getBucket(): Promise<R2Bucket | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as Record<string, unknown>).AVATARS as R2Bucket ?? null;
  } catch { return null; }
}

// POST /api/learner/avatar — upload avatar, store in R2, save URL to profile
export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 }); }

  const file = formData.get('avatar');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF images are allowed.' }, { status: 422 });
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 2 MB.' }, { status: 422 });
  }

  const bucket = await getBucket();
  if (!bucket) return NextResponse.json({ error: 'Avatar storage not available.' }, { status: 503 });

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const key = `avatars/${session.userId}.${ext}`;

  await bucket.put(key, buffer, { httpMetadata: { contentType: file.type } });

  // Stable URL served by this Worker
  const avatarUrl = `/api/avatar/${session.userId}`;

  const db = await getDB();
  if (db) {
    await db.prepare('UPDATE user_profiles SET avatar_url = ?, updated_at = ? WHERE user_id = ?')
      .bind(avatarUrl, new Date().toISOString(), session.userId)
      .run().catch(() => null);
  }

  return NextResponse.json({ ok: true, avatarUrl });
}

// DELETE /api/learner/avatar — remove avatar
export async function DELETE(req: NextRequest) {
  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const bucket = await getBucket();
  if (bucket) {
    for (const ext of ['jpg', 'png', 'webp', 'gif']) {
      await bucket.delete(`avatars/${session.userId}.${ext}`).catch(() => null);
    }
  }

  const db = await getDB();
  if (db) {
    await db.prepare('UPDATE user_profiles SET avatar_url = NULL, updated_at = ? WHERE user_id = ?')
      .bind(new Date().toISOString(), session.userId).run().catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
