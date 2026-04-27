import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { scrapeAlisonSearchWithFirecrawl, ALISON_AFFILIATE_PARAMS } from '@/lib/alison';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { classifyArticle, ARTICLE_CATEGORIES } from '@/lib/classify-article';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}


export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: { title?: string; summary?: string; whyItMatters?: string; categories?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const { title, summary = '', whyItMatters = '', categories: providedCategories } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'title is required.' }, { status: 422 });

  // Use admin-assigned categories if present; otherwise classify via AI
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

  // Get Firecrawl API key
  let firecrawlKey = '';
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as Record<string, string>;
    firecrawlKey = env.FIRECRAWL_API_KEY ?? '';
  } catch {
    firecrawlKey = process.env.FIRECRAWL_API_KEY ?? '';
  }

  if (!firecrawlKey) {
    return NextResponse.json({ error: 'Firecrawl API key not configured.' }, { status: 503 });
  }

  const db = await getDB();
  const seen = new Set<string>();
  const allResults: Array<{ slug: string; title: string; category: string }> = [];

  const addResults = (results: Array<{ slug: string; title: string }>, label: string) => {
    for (const r of results) {
      if (!seen.has(r.slug)) {
        seen.add(r.slug);
        allResults.push({ ...r, category: label });
      }
    }
  };

  // Search Alison via Firecrawl for each category using human-readable search terms
  const searches = primaryCategories.map(cat => {
    const query = cat;
    return scrapeAlisonSearchWithFirecrawl(query, firecrawlKey)
      .then(results => addResults(results, cat))
      .catch(() => { /* skip failed searches */ });
  });
  await Promise.all(searches);

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
