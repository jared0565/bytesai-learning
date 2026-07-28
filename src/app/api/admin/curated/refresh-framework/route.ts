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
  lead: string;
  summary: string;
  why_it_matters: string;
  what_changed: string;
  executive_implications: string;
  meta_description: string;
}

type AiRestructureResult =
  | { ok: true; page: RestructuredPage }
  | { ok: false; error: string };

function hasRequiredFields(obj: unknown): obj is RestructuredPage {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  const keys = ['lead', 'summary', 'why_it_matters', 'what_changed', 'executive_implications', 'meta_description'];
  return keys.every(k => typeof p[k] === 'string' && (p[k] as string).trim().length > 0);
}

function providerErrorMessage(status: number): string {
  if (status === 402) return 'OpenRouter has insufficient credits. Add credits, then run Apply framework again.';
  if (status === 401 || status === 403) return 'OpenRouter rejected the configured API key or permissions.';
  if (status === 429) return 'OpenRouter rate limit reached. Wait and run Apply framework again.';
  if (status >= 500) return 'OpenRouter is temporarily unavailable. Try again later.';
  return `OpenRouter request failed with HTTP ${status}.`;
}

async function aiRestructure(
  title: string,
  rawContent: string,
  apiKey: string,
  model: string,
): Promise<AiRestructureResult> {
  const prompt = `You are an editorial writer for BytesAI Learning, an AI education platform.
Given the article content below, rewrite it into the Executive Briefing Standard for a curated insight page.

Article title: "${title.replace(/"/g, '\\"')}"

Content to restructure:
${rawContent.slice(0, 5500)}

RULES:
- Write as flowing, authoritative editorial prose
- Do not start sentences with "I" or refer to "the article"
- Operator voice, not consultant framing. No buzzwords.
- lead: One sentence (≤ 30 words) that creates a curiosity gap or personal stake. Front-load the surprise, the risk, or the counter-intuitive claim already present in the source content.
- summary: Start with 3–5 Markdown bullet lines (each starting with "- "). Every bullet must be one sentence; at least two bullets must contain a specific number, benchmark size, or named entity already present in the source content. Follow the bullets with ONE short framing sentence (≤25 words). This is the executive TL;DR.
- why_it_matters: 3–5 sentences. Frame both risk and opportunity: what bad thing happens if ignored, and what becomes possible if acted on. Include one specific use-case and one honest limitation.
- what_changed: 3–5 sentences. Quantify the development: exact figures, benchmark size, authors/institution already in the source content. Explain how it works + what specifically changed + one current limitation. Use a Markdown table if comparing methods.
- executive_implications: A time-boxed action playbook using these exact Markdown headings: "**This week**", "**This quarter**", "**This year**". Under each heading provide 2–3 specific bullet actions.
- meta_description: a single sentence under 155 characters optimised for search — factual and keyword-rich

BANNED PHRASES: force multiplier, unprecedented, game-changing, transformational, cutting-edge, revolutionary, robust, holistic, paradigm shift, leverage (as verb), synergy, seamlessly, bridge the gap, digital transformation, unlock value, significant, substantial

Respond ONLY with valid JSON — no markdown fences, no explanation, no preamble:
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
        temperature: 0.55,
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { ok: false, error: providerErrorMessage(res.status) };
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: 'OpenRouter returned a response without a JSON object.' };
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[0]) as unknown;
    } catch {
      return { ok: false, error: 'OpenRouter returned invalid JSON.' };
    }
    if (!hasRequiredFields(parsed)) {
      return { ok: false, error: 'OpenRouter response was missing required article fields.' };
    }
    return { ok: true, page: parsed as RestructuredPage };
  } catch (e: unknown) {
    const name = (e as { name?: string }).name;
    if (name === 'TimeoutError' || name === 'AbortError') {
      return { ok: false, error: 'OpenRouter request timed out. Try again later.' };
    }
    return { ok: false, error: 'OpenRouter request failed before a response was received.' };
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

    // Defensive: some D1 environments do not support json_extract reliably.
    // Fetch a sample and parse in JS to count refreshable articles.
    let refreshable = result?.total ?? 0;
    try {
      const sample = await db.prepare(
        `SELECT source_references_json FROM curated_pages WHERE published_status = 'published'`
      ).all<{ source_references_json: string | null }>();
      refreshable = sample.results.filter(r => {
        if (!r.source_references_json) return false;
        try {
          const refs = JSON.parse(r.source_references_json) as Array<{ url?: string }>;
          return Array.isArray(refs) && typeof refs[0]?.url === 'string' && refs[0].url.length > 0;
        } catch {
          return false;
        }
      }).length;
    } catch {
      /* fall back to total published count */
    }

    return NextResponse.json({
      published: result?.total ?? 0,
      refreshable,
      note: 'Framework refresh rewrites content fields for all published articles using their primary source.',
    });
  } catch (e: unknown) {
    const message = (e as { message?: string }).message ?? 'Unknown error';
    console.error('refresh-framework GET error:', message);
    return NextResponse.json({ error: 'Failed to check pages.', detail: message }, { status: 500 });
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

  let body: { ids?: string[]; runStartTimestamp?: string } = {};
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

  // Stable run timestamp: passed from frontend so every batch in the same run
  // uses the same cutoff. Articles refreshed in this run get updated_at >= runStartTimestamp.
  const runStartTimestamp = body.runStartTimestamp ?? new Date().toISOString();

  // Fetch pages to refresh — up to 3 per call to stay within Worker limits
  type PageRow = {
    id: string;
    title: string;
    summary: string | null;
    source_references_json: string | null;
    categories_json: string | null;
  };

  let pages: PageRow[];

  try {
    if (body.ids?.length) {
      const placeholders = body.ids.map(() => '?').join(',');
      const result = await db.prepare(
        `SELECT id, title, summary, source_references_json, categories_json
         FROM curated_pages
         WHERE id IN (${placeholders})`
      ).bind(...body.ids).all<PageRow>();
      pages = result.results;
    } else {
      const result = await db.prepare(
        `SELECT id, title, summary, source_references_json, categories_json
         FROM curated_pages
         WHERE published_status = 'published' AND updated_at < ?
         ORDER BY updated_at ASC
         LIMIT 3`
      ).bind(runStartTimestamp).all<PageRow>();
      pages = result.results;
    }
  } catch (e: unknown) {
    const message = (e as { message?: string }).message ?? 'Unknown error';
    console.error('refresh-framework POST fetch error:', message);
    return NextResponse.json({ error: 'Failed to fetch pages.', detail: message }, { status: 500 });
  }

  if (pages.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, remaining: 0 });
  }

  const now = new Date().toISOString();
  const results: Array<{ id: string; title: string; ok: boolean; error?: string }> = [];

  for (const page of pages) {
    let rawContent = page.summary ?? '';
    let sourceUrl: string | null = null;

    if (page.source_references_json) {
      try {
        const refs = JSON.parse(page.source_references_json) as Array<{ url?: string }>;
        sourceUrl = Array.isArray(refs) ? (refs[0]?.url ?? null) : null;
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

    const structuredResult = await aiRestructure(page.title, rawContent, apiKey, model);
    if (!structuredResult.ok) {
      results.push({ id: page.id, title: page.title, ok: false, error: structuredResult.error });
      continue;
    }
    const structured = structuredResult.page;

    let categoriesJson = page.categories_json;
    if (!categoriesJson) {
      try {
        const cats = await classifyArticle(
          page.title,
          structured.summary,
          structured.why_it_matters,
          apiKey,
          model,
        );
        if (cats.length > 0) categoriesJson = JSON.stringify(cats);
      } catch {
        /* keep existing categories */
      }
    }

    try {
      await db.prepare(`
        UPDATE curated_pages SET
          lead = ?,
          summary = ?,
          why_it_matters = ?,
          what_changed = ?,
          executive_implications = ?,
          meta_description = ?,
          categories_json = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        structured.lead || null,
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
        after: { frameworkRefresh: true, aiModel: model, sourceUrl },
      });

      results.push({ id: page.id, title: page.title, ok: true });
    } catch (e: unknown) {
      const message = (e as { message?: string }).message ?? 'Unknown error';
      console.error(`refresh-framework POST update error for ${page.id}:`, message);
      results.push({ id: page.id, title: page.title, ok: false, error: `DB update failed: ${message}` });
    }
  }

  // Remaining published articles not yet refreshed by this run.
  // All articles refreshed in this run have updated_at >= runStartTimestamp.
  let remaining = 0;
  try {
    const remainingResult = await db.prepare(
      `SELECT COUNT(*) as count FROM curated_pages WHERE published_status = 'published' AND updated_at < ?`
    ).bind(runStartTimestamp).first<{ count: number }>();
    remaining = remainingResult?.count ?? 0;
  } catch (e: unknown) {
    const message = (e as { message?: string }).message ?? 'Unknown error';
    console.error('refresh-framework POST remaining count error:', message);
  }

  return NextResponse.json({
    ok: true,
    processed: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    remaining,
    ids: results.filter(r => r.ok).map(r => r.id),
    results,
  });
}
