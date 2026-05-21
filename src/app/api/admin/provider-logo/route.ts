import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { verifyBearerToken } from '@/lib/auth';
import { getDB } from '@/lib/db';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 1 * 1024 * 1024; // 1 MB

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

// POST /api/admin/provider-logo — upload a provider logo to R2
export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  const admin = await verifyBearerToken(auth);
  if (!admin) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 }); }

  const providerId = formData.get('providerId');
  if (typeof providerId !== 'string' || !providerId) {
    return NextResponse.json({ error: 'Missing providerId.' }, { status: 400 });
  }

  const file = formData.get('logo');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or SVG images are allowed.' }, { status: 422 });
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 1 MB.' }, { status: 422 });
  }

  const bucket = await getBucket();
  if (!bucket) return NextResponse.json({ error: 'Logo storage not available.' }, { status: 503 });

  const ext = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1].replace('jpeg', 'jpg');
  const key = `logos/${providerId}.${ext}`;

  await bucket.put(key, buffer, { httpMetadata: { contentType: file.type } });

  // Stable URL served by this Worker
  const logoUrl = `/api/admin/provider-logo/${providerId}`;

  // Save to database
  const db = await getDB();
  if (db) {
    await db.prepare('UPDATE providers SET logo_url = ?, updated_at = ? WHERE id = ?')
      .bind(logoUrl, new Date().toISOString(), providerId)
      .run().catch(() => null);
  }

  return NextResponse.json({ ok: true, logoUrl });
}
