import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
}

// GET /api/avatar/[userId] — serve avatar from R2 (public, no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!userId) return new NextResponse(null, { status: 404 });

  let bucket: R2Bucket | null = null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    bucket = (env as Record<string, unknown>).AVATARS as R2Bucket ?? null;
  } catch { /* local dev */ }

  if (!bucket) return new NextResponse(null, { status: 404 });

  for (const ext of ['jpg', 'png', 'webp', 'gif']) {
    const obj = await bucket.get(`avatars/${userId}.${ext}`).catch(() => null);
    if (obj) {
      const headers = new Headers();
      headers.set('Content-Type', obj.httpMetadata?.contentType ?? `image/${ext}`);
      headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return new NextResponse(obj.body, { headers });
    }
  }

  return new NextResponse(null, { status: 404 });
}
