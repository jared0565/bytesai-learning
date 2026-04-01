export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { logAdminAction } from '@/lib/db';
import { RSS_SOURCES } from '@/lib/rss-sources';
import { fetchTrendingArticles, autoFillPageFromArticle, type ParsedArticle } from '@/lib/rss-parser';
import { nanoid } from 'nanoid';

function getDB(req: NextRequest) {
  const env = (req as unknown as { env?: { DB?: import('@/lib/db').D1Database } }).env;
  return env?.DB ?? (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// GET /api/admin/trend-engine — fetch and score articles from all RSS sources
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  try {
    const articles = await fetchTrendingArticles(RSS_SOURCES);
    return NextResponse.json({
      articles,
      sources: RSS_SOURCES.map(s => ({ id: s.id, name: s.name, tier: s.tier })),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch articles.' }, { status: 500 });
  }
}

// POST /api/admin/trend-engine — create draft curated pages from selected articles
// Body: { articles: ParsedArticle[] }
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = getDB(req);
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: { articles: ParsedArticle[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  if (!Array.isArray(body.articles) || body.articles.length === 0) {
    return NextResponse.json({ error: 'No articles provided.' }, { status: 422 });
  }

  const now = new Date().toISOString();
  const created: string[] = [];
  const skipped: Array<{ title: string; reason: string }> = [];

  for (const article of body.articles) {
    const filled = autoFillPageFromArticle(article);

    if (!filled.slug) {
      skipped.push({ title: article.title, reason: 'Could not generate slug' });
      continue;
    }

    const id = `cp-${nanoid(10)}`;

    try {
      await db.prepare(`
        INSERT INTO curated_pages (
          id, slug, title, summary, why_it_matters, what_changed, executive_implications,
          source_references_json, editorial_review_status, published_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'draft', ?, ?)
      `).bind(
        id,
        filled.slug,
        filled.title,
        filled.summary || null,
        filled.whyItMatters || null,
        filled.whatChanged || null,
        filled.executiveImplications || null,
        JSON.stringify(filled.sourceReferences),
        now,
        now,
      ).run();

      await logAdminAction(db, {
        adminUserId: session.userId,
        actionType: 'CREATE',
        entityType: 'curated_page',
        entityId: id,
        before: null,
        after: { id, slug: filled.slug, title: filled.title, source: 'trend-engine' },
      });

      created.push(filled.slug);
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? '';
      skipped.push({
        title: article.title,
        reason: msg.includes('UNIQUE') ? 'Page with this slug already exists' : 'Database error',
      });
    }
  }

  return NextResponse.json({ ok: true, created, skipped });
}
