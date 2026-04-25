import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code || !/^[a-zA-Z0-9]{4,12}$/.test(code)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  let db;
  try { db = await getDB(); } catch { return NextResponse.redirect(new URL('/', req.url)); }

  const link = await db.prepare(
    'SELECT target_url FROM short_links WHERE code = ?'
  ).bind(code).first<{ target_url: string }>();

  if (!link) return NextResponse.redirect(new URL('/', req.url));

  // Fire-and-forget hit count
  db.prepare('UPDATE short_links SET hit_count = hit_count + 1 WHERE code = ?')
    .bind(code).run().catch(() => null);

  return NextResponse.redirect(link.target_url, { status: 301 });
}
