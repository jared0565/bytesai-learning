import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyBearerToken, COOKIE_NAME } from '@/lib/auth';
import { getDB, logAdminAction } from '@/lib/db';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { classifyArticle } from '@/lib/classify-article';

async function requireAdmin(req: NextRequest) {
  // Accept Bearer token (CLI/automation) or session cookie (browser)
  const bearer = await verifyBearerToken(req.headers.get('authorization'));
  if (bearer) return bearer;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// ── Fetch original article text from source URL ───────────────────────────────

async function fetchSourceText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,*/*',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return '';
    const html = await res.text();

    const candidates = [
      html.match(/class="[^"]*(?:c-entry-content|article__body|entry-content__body)[^"]*"[^>]*>([\s\S]+?)<\/(?:div|section)>/i)?.[1],
      html.match(/class="[^"]*(?:post-content|article-content|gh-content|entry-content)[^"]*"[^>]*>([\s\S]+?)<\/(?:div|section|article)>/i)?.[1],
      html.match(/class="[^"]*(?:article-body|story-body|article__content)[^"]*"[^>]*>([\s\S]+?)<\/(?:div|section)>/i)?.[1],
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1],
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1],
    ];

    for (const raw of candidates) {
      if (!raw) continue;
      const text = raw
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<aside[\s\S]*?<\/aside>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
        .replace(/\s{2,}/g, ' ').trim();
      if (text.length >= 300) return text.slice(0, 6000);
    }
    return '';
  } catch {
    return '';
  }
}

// ── AI re-structuring to Executive Briefing Standard ──────────────────────────

interface RestructuredPage {
  summary: string;
  why_it_matters: string;
  what_changed: string;
  executive_implications: string;
  meta_description: string;
}

async function aiRestructure(
  title: string,
  rawContent: string,
  apiKey: string,
  model: string,
): Promise<RestructuredPage | null> {
  const prompt = `You are an editorial writer for BytesAI Learning, an AI education platform.
Given the article content below, rewrite it into the Executive Briefing Standard for a curated insight page.

Article title: "${title}"

Content to restructure:
${rawContent.slice(0, 5500)}

RULES:
- Write as flowing, authoritative editorial prose
- Do not start sentences with "I" or refer to "the article"
- Operator voice, not consultant framing. No buzzwords.
- summary: Start with 3–5 Markdown bullet lines (each starting with "- "). Every bullet must be one sentence; at least two bullets must contain a specific number, benchmark size, or named entity already present in the source content. Follow the bullets with ONE short framing sentence (≤25 words). This is the executive TL;DR.
- why_it_matters: 3–5 sentences. Frame both risk and opportunity: what bad thing happens if ignored, and what becomes possible if acted on. Include one specific use-case and one honest limitation.
- what_changed: 3–5 sentences. Quantify the development: exact figures, benchmark size, authors/institution already in the source content. Explain how it works + what specifically changed + one current limitation. Use a Markdown table if comparing methods.
- executive_implications: A time-boxed action playbook using these exact Markdown headings: "**This week**", "**This quarter**", "**This year**". Under each heading provide 2–3 specific bullet actions.
- meta_description: a single sentence under 155 characters optimised for search — factual and keyword-rich

BANNED PHRASES: force multiplier, unprecedented, game-changing, transformational, cutting-edge, revolutionary, robust, holistic, paradigm shift, leverage (as verb), synergy, seamlessly, bridge the gap, digital transformation, unlock value, significant, substantial

Respond ONLY with valid JSON — no markdown fences, no explanation, no preamble:
{
  "summary": "...",
  "why_it_matters": "...",
  "what_changed": "...",
  "executive_implications": "...",
  "meta_description": "..."
}`;

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
        temperature: 0.55,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as RestructuredPage;
  } catch {
    return null;
  }
}

// ── GET /api/admin/curated/refresh-framework ─────────────────────────────────
// Returns stats: total published articles eligible for framework refresh

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const result = await db.prepare(
      `SELECT COUNT(*) as total FROM curated_pages WHERE published_status = 'published'`
    ).first<{ total: number }>();

    const withSources = await db.prepare(
      `SELECT COUNT(*) as total FROM curated_pages
       WHERE published_status = 'published'
         AND source_references_json IS NOT NULL
         AND json_extract(source_references_json, '$[0].url') IS NOT NULL`
    ).first<{ total: number }>();

    return NextResponse.json({
      published: result?.total ?? 0,
      refreshable: withSources?.total ?? 0,
      note: 'Framework refresh rewrites content fields for all published articles using their primary source.',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to check pages.' }, { status: 500 });
  }
}

// ── POST /api/admin/curated/refresh-framework ─────────────────────────────────
// Body: { ids?: string[] }  — omit ids to refresh ALL published articles
// Processes up to 3 articles per request to avoid Worker CPU timeout; client polls repeatedly

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: { ids?: string[] } = {};
  try { body = await req.json(); } catch { /* no body = refresh all published */ }

  // Resolve AI credentials
  let apiKey = '';
  let model = 'google/gemini-flash-1.5';
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as Record<string, string>;
    apiKey = env.OPENROUTER_API_KEY ?? '';
    if (env.CHATBOT_MODEL) model = env.CHATBOT_MODEL;
  } catch { /* local dev */ }

  if (!apiKey) {
    return NextResponse.json({ error: 'OpenRouter API key not configured.' }, { status: 503 });
  }

  // Fetch pages to refresh — up to 3 per call to stay within Worker limits
  type PageRow = {
    id: string;
    title: string;
    summary: string | null;
    source_references_json: string | null;
    categories_json: string | null;
  };

  let pages: PageRow[];

  if (body.ids?.length) {
    const placeholders = body.ids.map(() => '?').join(',');
    const result = await db.prepare(
      `SELECT id, title, summary, source_references_json, categories_json
       FROM curated_pages
       WHERE id IN (${placeholders}) AND published_status = 'published'`
    ).bind(...body.ids).all<PageRow>();
    pages = result.results;
  } else {
    const result = await db.prepare(
      `SELECT id, title, summary, source_references_json, categories_json
       FROM curated_pages
       WHERE published_status = 'published'
       ORDER BY updated_at ASC
       LIMIT 3`
    ).all<PageRow>();
    pages = result.results;
  }

  if (pages.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, remaining: 0 });
  }

  const now = new Date().toISOString();
  const results: Array<{ id: string; title: string; ok: boolean; error?: string }> = [];

  for (const page of pages) {
    let rawContent = page.summary ?? '';

    if (page.source_references_json) {
      try {
        const refs: Array<{ url: string }> = JSON.parse(page.source_references_json);
        const sourceUrl = refs[0]?.url;
        if (sourceUrl) {
          const fetched = await fetchSourceText(sourceUrl);
          if (fetched.length > 200) rawContent = fetched;
        }
      } catch { /* use summary fallback */ }
    }

    if (!rawContent || rawContent.length < 100) {
      results.push({ id: page.id, title: page.title, ok: false, error: 'No source content available' });
      continue;
    }

    const structured = await aiRestructure(page.title, rawContent, apiKey, model);
    if (!structured) {
      results.push({ id: page.id, title: page.title, ok: false, error: 'AI restructure failed' });
      continue;
    }

    let categoriesJson = page.categories_json;
    if (!categoriesJson) {
      const cats = await classifyArticle(
        page.title,
        structured.summary,
        structured.why_it_matters,
        apiKey,
        model,
      );
      if (cats.length > 0) categoriesJson = JSON.stringify(cats);
    }

    try {
      await db.prepare(`
        UPDATE curated_pages SET
          summary = ?,
          why_it_matters = ?,
          what_changed = ?,
          executive_implications = ?,
          meta_description = ?,
          categories_json = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        structured.summary || page.summary || null,
        structured.why_it_matters || null,
        structured.what_changed || null,
        structured.executive_implications || null,
        structured.meta_description || null,
        categoriesJson,
        now,
        page.id,
      ).run();

      await logAdminAction(db, {
        adminUserId: session.userId,
        actionType: 'UPDATE',
        entityType: 'curated_page',
        entityId: page.id,
        before: null,
        after: { frameworkRefresh: true, aiModel: model },
      });

      results.push({ id: page.id, title: page.title, ok: true });
    } catch {
      results.push({ id: page.id, title: page.title, ok: false, error: 'DB update failed' });
    }
  }

  // Remaining published articles not yet refreshed by updated_at
  const remaining = await db.prepare(
    `SELECT COUNT(*) as count FROM curated_pages WHERE published_status = 'published' AND updated_at < ?`
  ).bind(now).first<{ count: number }>();

  return NextResponse.json({
    ok: true,
    processed: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    remaining: remaining?.count ?? 0,
    results,
  });
}
