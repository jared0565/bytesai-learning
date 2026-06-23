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

export async function GET(request: Request, context: OgPathContext) {
  const { type, slug, version } = await context.params;
  const normalizedType = stripPngSuffix(type);
  const normalizedSlug = stripPngSuffix(slug);
  const normalizedVersion = stripPngSuffix(version);
  const url = new URL(request.url);

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

