import { GET as renderOgImage } from '../../../route';

interface OgPathContext {
  params: Promise<{
    type: string;
    slug: string;
    version: string;
  }>;
}

function stripPngSuffix(value: string): string {
  return value.toLowerCase().endsWith('.png') ? value.slice(0, -4) : value;
}

async function staticArticleImageResponse(request: Request, slug: string): Promise<Response | null> {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = `/og-images/${encodeURIComponent(slug)}.png`;
  assetUrl.search = '';

  const asset = await fetch(assetUrl.toString()).catch(() => null);
  if (!asset?.ok) return null;

  const headers = new Headers(asset.headers);
  headers.set('Content-Type', 'image/png');
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  headers.set('Content-Disposition', 'inline; filename="bytesai-og.png"');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(asset.body, { status: 200, headers });
}

export async function GET(request: Request, context: OgPathContext) {
  const { type, slug, version } = await context.params;
  const normalizedType = stripPngSuffix(type);
  const normalizedSlug = stripPngSuffix(slug);
  const normalizedVersion = stripPngSuffix(version);
  const url = new URL(request.url);

  if (normalizedType === 'article') {
    const staticImage = await staticArticleImageResponse(request, normalizedSlug);
    if (staticImage) return staticImage;
  }

  url.pathname = '/api/og';
  url.search = '';
  url.searchParams.set('type', normalizedType);
  url.searchParams.set('slug', normalizedSlug);
  url.searchParams.set('v', normalizedVersion);

  return renderOgImage(new Request(url.toString(), {
    headers: request.headers,
    method: 'GET',
  }));
}
