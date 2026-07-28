import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB, logAdminAction } from '@/lib/db';
import { RSS_SOURCES } from '@/lib/rss-sources';
import { fetchTrendingArticles, type ParsedArticle } from '@/lib/rss-parser';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { nanoid } from 'nanoid';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// ── AI field generator ────────────────────────────────────────────────────────

interface AiFilledPage {
  title: string;
  slug: string;
  lead: string;
  summary: string;
  whyItMatters: string;
  whatChanged: string;
  executiveImplications: string;
  metaDescription: string;
}

async function aiStructureArticle(
  article: ParsedArticle,
  apiKey: string,
  model: string,
): Promise<AiFilledPage | null> {
  const prompt = `You are an editorial writer for BytesAI Learning, an AI education platform.
Given the article content below, extract and rewrite it into 5 clearly separated editorial fields.

Article title: "${article.title}"
Source: ${article.sourceName}
Published: ${new Date(article.publishedAt).toLocaleDateString('en-GB')}

Raw article content:
${article.contentText.slice(0, 5000)}

RULES:
- Each field must be written as flowing prose — no bullet points, no asterisks, no markdown
- Write in a confident, knowledgeable editorial voice
- lead: One sentence (≤ 30 words) that creates a curiosity gap or personal stake. Front-load the surprise, the risk, or the counter-intuitive claim.
- summary: 2–3 sentences that hook the reader and explain why this news matters RIGHT NOW
- why_it_matters: 3–5 sentences on real-world significance for AI practitioners and learners
- what_changed: 3–5 sentences on the specific development, announcement, or breakthrough described
- executive_implications: 3–5 sentences of practical takeaways — what learners and organisations should do next
- meta_description: under 155 characters, SEO-friendly, factual

Respond ONLY with valid JSON — no markdown fences, no extra text:
{
  "lead": "...",
  "summary": "...",
  "why_it_matters": "...",
  "what_changed": "...",
  "executive_implications": "...",
  "meta_description": "..."
}`

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
        temperature: 0.6,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);

    const slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80);

    return {
      title: article.title,
      slug,
      lead: parsed.lead ?? '',
      summary: parsed.summary ?? '',
      whyItMatters: parsed.why_it_matters ?? '',
      whatChanged: parsed.what_changed ?? '',
      executiveImplications: parsed.executive_implications ?? '',
      metaDescription: parsed.meta_description ?? '',
    };
  } catch {
    return null;
  }
}

// Naive fallback (no AI) — distributes paragraphs proportionally
function naiveFill(article: ParsedArticle) {
  const text = article.contentText;
  const paras = text.split(/\n{2,}|\.\s{2,}/).map(p => p.trim()).filter(p => p.length >= 60);
  const fill = (s: number, e: number) => paras.slice(s, e).join('\n\n').trim();
  const n = paras.length;
  const slug = article.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);

  if (n === 0) return { title: article.title, slug, lead: text.slice(0, 120), summary: text.slice(120, 420), whyItMatters: text.slice(420, 720), whatChanged: text.slice(720, 1020), executiveImplications: text.slice(1020), metaDescription: '' };
  if (n <= 2) return { title: article.title, slug, lead: fill(0, 1).slice(0, 120), summary: fill(0, 1), whyItMatters: fill(1, 2), whatChanged: '', executiveImplications: '', metaDescription: '' };
  const p1 = Math.max(1, Math.round(n * 0.20));
  const p2 = Math.max(p1 + 1, Math.round(n * 0.50));
  const p3 = Math.max(p2 + 1, Math.round(n * 0.78));
  return { title: article.title, slug, lead: fill(0, p1).slice(0, 120), summary: fill(0, p1), whyItMatters: fill(p1, p2), whatChanged: fill(p2, p3), executiveImplications: fill(p3, n), metaDescription: '' };
}

// ── GET /api/admin/trend-engine ───────────────────────────────────────────────
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

// ── POST /api/admin/trend-engine ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: { articles: ParsedArticle[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  if (!Array.isArray(body.articles) || body.articles.length === 0) {
    return NextResponse.json({ error: 'No articles provided.' }, { status: 422 });
  }

  // Resolve AI credentials
  let apiKey = '';
  let model = 'google/gemini-flash-1.5';
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as Record<string, string>;
    apiKey = env.OPENROUTER_API_KEY ?? '';
    if (env.CHATBOT_MODEL) model = env.CHATBOT_MODEL;
  } catch { /* local dev */ }

  const now = new Date().toISOString();
  const created: string[] = [];
  const skipped: Array<{ title: string; reason: string }> = [];

  for (const article of body.articles) {
    // Compute the slug up front and check for an existing page BEFORE spending
    // an AI call on a duplicate. The UNIQUE constraint remains as a backstop.
    const preSlug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80);

    if (!preSlug) {
      skipped.push({ title: article.title, reason: 'Could not generate slug' });
      continue;
    }

    const existing = await db.prepare('SELECT 1 FROM curated_pages WHERE slug = ?').bind(preSlug).first();
    if (existing) {
      skipped.push({ title: article.title, reason: 'Page with this slug already exists' });
      continue;
    }

    // Try AI structuring first, fall back to naive split
    const aiResult = apiKey ? await aiStructureArticle(article, apiKey, model) : null;
    const usedAi = !!aiResult;
    const filled = aiResult ?? naiveFill(article);

    if (!filled.slug) {
      skipped.push({ title: article.title, reason: 'Could not generate slug' });
      continue;
    }

    const id = `cp-${nanoid(10)}`;
    const sourceRefs = [{ title: `${article.sourceName}: ${article.title}`, url: article.url }];

    try {
      await db.prepare(`
        INSERT INTO curated_pages (
          id, slug, title, lead, summary, why_it_matters, what_changed, executive_implications,
          meta_description, source_references_json,
          editorial_review_status, published_status,
          ai_generated, generated_model, generated_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'draft', ?, ?, ?, ?, ?)
      `).bind(
        id, filled.slug, filled.title,
        filled.lead || null,
        filled.summary || null,
        filled.whyItMatters || null,
        filled.whatChanged || null,
        filled.executiveImplications || null,
        filled.metaDescription || null,
        JSON.stringify(sourceRefs),
        usedAi ? 1 : 0,
        usedAi ? model : null,
        usedAi ? now : null,
        now, now,
      ).run();

      await logAdminAction(db, {
        adminUserId: session.userId,
        actionType: 'CREATE',
        entityType: 'curated_page',
        entityId: id,
        before: null,
        after: { id, slug: filled.slug, title: filled.title, source: 'trend-engine', aiStructured: usedAi },
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
