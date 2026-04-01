export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { isValidExternalUrl } from '@/lib/security';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

function extractMeta(html: string) {
  const get = (pattern: RegExp) => {
    const m = html.match(pattern);
    return m?.[1]?.trim() ?? null;
  };

  return {
    title:
      get(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
      get(/<title[^>]*>([^<]+)<\/title>/i),
    description:
      get(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ??
      get(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i),
    ogImage: get(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i),
  };
}

// POST /api/admin/courses/fetch-meta
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const url = (body as Record<string, unknown>).url;
  if (!isValidExternalUrl(url)) {
    return NextResponse.json({ error: 'Invalid or non-HTTPS URL.' }, { status: 422 });
  }

  try {
    const res = await fetch(url as string, {
      headers: { 'User-Agent': 'BytesAI Learning Bot/1.0 (+https://learn.bytesai.com)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream returned ${res.status}.` }, { status: 422 });
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ error: 'URL does not point to an HTML page.' }, { status: 422 });
    }

    // Read up to 128 KB — enough for <head>
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'Could not read response.' }, { status: 502 });

    let html = '';
    let bytesRead = 0;
    const limit = 131072; // 128 KB
    while (bytesRead < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.length;
      if (html.includes('</head>')) break;
    }
    reader.cancel();

    return NextResponse.json(extractMeta(html));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fetch failed.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
