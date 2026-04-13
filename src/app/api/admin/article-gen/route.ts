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
  primary_course_rationale: string;
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

  const prompt = `You are an editorial writer and subject-matter curator for BytesAI Learning. Write an insight article about the AI topic covered by the course below. The article must read like it was written by a knowledgeable human practitioner with a real point of view — not a system summarising a topic.

${courseContext}${refSection}

QUALITY STANDARDS — apply to every sentence, no exceptions:

1. Ground every claim. Do not assert significance without support. Replace "unprecedented accuracy" or "transformational shift" with specific mechanisms or conditions from the research context. If you cannot support a claim, make it smaller or conditional.

2. Pick one concrete use-case and stay there. Do not write about "various industries." Identify the one application where this technology matters most and write through that lens. Depth beats breadth.

3. Write like an operator, not a system summarising a topic. Use plain practitioner language. Avoid polished abstraction. Sound like someone who has worked with this, not someone reading about it for the first time.

4. Add at least one limitation or failure mode. Expertise is demonstrated by knowing where something breaks. At least one section must acknowledge what this technology does not do well, where it fails, or what practitioners commonly misunderstand.

5. Make the roadmap advice operational, not strategic. Replace "organisations should prioritise integration" with specific sequencing: where to start, what decision comes first, what to avoid in phase one.

BANNED PHRASES — never use any of these:
bridge the gap, unprecedented, lead the next wave, psychologically resonant, sustainable competitive advantage, superior user experiences, empathetic machine interfaces, active participant, human-centric (unless quoting), crowded market, game-changing, transformational, cutting-edge, revolutionary, robust, holistic, ecosystem, paradigm shift, leverage (as a verb), synergy, seamlessly.

Every sentence must be specific enough that it could not apply to a different AI topic without rewriting.

SECTION INSTRUCTIONS:

summary: One direct definition of the topic plus one concrete practical implication. 60-80 words maximum. This is the TL;DR and the primary AI-retrieval chunk. State what this technology is and what it actually changes in practice. No fluff, no significance inflation.

why_it_matters: One grounded use-case where this technology changes what a system does or what a practitioner decides. Name the specific context — call centre escalation, adaptive tutoring, patient monitoring, etc. Explain the specific mechanism that makes it useful there. End with one honest note on where it is not yet reliable or where the limits are. 3-5 sentences.

what_changed: Explain how this technology works at a mechanism level — what signals it uses, how it processes them, what it infers. Then explain what has shifted recently: architecture changes, data approaches, deployment patterns, or research breakthroughs. One honest limitation on current state. 3-5 sentences.

executive_implications: Practical sequencing for a decision-maker — not strategy, execution. Answer: where should this be tried first, what does the team need to decide before deploying it, what are the consent or governance questions that come first, what does operational success look like in the first six months. No "competitive advantage" language. 3-5 sentences.

primary_course_rationale: A short curated recommendation paragraph (3-5 sentences) that explains the course to the reader. Answer: who this course is for, what they will understand after completing it, what it does not cover (be honest about the limitation), and why this is the right starting point given this article topic. Do not describe the course like a product listing. Sound editorial. Add one explicit honest limitation, for example "this course covers foundational concepts and will not give you implementation depth."

meta_description: SEO meta description under 155 characters.

Respond ONLY with a valid JSON object — no markdown fences, no extra text:
{
  "title": "A specific, clear article headline under 85 characters — not just the course name, not a generic AI headline",
  "summary": "60-80 word TL;DR: one direct definition + one concrete practical implication",
  "why_it_matters": "3-5 sentences: one specific use-case, the mechanism, one honest limitation",
  "what_changed": "3-5 sentences: how it works + recent developments + one honest current limitation",
  "executive_implications": "3-5 sentences: operational sequencing, first decisions, governance, what success looks like",
  "primary_course_rationale": "3-5 sentences: who this is for, what they will learn, what it does not cover, why this is the right entry point",
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
        max_tokens: 1800,
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
        primary_course_rationale, primary_course_slug, source_references_json, meta_description,
        editorial_review_status, published_status,
        ai_generated, generated_model, generated_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).bind(
      id,
      slug,
      generated.title,
      generated.summary,
      generated.why_it_matters,
      generated.what_changed,
      generated.executive_implications,
      generated.primary_course_rationale,
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
