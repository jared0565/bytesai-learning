import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { getCloudflareContext } from '@opennextjs/cloudflare';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

async function generateRationale(
  article: { title: string; why_it_matters: string | null; what_changed: string | null },
  course: { title: string; slug: string; snippet: string | null; category: string | null },
  apiKey: string,
  model: string,
): Promise<string | null> {
  const prompt = `You are an editorial curator for BytesAI Learning. Write a short curator recommendation paragraph for this course in the context of the insight article below.

Insight article: "${article.title}"
${article.why_it_matters ? `Article context: ${article.why_it_matters.slice(0, 400)}` : ''}

Course title: "${course.title}"
Category: ${course.category ?? 'Artificial Intelligence'}
Course description: ${course.snippet ?? 'An AI course covering fundamentals and practical applications'}
Course page: https://learn.bytesai.uk/courses/${course.slug}

Write 3-5 sentences that answer:
1. Who this course is for
2. What they will understand after completing it
3. What it does NOT cover (one honest limitation)
4. Why it is the right starting point given this article's topic

Sound editorial, not promotional. Do not describe it like a product listing. Do not use phrases like "cutting-edge", "comprehensive", "robust", "game-changing", "transformational".

Respond with ONLY the paragraph text — no quotes, no JSON, no markdown, no preamble.`;

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
        temperature: 0.65,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = (data.choices?.[0]?.message?.content ?? '').trim();
    return raw.replace(/^["'`]+|["'`]+$/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim() || null;
  } catch {
    return null;
  }
}

// ── GET: how many articles are missing a rationale ────────────────────────────

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const missing = await db.prepare(
      `SELECT COUNT(*) as count FROM curated_pages
       WHERE primary_course_slug IS NOT NULL AND primary_course_rationale IS NULL`
    ).first<{ count: number }>();
    return NextResponse.json({ missing: missing?.count ?? 0 });
  } catch {
    return NextResponse.json({ error: 'Failed to check.' }, { status: 500 });
  }
}

// ── POST: generate rationale for next batch of 5 ─────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let apiKey = '';
  let model = 'google/gemini-flash-1.5';
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as Record<string, string>;
    apiKey = env.OPENROUTER_API_KEY ?? '';
    if (env.CHATBOT_MODEL) model = env.CHATBOT_MODEL;
  } catch { /* local dev */ }

  if (!apiKey) return NextResponse.json({ error: 'OpenRouter API key not configured.' }, { status: 503 });

  type PageRow = {
    id: string;
    title: string;
    why_it_matters: string | null;
    what_changed: string | null;
    primary_course_slug: string;
  };

  const result = await db.prepare(
    `SELECT id, title, why_it_matters, what_changed, primary_course_slug
     FROM curated_pages
     WHERE primary_course_slug IS NOT NULL AND primary_course_rationale IS NULL
     ORDER BY created_at DESC LIMIT 5`
  ).all<PageRow>();

  const pages = result.results;
  if (pages.length === 0) return NextResponse.json({ ok: true, processed: 0, remaining: 0 });

  const now = new Date().toISOString();
  const results: Array<{ id: string; title: string; ok: boolean; error?: string }> = [];

  for (const page of pages) {
    const course = await db.prepare(
      `SELECT title, slug, snippet, category FROM courses WHERE slug = ? LIMIT 1`
    ).bind(page.primary_course_slug).first<{ title: string; slug: string; snippet: string | null; category: string | null }>();

    if (!course) {
      results.push({ id: page.id, title: page.title, ok: false, error: 'Course not found' });
      continue;
    }

    const rationale = await generateRationale(page, course, apiKey, model);
    if (!rationale) {
      results.push({ id: page.id, title: page.title, ok: false, error: 'AI generation failed' });
      continue;
    }

    try {
      await db.prepare(
        `UPDATE curated_pages SET primary_course_rationale = ?, updated_at = ? WHERE id = ?`
      ).bind(rationale, now, page.id).run();
      results.push({ id: page.id, title: page.title, ok: true });
    } catch {
      results.push({ id: page.id, title: page.title, ok: false, error: 'DB update failed' });
    }
  }

  const remaining = await db.prepare(
    `SELECT COUNT(*) as count FROM curated_pages
     WHERE primary_course_slug IS NOT NULL AND primary_course_rationale IS NULL`
  ).first<{ count: number }>();

  return NextResponse.json({
    ok: true,
    processed: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    remaining: remaining?.count ?? 0,
    results,
  });
}
