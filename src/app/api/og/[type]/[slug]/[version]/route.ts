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

const STATIC_ARTICLE_IMAGES = new Set([
  'new-york-city-educators-and-industry-leaders-gathered-at-googles-offices-to-shap',
]);

function staticArticleImageRedirect(request: Request, slug: string, version: string): Response | null {
  if (!STATIC_ARTICLE_IMAGES.has(slug)) return null;
  const assetUrl = new URL(request.url);
  assetUrl.pathname = `/og-images/${encodeURIComponent(slug)}.png`;
  assetUrl.search = '';
  assetUrl.searchParams.set('v', version);

  return Response.redirect(assetUrl.toString(), 302);
}

export async function GET(request: Request, context: OgPathContext) {
  const { type, slug, version } = await context.params;
  const normalizedType = stripPngSuffix(type);
  const normalizedSlug = stripPngSuffix(slug);
  const normalizedVersion = stripPngSuffix(version);
  const url = new URL(request.url);

  if (normalizedType === 'article') {
    const staticImage = staticArticleImageRedirect(request, normalizedSlug, normalizedVersion);
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
