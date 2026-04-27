import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { scrapeAlisonSearch, ALISON_AFFILIATE_PARAMS } from '@/lib/alison';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { classifyArticle, ARTICLE_CATEGORIES } from '@/lib/classify-article';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

async function searchCategory(category: string): Promise<Array<{ slug: string; title: string; category: string }>> {
  try {
    const results = await scrapeAlisonSearch(category);
    return results.map(r => ({ ...r, category }));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: { title?: string; summary?: string; whyItMatters?: string; categories?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const { title, summary = '', whyItMatters = '', categories: providedCategories } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'title is required.' }, { status: 422 });

  // If categories are pre-set by the admin, use them directly — skip AI classification.
  // Otherwise fall back to classifying the article content.
  let primaryCategories: string[];
  if (Array.isArray(providedCategories) && providedCategories.length > 0) {
    primaryCategories = providedCategories.filter(c => (ARTICLE_CATEGORIES as readonly string[]).includes(c));
  } else {
    let apiKey = '';
    let model = 'google/gemini-3.1-flash-lite-preview';
    try {
      const ctx = await getCloudflareContext();
      const env = ctx.env as Record<string, string>;
      apiKey = env.OPENROUTER_API_KEY ?? '';
      if (env.CHATBOT_MODEL) model = env.CHATBOT_MODEL;
    } catch { /* local dev */ }

    if (!apiKey) return NextResponse.json({ error: 'OpenRouter API key not configured.' }, { status: 503 });
    primaryCategories = await classifyArticle(title.trim(), summary, whyItMatters, apiKey, model);
  }

  if (primaryCategories.length === 0) {
    return NextResponse.json({ error: 'No categories set — assign categories first using "Auto-assign" in the Categories section.' }, { status: 422 });
  }

  const seen = new Set<string>();
  const allResults: Array<{ slug: string; title: string; category: string }> = [];

  const addResults = (results: Array<{ slug: string; title: string; category: string }>) => {
    for (const r of results) {
      if (!seen.has(r.slug)) {
        seen.add(r.slug);
        allResults.push(r);
      }
    }
  };

  // Search the categories in parallel (Alison scrape)
  const primaryResults = await Promise.all(primaryCategories.map(searchCategory));
  primaryResults.forEach(addResults);

  const db = await getDB();

  // Alison scraping returned nothing — fall back to DB keyword search
  if (allResults.length === 0 && db) {
    for (const category of primaryCategories) {
      const kw = `%${category}%`;
      try {
        const rows = await db.prepare(
          `SELECT slug, title, destination_url FROM courses
           WHERE is_alison = 1 AND published_status = 'published'
           AND (title LIKE ? OR category LIKE ?)
           LIMIT 12`
        ).bind(kw, kw).all<{ slug: string; title: string; destination_url: string | null }>();
        for (const row of (rows.results ?? [])) {
          const m = row.destination_url?.match(/\/course\/([a-z0-9][a-z0-9-]+)/i);
          if (!m) continue;
          const alisonSlug = m[1];
          if (!seen.has(alisonSlug)) {
            seen.add(alisonSlug);
            allResults.push({ slug: alisonSlug, title: row.title, category });
          }
        }
      } catch { /* DB fallback failed — skip */ }
    }
  }

  const suggestions = await Promise.all(
    allResults.map(async (r) => {
      const alisonUrl = `https://alison.com/course/${r.slug}?${ALISON_AFFILIATE_PARAMS}`;
      let dbSlug: string | null = null;
      if (db) {
        const found = await db.prepare(
          `SELECT slug FROM courses WHERE official_link = ? LIMIT 1`
        ).bind(`https://alison.com/course/${r.slug}`).first<{ slug: string }>();
        dbSlug = found?.slug ?? null;
      }
      return { alisonSlug: r.slug, title: r.title, alisonUrl, dbSlug, category: r.category };
    })
  );

  return NextResponse.json({ suggestions, categories: primaryCategories });
}
