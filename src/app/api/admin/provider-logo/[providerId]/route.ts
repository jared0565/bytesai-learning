import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
}

// GET /api/admin/provider-logo/[providerId] — serve provider logo from R2 (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  if (!providerId) return new NextResponse(null, { status: 404 });

  let bucket: R2Bucket | null = null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    bucket = (env as Record<string, unknown>).AVATARS as R2Bucket ?? null;
  } catch { /* local dev */ }

  if (!bucket) return new NextResponse(null, { status: 404 });

  for (const ext of ['svg', 'png', 'jpg', 'webp']) {
    const obj = await bucket.get(`logos/${providerId}.${ext}`).catch(() => null);
    if (obj) {
      const headers = new Headers();
      const contentType = obj.httpMetadata?.contentType ?? `image/${ext === 'svg' ? 'svg+xml' : ext}`;
      headers.set('Content-Type', contentType);
      headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return new NextResponse(obj.body, { headers });
    }
  }

  return new NextResponse(null, { status: 404 });
}
