import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { scrapeAlisonSearch, ALISON_AFFILIATE_PARAMS } from '@/lib/alison';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const CATEGORIES = [
  'AI Governance',
  'AI Safety',
  'Foundation Models',
  'AI Tooling',
  'AI Workflow',
  'Ethics & Bias',
  'Regulation & Compliance',
  'Technical Implementation',
  'Research & Models',
  'AI in Business',
] as const;

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

async function classifyArticle(
  title: string,
  summary: string,
  whyItMatters: string,
  apiKey: string,
  model: string,
): Promise<string[]> {
  const context = [
    `Title: ${title}`,
    summary ? `Summary: ${summary.slice(0, 300)}` : '',
    whyItMatters ? `Why it matters: ${whyItMatters.slice(0, 300)}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `Classify this AI insight article into 1 or 2 of the following categories (pick the most relevant):

${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Article:
${context}

Respond with ONLY a JSON array of the matching category names exactly as written above, e.g.: ["AI Governance", "Regulation & Compliance"]`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://learn.bytesai.uk',
        'X-Title': 'BytesAI Learning',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 60,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = (data.choices?.[0]?.message?.content ?? '').trim();
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return (parsed as string[])
        .filter(c => (CATEGORIES as readonly string[]).includes(c))
        .slice(0, 2);
    }
  } catch { /* fall through */ }
  return [];
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

  let body: { title?: string; summary?: string; whyItMatters?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const { title, summary = '', whyItMatters = '' } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'title is required.' }, { status: 422 });

  let apiKey = '';
  let model = 'google/gemini-3.1-flash-lite-preview';
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as Record<string, string>;
    apiKey = env.OPENROUTER_API_KEY ?? '';
    if (env.CHATBOT_MODEL) model = env.CHATBOT_MODEL;
  } catch { /* local dev */ }

  if (!apiKey) return NextResponse.json({ error: 'OpenRouter API key not configured.' }, { status: 503 });

  const primaryCategories = await classifyArticle(title.trim(), summary, whyItMatters, apiKey, model);
  if (primaryCategories.length === 0) {
    return NextResponse.json({ error: 'Could not classify article — add a summary or why-it-matters first.' }, { status: 422 });
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

  // Search the LLM-chosen categories in parallel
  const primaryResults = await Promise.all(primaryCategories.map(searchCategory));
  primaryResults.forEach(addResults);

  const db = await getDB();

  const suggestions = await Promise.all(
    allResults.map(async (r) => {
      const alisonUrl = `https://alison.com/course/${r.slug}?${ALISON_AFFILIATE_PARAMS}`;
      let dbSlug: string | null = null;
      if (db) {
        const found = await db.prepare(
          `SELECT slug FROM courses WHERE destination_url LIKE ? OR official_link LIKE ? LIMIT 1`
        ).bind(`%${r.slug}%`, `%${r.slug}%`).first<{ slug: string }>();
        dbSlug = found?.slug ?? null;
      }
      return { alisonSlug: r.slug, title: r.title, alisonUrl, dbSlug, category: r.category };
    })
  );

  return NextResponse.json({ suggestions, categories: primaryCategories });
}
