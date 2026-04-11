import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getDB, logAdminAction } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getCloudflareContext } from '@opennextjs/cloudflare';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// ── Web search via DuckDuckGo HTML ────────────────────────────────────────────

async function searchDDG(query: string): Promise<string[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BytesAIBot/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const urls: string[] = [];
    const re = /href="\/l\/\?uddg=([^&"]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      try {
        const decoded = decodeURIComponent(m[1]);
        if (decoded.startsWith('http') && !decoded.includes('duckduckgo.com')) {
          urls.push(decoded);
        }
      } catch { /* skip */ }
    }
    return [...new Set(urls)].slice(0, 6);
  } catch {
    return [];
  }
}

// ── Minimal article text extractor ───────────────────────────────────────────

async function fetchSnippet(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,*/*',
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    const text = html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return text.slice(0, 2000);
  } catch {
    return '';
  }
}

// ── OpenRouter article generation ────────────────────────────────────────────

interface GeneratedArticle {
  title: string;
  summary: string;
  why_it_matters: string;
  what_changed: string;
  executive_implications: string;
  meta_description: string;
}

async function generateArticle(
  course: { title: string; slug: string; snippet: string | null; category: string | null },
  referenceContent: string,
  apiKey: string,
  model: string,
): Promise<GeneratedArticle | null> {
  const courseContext = `Course title: "${course.title}"
Category: ${course.category ?? 'Artificial Intelligence'}
Course description: ${course.snippet ?? 'A free AI course covering the fundamentals and practical applications'}
Course page: https://learn.bytesai.uk/courses/${course.slug}`;

  const refSection = referenceContent.length > 100
    ? `\n\nResearch context gathered from the web (use as background knowledge — do NOT copy verbatim):\n${referenceContent.slice(0, 4500)}`
    : '';

  const prompt = `You are an editorial writer for BytesAI Learning, an AI education platform. Write an insightful, well-structured article about the AI topic covered by the course below. The article is for professionals and learners who want to stay on top of AI developments.

${courseContext}${refSection}

WRITING RULES:
- Write about the TOPIC, not a review of the course
- Mention the free course naturally within the text — treat it as a helpful resource the reader can use, not an ad
- Write in clear, authoritative prose — no bullet points or markdown symbols (no asterisks, dashes as lists, etc.)
- Each section must be 3 to 5 full, substantial sentences
- Sound like a knowledgeable human author, not a chatbot summary
- Use the course mention in the "why_it_matters" section: e.g. "For professionals looking to build practical skills in [topic], Alison's free course [title] provides a structured, self-paced introduction..."

Respond ONLY with a valid JSON object — no markdown fences, no extra text. Use exactly this structure:
{
  "title": "An engaging article headline (under 85 chars) about the AI topic — not just the course name",
  "summary": "2-3 sentence intro paragraph that hooks the reader on why this AI topic is important right now",
  "why_it_matters": "3-5 sentences on the real-world significance of this topic for learners and professionals. Naturally embed a mention of the free course here as a resource",
  "what_changed": "3-5 sentences on the current state and recent developments in this AI field — what is evolving, what is new, and how practitioners should take note",
  "executive_implications": "3-5 sentences of practical takeaways — what learners and organisations should do next and how this knowledge translates into competitive advantage",
  "meta_description": "SEO meta description under 155 characters"
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
        temperature: 0.72,
        max_tokens: 1400,
      }),
      signal: AbortSignal.timeout(35_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as GeneratedArticle;
  } catch {
    return null;
  }
}

// ── GET /api/admin/article-gen ────────────────────────────────────────────────
// Returns current auto-gen settings and last run time

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const rows = await db.prepare(
      "SELECT key, value FROM site_settings WHERE key IN ('article_gen_mode','article_gen_frequency','article_gen_last_run','article_gen_auto_approve')"
    ).all<{ key: string; value: string }>();
    const map: Record<string, string> = {};
    for (const r of rows.results) map[r.key] = r.value;
    return NextResponse.json({
      mode: map['article_gen_mode'] ?? 'manual',
      frequency: map['article_gen_frequency'] ?? 'daily',
      lastRun: map['article_gen_last_run'] ?? null,
      autoApprove: map['article_gen_auto_approve'] === 'true',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load settings.' }, { status: 500 });
  }
}

// ── POST /api/admin/article-gen ───────────────────────────────────────────────
// Generates one article from a randomly selected Alison course

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: { courseSlug?: string } = {};
  try { body = await req.json(); } catch { /* body is optional */ }

  // Resolve API key + model from Cloudflare env
  let apiKey = '';
  let model = 'google/gemini-flash-1.5';
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as Record<string, string>;
    apiKey = env.OPENROUTER_API_KEY ?? '';
    if (env.CHATBOT_MODEL) model = env.CHATBOT_MODEL;
  } catch { /* local dev fallback */ }

  if (!apiKey) {
    return NextResponse.json({ error: 'OpenRouter API key not configured. Add OPENROUTER_API_KEY as a Worker secret.' }, { status: 503 });
  }

  // ── Resolve course ──────────────────────────────────────────────────────────
  type CourseRow = { title: string; slug: string; snippet: string | null; category: string | null; affiliate_url: string | null };

  let course: CourseRow | null = null;

  if (body.courseSlug) {
    course = await db.prepare(
      'SELECT title, slug, snippet, category, affiliate_url FROM courses WHERE slug = ? AND is_alison = 1 LIMIT 1'
    ).bind(body.courseSlug).first<CourseRow>() ?? null;
  }

  if (!course) {
    // Random published Alison course
    course = await db.prepare(
      "SELECT title, slug, snippet, category, affiliate_url FROM courses WHERE is_alison = 1 ORDER BY RANDOM() LIMIT 1"
    ).first<CourseRow>() ?? null;
  }

  if (!course) {
    return NextResponse.json({ error: 'No Alison courses found in the database.' }, { status: 404 });
  }

  // ── Read auto-approve setting ───────────────────────────────────────────────
  const autoApproveSetting = await db.prepare(
    "SELECT value FROM site_settings WHERE key = 'article_gen_auto_approve'"
  ).first<{ value: string }>();
  const autoApprove = autoApproveSetting?.value === 'true';

  // ── Web search for reference content ───────────────────────────────────────
  const query = `${course.title} artificial intelligence`;
  const articleUrls = await searchDDG(query);

  let referenceContent = '';
  for (const url of articleUrls.slice(0, 3)) {
    const snippet = await fetchSnippet(url);
    if (snippet.length > 200) {
      referenceContent += `\n\n--- Source: ${url} ---\n${snippet}`;
      if (referenceContent.length > 5000) break;
    }
  }

  // ── Generate article via OpenRouter ────────────────────────────────────────
  const generated = await generateArticle(course, referenceContent, apiKey, model);
  if (!generated) {
    return NextResponse.json({ error: 'Article generation failed. The AI model may be unavailable — please try again.' }, { status: 500 });
  }

  // ── Slug from generated title ───────────────────────────────────────────────
  const slug = generated.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);

  if (!slug) {
    return NextResponse.json({ error: 'Could not generate a URL slug from the article title.' }, { status: 500 });
  }

  const id = `cp-${nanoid(10)}`;
  const now = new Date().toISOString();

  // Build source references from searched URLs
  const sourceRefs = articleUrls.slice(0, 4).map(url => {
    const path = url.replace(/^https?:\/\//, '').split('/').slice(1).join('/');
    const label = path ? path.replace(/-/g, ' ').replace(/\//g, ' › ').slice(0, 80) : url;
    return { title: label, url };
  });

  // ── Insert into curated_pages ───────────────────────────────────────────────
  const editorialStatus = autoApprove ? 'approved' : 'draft';
  const publishedStatus = autoApprove ? 'published' : 'draft';

  try {
    await db.prepare(`
      INSERT INTO curated_pages (
        id, slug, title, summary, why_it_matters, what_changed, executive_implications,
        primary_course_slug, source_references_json, meta_description,
        editorial_review_status, published_status,
        ai_generated, generated_model, generated_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).bind(
      id,
      slug,
      generated.title,
      generated.summary,
      generated.why_it_matters,
      generated.what_changed,
      generated.executive_implications,
      course.slug,
      JSON.stringify(sourceRefs),
      generated.meta_description,
      editorialStatus,
      publishedStatus,
      model,
      now,
      now,
      now,
    ).run();

    // Update last run timestamp
    await db.prepare(
      "INSERT INTO site_settings (key, value, updated_at) VALUES ('article_gen_last_run', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    ).bind(now, now).run();

    await logAdminAction(db, {
      adminUserId: session.userId,
      actionType: 'CREATE',
      entityType: 'curated_page',
      entityId: id,
      before: null,
      after: { id, slug, title: generated.title, source: 'article-gen', courseSlug: course.slug },
    });

    return NextResponse.json({
      ok: true,
      id,
      slug,
      title: generated.title,
      courseSlug: course.slug,
      courseTitle: course.title,
      published: autoApprove,
    });
  } catch (e: unknown) {
    const msg = (e as { message?: string }).message ?? '';
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({
        error: 'An article with this slug already exists. Generate again to get a different article.',
      }, { status: 409 });
    }
    return NextResponse.json({ error: 'Database error saving article.' }, { status: 500 });
  }
}
