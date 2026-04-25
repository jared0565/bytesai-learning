import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { scrapeAlisonSearch, ALISON_AFFILIATE_PARAMS } from '@/lib/alison';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: { title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const { title } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'title is required.' }, { status: 422 });

  let results: Array<{ slug: string; title: string }>;
  try {
    results = await scrapeAlisonSearch(title.trim().slice(0, 80));
  } catch {
    return NextResponse.json({ error: 'Could not reach Alison — try again.' }, { status: 502 });
  }

  if (results.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const db = await getDB();

  const suggestions = await Promise.all(
    results.slice(0, 6).map(async (r) => {
      const alisonUrl = `https://alison.com/course/${r.slug}?${ALISON_AFFILIATE_PARAMS}`;
      let dbSlug: string | null = null;
      if (db) {
        const found = await db.prepare(
          `SELECT slug FROM courses WHERE destination_url LIKE ? OR official_link LIKE ? LIMIT 1`
        ).bind(`%${r.slug}%`, `%${r.slug}%`).first<{ slug: string }>();
        dbSlug = found?.slug ?? null;
      }
      return { alisonSlug: r.slug, title: r.title, alisonUrl, dbSlug };
    })
  );

  return NextResponse.json({ suggestions });
}
