import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

const ALLOWED_HOSTS = new Set(['learn.bytesai.uk', 'localhost', '127.0.0.1']);

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const { url } = body;
  if (!url) return NextResponse.json({ error: 'url required.' }, { status: 422 });

  let parsed: URL;
  try { parsed = new URL(url); } catch { return NextResponse.json({ error: 'Invalid URL.' }, { status: 422 }); }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'Only learn.bytesai.uk URLs can be shortened.' }, { status: 422 });
  }

  const base = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    ? `${parsed.protocol}//${parsed.host}`
    : 'https://learn.bytesai.uk';

  let db;
  try { db = await getDB(); } catch { return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 }); }

  // Idempotent: same URL always returns the same code
  const existing = await db.prepare('SELECT code FROM short_links WHERE target_url = ?').bind(url).first<{ code: string }>();
  if (existing) {
    return NextResponse.json({ shortUrl: `${base}/s/${existing.code}`, code: existing.code });
  }

  const { customAlphabet } = await import('nanoid');
  const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 7);

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = nanoid();
    try {
      await db.prepare(
        'INSERT INTO short_links (code, target_url, hit_count, created_at) VALUES (?, ?, 0, ?)'
      ).bind(code, url, new Date().toISOString()).run();
      return NextResponse.json({ shortUrl: `${base}/s/${code}`, code });
    } catch {
      // Race condition or collision — check if another request already inserted this URL
      const found = await db.prepare('SELECT code FROM short_links WHERE target_url = ?').bind(url).first<{ code: string }>();
      if (found) return NextResponse.json({ shortUrl: `${base}/s/${found.code}`, code: found.code });
    }
  }

  return NextResponse.json({ error: 'Failed to create short link.' }, { status: 500 });
}
