import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { isValidExternalUrl } from '@/lib/security';
import { getDB } from '@/lib/db';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// Strip trailing site-name noise from og:title / <title>
const TITLE_NOISE = [
  / [-–|]\s*(Microsoft Learn|Training|Coursera|Udemy|edX|Alison|LinkedIn Learning|Pluralsight|freeCodeCamp|Khan Academy|YouTube)\s*$/i,
  / [-–|]\s*Training\s*$/i,
];

function cleanTitle(raw: string | null): string | null {
  if (!raw) return null;
  let t = raw;
  for (const re of TITLE_NOISE) t = t.replace(re, '').trim();
  return t || raw;
}

function extractMeta(html: string) {
  const get = (pattern: RegExp) => {
    const m = html.match(pattern);
    return m?.[1]?.trim() ?? null;
  };

  const rawTitle =
    get(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
    get(/<title[^>]*>([^<]+)<\/title>/i);

  // Extract level from body text — look for the word as a standalone term
  const bodyStart = html.indexOf('</head>');
  const body = bodyStart !== -1 ? html.slice(bodyStart) : html;
  const levelMatch = body.match(/\b(Beginner|Intermediate|Advanced)\b/i);
  const level = levelMatch
    ? levelMatch[1].charAt(0).toUpperCase() + levelMatch[1].slice(1).toLowerCase()
    : null;

  return {
    title: cleanTitle(rawTitle),
    description:
      get(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ??
      get(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i),
    ogImage: get(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i),
    level,
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
      headers: { 'User-Agent': 'BytesAI Learning Bot/1.0 (+https://learn.bytesai.uk)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream returned ${res.status}.` }, { status: 422 });
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ error: 'URL does not point to an HTML page.' }, { status: 422 });
    }

    // Read up to 256 KB — enough for <head> + early body where level/details appear
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'Could not read response.' }, { status: 502 });

    let html = '';
    let bytesRead = 0;
    const limit = 262144; // 256 KB
    while (bytesRead < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.length;
      // Stop early once we have enough body content to detect level
      if (html.includes('</head>') && /\b(Beginner|Intermediate|Advanced)\b/i.test(html)) break;
    }
    reader.cancel();

    const meta = extractMeta(html);

    // Auto-detect provider by matching URL hostname against providers.website_url
    let providerId: string | null = null;
    try {
      const hostname = new URL(url as string).hostname.replace(/^www\./, '');
      const db = await getDB();
      if (db) {
        const providers = await db.prepare('SELECT id, website_url FROM providers WHERE website_url IS NOT NULL').all<{ id: string; website_url: string }>();
        const match = providers.results.find(p => {
          try {
            const ph = new URL(p.website_url).hostname.replace(/^www\./, '');
            return ph === hostname;
          } catch { return false; }
        });
        if (match) providerId = match.id;
      }
    } catch { /* non-fatal */ }

    return NextResponse.json({ ...meta, providerId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fetch failed.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
