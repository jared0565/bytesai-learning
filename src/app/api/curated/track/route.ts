import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// POST /api/curated/track
// Body: { slug: string; utm?: string; ref?: string }
// Fire-and-forget — increments view_count, updates last_viewed_at, and tracks referrer source.
// No auth required. One view per slug per browser session (sessionStorage dedup on client).

function classifyReferrer(utm: string | undefined, ref: string | undefined): string {
  if (utm) {
    // Normalise known UTM sources
    const u = utm.toLowerCase().trim();
    if (u === 'twitter' || u === 'x') return 'twitter';
    if (u === 'linkedin') return 'linkedin';
    if (u === 'facebook' || u === 'fb') return 'facebook';
    if (u === 'whatsapp') return 'whatsapp';
    if (u === 'reddit') return 'reddit';
    if (u === 'hackernews' || u === 'hn') return 'hackernews';
    if (u === 'google') return 'google';
    return u; // passthrough unknown utm sources
  }
  if (ref) {
    const r = ref.toLowerCase();
    if (r.includes('twitter.com') || r.includes('t.co') || r.includes('x.com')) return 'twitter';
    if (r.includes('linkedin.com')) return 'linkedin';
    if (r.includes('facebook.com') || r.includes('fb.com') || r.includes('fb.me')) return 'facebook';
    if (r.includes('wa.me') || r.includes('whatsapp.com')) return 'whatsapp';
    if (r.includes('reddit.com')) return 'reddit';
    if (r.includes('news.ycombinator.com')) return 'hackernews';
    if (r.includes('google.com') || r.includes('google.co')) return 'google';
    if (r.includes('bing.com')) return 'bing';
    if (r.includes('bytesai.uk')) return 'internal';
    return 'other';
  }
  return 'direct';
}

export async function POST(req: NextRequest) {
  let body: { slug?: string; utm?: string; ref?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }

  const slug = body.slug?.trim();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ ok: false });

  const db = await getDB();
  if (!db) return NextResponse.json({ ok: false });

  try {
    const refKey = classifyReferrer(body.utm, body.ref);
    const now = new Date().toISOString();

    // Fetch current referrer counts
    const current = await db.prepare(
      `SELECT referrer_counts_json FROM curated_pages WHERE slug = ? AND published_status = 'published'`
    ).bind(slug).first<{ referrer_counts_json: string | null }>();

    if (!current) return NextResponse.json({ ok: false }); // not found or not published

    const counts: Record<string, number> = current.referrer_counts_json
      ? JSON.parse(current.referrer_counts_json)
      : {};
    counts[refKey] = (counts[refKey] ?? 0) + 1;

    await db.prepare(`
      UPDATE curated_pages
      SET view_count = view_count + 1,
          last_viewed_at = ?,
          referrer_counts_json = ?
      WHERE slug = ? AND published_status = 'published'
    `).bind(now, JSON.stringify(counts), slug).run();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
