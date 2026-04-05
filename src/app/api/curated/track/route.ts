import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// POST /api/curated/track
// Body: { slug: string }
// Fire-and-forget — increments view_count and updates last_viewed_at.
// No auth required (public endpoint). Rate limit: one view per slug per visitor
// session is handled client-side by sessionStorage.

export async function POST(req: NextRequest) {
  let body: { slug?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }

  const slug = body.slug?.trim();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ ok: false });
  }

  const db = await getDB();
  if (!db) return NextResponse.json({ ok: false });

  try {
    await db.prepare(`
      UPDATE curated_pages
      SET view_count = view_count + 1, last_viewed_at = ?
      WHERE slug = ? AND published_status = 'published'
    `).bind(new Date().toISOString(), slug).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
