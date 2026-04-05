import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB, logAdminAction } from '@/lib/db';
import { getCloudflareContext } from '@opennextjs/cloudflare';

async function requireAdmin(req: NextRequest) {
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

    // Try content body selectors in priority order
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

// ── AI re-structuring ─────────────────────────────────────────────────────────

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
Given the article content below, rewrite it into 5 structured editorial fields for a curated insight page.

Article title: "${title}"

Content to restructure:
${rawContent.slice(0, 5500)}

RULES:
- Write as flowing, authoritative editorial prose — no bullet points, no asterisks, no markdown symbols
- Do not start sentences with "I" or refer to "the article"
- summary: 2–3 sentences that immediately communicate what happened and why it matters NOW
- why_it_matters: 3–5 sentences on real-world significance for AI practitioners, businesses, and learners
- what_changed: 3–5 sentences describing the specific development, release, or announcement in concrete detail
- executive_implications: 3–5 sentences of actionable takeaways — what people should learn, watch, or do in response
- meta_description: a single sentence under 155 characters optimised for search — factual and keyword-rich

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

// ── GET /api/admin/curated/regenerate ─────────────────────────────────────────
// Returns stats: how many pages have empty fields

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const all = await db.prepare(
      `SELECT id, title, why_it_matters, what_changed, executive_implications, meta_description
       FROM curated_pages ORDER BY created_at DESC`
    ).all<{
      id: string;
      title: string;
      why_it_matters: string | null;
      what_changed: string | null;
      executive_implications: string | null;
      meta_description: string | null;
    }>();

    const total = all.results.length;
    const needsRegen = all.results.filter(p =>
      !p.why_it_matters || !p.what_changed || !p.executive_implications || !p.meta_description
    ).length;

    return NextResponse.json({ total, needsRegen });
  } catch {
    return NextResponse.json({ error: 'Failed to check pages.' }, { status: 500 });
  }
}

// ── POST /api/admin/curated/regenerate ────────────────────────────────────────
// Body: { ids?: string[] }  — omit ids to regenerate ALL pages with missing fields
// Processes one page per request to avoid Worker CPU timeout; client polls repeatedly

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: { ids?: string[]; all?: boolean } = {};
  try { body = await req.json(); } catch { /* no body = regenerate all */ }

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

  // Fetch pages to regenerate — up to 5 per call to stay within Worker limits
  type PageRow = {
    id: string;
    title: string;
    summary: string | null;
    why_it_matters: string | null;
    what_changed: string | null;
    executive_implications: string | null;
    meta_description: string | null;
    source_references_json: string | null;
  };

  let pages: PageRow[];

  if (body.ids?.length) {
    const placeholders = body.ids.map(() => '?').join(',');
    const result = await db.prepare(
      `SELECT id, title, summary, why_it_matters, what_changed, executive_implications,
              meta_description, source_references_json
       FROM curated_pages WHERE id IN (${placeholders})`
    ).bind(...body.ids).all<PageRow>();
    pages = result.results;
  } else {
    // Auto-pick next batch with missing fields
    const result = await db.prepare(
      `SELECT id, title, summary, why_it_matters, what_changed, executive_implications,
              meta_description, source_references_json
       FROM curated_pages
       WHERE why_it_matters IS NULL OR what_changed IS NULL
          OR executive_implications IS NULL OR meta_description IS NULL
       ORDER BY created_at DESC
       LIMIT 5`
    ).all<PageRow>();
    pages = result.results;
  }

  if (pages.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, remaining: 0 });
  }

  const now = new Date().toISOString();
  const results: Array<{ id: string; title: string; ok: boolean; error?: string }> = [];

  for (const page of pages) {
    // Get raw content: try to re-fetch from source URL, fall back to existing summary
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
      results.push({ id: page.id, title: page.title, ok: false, error: 'AI structuring failed' });
      continue;
    }

    try {
      await db.prepare(`
        UPDATE curated_pages SET
          summary = ?,
          why_it_matters = ?,
          what_changed = ?,
          executive_implications = ?,
          meta_description = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        structured.summary || page.summary || null,
        structured.why_it_matters || null,
        structured.what_changed || null,
        structured.executive_implications || null,
        structured.meta_description || null,
        now,
        page.id,
      ).run();

      await logAdminAction(db, {
        adminUserId: session.userId,
        actionType: 'UPDATE',
        entityType: 'curated_page',
        entityId: page.id,
        before: null,
        after: { regenerated: true, aiModel: model },
      });

      results.push({ id: page.id, title: page.title, ok: true });
    } catch {
      results.push({ id: page.id, title: page.title, ok: false, error: 'DB update failed' });
    }
  }

  // Check how many still need regeneration
  const remaining = await db.prepare(
    `SELECT COUNT(*) as count FROM curated_pages
     WHERE why_it_matters IS NULL OR what_changed IS NULL
        OR executive_implications IS NULL OR meta_description IS NULL`
  ).first<{ count: number }>();

  return NextResponse.json({
    ok: true,
    processed: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    remaining: remaining?.count ?? 0,
    results,
  });
}
