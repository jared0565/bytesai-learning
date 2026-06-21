import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyBearerToken, COOKIE_NAME } from '@/lib/auth';
import { getDB, logAdminAction } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { fetchTrendingArticles, type ParsedArticle } from '@/lib/rss-parser';
import { RSS_SOURCES } from '@/lib/rss-sources';
import {
  scrapeAlisonSearch,
  scrapeAlisonDetail,
  ALISON_PROVIDER_ID,
} from '@/lib/alison';
import { sanitizeText, isValidSlug } from '@/lib/security';

async function requireAdmin(req: NextRequest) {
  // Accept session cookie (browser) or Bearer token (CLI/automation)
  const bearer = await verifyBearerToken(req.headers.get('authorization'));
  if (bearer) return bearer;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// ── Slug helper ───────────────────────────────────────────────────────────────

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// ── Alison search query builder ───────────────────────────────────────────────
// Derives a clean, topic-focused search query from an article's title + content.
// Strips company names and filler words; amplifies AI domain terms found in the text.

const COMPANY_WORDS = /\b(microsoft|google|openai|anthropic|meta|apple|amazon|nvidia|deepmind|hugging\s?face|mistral|adobe|ibm|salesforce|samsung|intel)\b'?s?/gi;
const FILLER_WORDS = /\b(the|a|an|for|to|of|in|with|and|or|is|are|was|has|have|how|why|what|when|up|on|at|by|its|it|this|that|their|our|your|from|about|into|as|be|been|being|but|not|we|they|you|he|she|so|if|than|then|more|most|new|all|just|now|here|after|before|over|out|off|will|can|may|might|could|would|should)\b/gi;
const DOMAIN_TERMS = /\b(governance|ethics|safety|alignment|bias|fairness|transparency|accountability|compliance|regulation|responsible\s?ai|trustworthy|audit|risk|machine learning|deep learning|neural network|natural language|computer vision|automation|robotics|data science|prompt engineering|fine.?tuning|reinforcement learning|large language model|generative ai|agentic|multimodal|diffusion|rag|retrieval|embedding)\b/gi;

function buildAlisonQuery(article: ParsedArticle): string {
  // Pick up domain terms from the article body
  const bodyMatches = article.contentText.match(DOMAIN_TERMS) ?? [];
  const domainTerms = [...new Set(bodyMatches.map(t => t.toLowerCase().replace(/\s+/g, ' ')))].slice(0, 2);

  // Clean the title down to 3 meaningful words
  const cleanTitle = article.title
    .replace(COMPANY_WORDS, '')
    .replace(FILLER_WORDS, ' ')
    .replace(/[''':]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3)
    .join(' ');

  // Domain terms first (higher signal for Alison's catalogue), then title words
  const query = [...domainTerms, cleanTitle].join(' ').replace(/\s+/g, ' ').trim();
  return query || article.title.slice(0, 60);
}

// ── Alison course resolution ──────────────────────────────────────────────────
// Checks if an Alison course is already in our DB; if not, imports it inline.
// Returns the DB slug for the course (existing or newly inserted), or null on failure.

function slugifyCourse(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

async function resolveAlisonCourse(
  alisonSlug: string,
  db: import('@/lib/db').D1Database,
  adminUserId: string,
): Promise<{ slug: string; title: string; snippet: string | null } | null> {
  // Check DB first
  const existing = await db.prepare(
    `SELECT slug, title, snippet FROM courses WHERE destination_url LIKE ? AND is_alison = 1 LIMIT 1`
  ).bind(`%/course/${alisonSlug}%`).first<{ slug: string; title: string; snippet: string | null }>();
  if (existing) return existing;

  // Not in DB — scrape full detail and import inline
  try {
    const detail = await scrapeAlisonDetail(alisonSlug);
    let dbSlug = slugifyCourse(detail.title);
    if (!isValidSlug(dbSlug)) dbSlug = `alison-${alisonSlug.slice(0, 80)}`;

    // Guard: slug collision
    const collision = await db.prepare('SELECT id FROM courses WHERE slug = ?').bind(dbSlug).first<{ id: string }>();
    if (collision) {
      // Already exists under a different destination_url — return it
      const collided = await db.prepare('SELECT slug, title, snippet FROM courses WHERE slug = ? LIMIT 1').bind(dbSlug).first<{ slug: string; title: string; snippet: string | null }>();
      return collided ?? null;
    }

    const id = `crs-${nanoid(12)}`;
    const now = new Date().toISOString();
    const outcomesJson = detail.outcomes?.length ? JSON.stringify(detail.outcomes) : null;

    const fields = {
      id,
      slug: dbSlug,
      provider_id: ALISON_PROVIDER_ID,
      title: sanitizeText(detail.title).slice(0, 200),
      content_type: 'course',
      category: detail.category ?? 'AI Foundations',
      level: detail.level ?? null,
      snippet: detail.description ?? null,
      long_description: null,
      learning_outcomes_json: outcomesJson,
      duration_text: detail.duration ?? null,
      official_link: detail.officialLink,
      destination_url: detail.affiliateUrl,
      affiliate_url: detail.affiliateUrl,
      is_affiliate: 1,
      is_alison: 1,
      affiliate_provider: 'alison',
      certification_type: detail.certType ?? 'Certificate (optional paid)',
      disclosure_label: 'Free to learn. We may earn a commission if you purchase a certificate.',
      cover_image_url: detail.coverImageUrl ?? null,
      og_image_url: detail.coverImageUrl ?? null,
      published_status: 'published',
      featured_priority: 0,
      popularity_score: 0,
      recent_views_30d: 0,
      unique_learners_30d: 0,
      starts_30d: 0,
      completion_rate: 0,
      enroll_count: detail.enrollCount ?? null,
      last_verified_at: now.slice(0, 10),
      created_at: now,
      updated_at: now,
    };

    const columns = Object.keys(fields).join(', ');
    const placeholders = Object.keys(fields).map(() => '?').join(', ');
    await db.prepare(`INSERT INTO courses (${columns}) VALUES (${placeholders})`).bind(...Object.values(fields)).run();
    await logAdminAction(db, {
      adminUserId,
      actionType: 'CREATE',
      entityType: 'course',
      entityId: id,
      after: { source: 'article_gen_inline_import', alisonSlug, ...fields },
    });

    return { slug: dbSlug, title: detail.title, snippet: detail.description };
  } catch {
    return null;
  }
}

// ── AI article generation ─────────────────────────────────────────────────────
// Generates editorial content from a trending article or course context.

interface GeneratedArticle {
  title: string;
  summary: string;
  why_it_matters: string;
  what_changed: string;
  executive_implications: string;
  primary_course_rationale: string;
  meta_description: string;
  categories: string[];
}

async function generateFromTrend(
  article: ParsedArticle,
  course: { title: string; slug: string; snippet: string | null } | null,
  referenceContent: string,
  apiKey: string,
  model: string,
): Promise<GeneratedArticle | null> {
  const courseSection = course
    ? `\n\nRecommended course to link (already in our catalog):
Title: "${course.title}"
Slug: ${course.slug}
Description: ${course.snippet ?? 'An AI course covering this topic'}

Write the primary_course_rationale to explain why this specific course suits a reader of this article.`
    : `\n\nNo course has been linked yet. Set primary_course_rationale to an empty string "".`;

  const referenceSection = referenceContent.length > 100
    ? `\n\nADDITIONAL REFERENCE SOURCES (for corroboration and context only — do NOT copy verbatim):
${referenceContent.slice(0, 3500)}`
    : '';

  const prompt = `You are an editorial writer for BytesAI Learning. Write a high-quality insight article based on this trending AI news article.

PRIMARY SOURCE:
Source article title: "${article.title}"
Source: ${article.sourceName}
Content:
${article.contentText.slice(0, 3500)}
${referenceSection}
${courseSection}

QUALITY STANDARDS:
1. Ground every claim in the primary source — no fabricated stats or invented developments
2. Write in operator language — practitioner voice, not consultant framing
3. Pick one concrete mechanism or use-case and go deep rather than broad
4. Include at least one honest limitation or failure mode
5. Make executive_implications operational and sequenced — not strategic platitudes
6. When additional references are provided, check them and cite them naturally in the text only when they corroborate or add necessary context (e.g., "as MIT Technology Review noted"). Do not pad the article with unrelated sources.
7. Quantify every major claim. Replace vague intensifiers (significant, substantial, more than, worsens, improves dramatically) with exact numbers, percentages, benchmark sizes, or named institutions. If a number is genuinely unavailable, state the gap explicitly.
8. Frame every topic as risk + opportunity: what bad thing happens if ignored, and what becomes possible if acted on.

BANNED PHRASES: force multiplier, unprecedented, game-changing, transformational, cutting-edge, revolutionary, robust, holistic, paradigm shift, leverage (as verb), synergy, seamlessly, bridge the gap, digital transformation, unlock value

SECTION INSTRUCTIONS:
- title: A specific article headline under 85 characters — not the source title verbatim, editorially reframed
- summary: Start with 3–5 Markdown bullet lines (each starting with "- "). Every bullet must be one sentence; at least two bullets must contain a specific number, benchmark size, or named entity. Follow the bullets with ONE short framing sentence (≤25 words). This is the executive TL;DR.
- why_it_matters: 3–5 sentences. Frame both risk and opportunity: what bad thing happens if ignored, and what becomes possible if acted on. Include one specific use-case, the mechanism, and one honest limitation.
- what_changed: 3–5 sentences. Quantify the development: exact figures, benchmark size, authors/institution. Explain how it works + what specifically changed + one current limitation. Use a Markdown table if comparing methods.
- executive_implications: A time-boxed action playbook using these exact Markdown headings: "**This week**", "**This quarter**", "**This year**". Under each heading provide 2–3 specific bullet actions.
- primary_course_rationale: 3–5 sentences explaining the linked course to the reader (who it's for, what they'll learn, honest limitation, why it's the right entry point). Only write this if the course is directly on-topic for the article; otherwise set to empty string "".
- meta_description: Under 155 characters, SEO-friendly, factual
- categories: JSON array of 1–3 topic labels that best describe this article's domain based on the content (not just the title). Choose from: AI Governance, AI Safety, Foundation Models, AI Tooling, AI Workflow, Ethics & Bias, Regulation & Compliance, Technical Implementation, Research & Models, AI in Business. Multiple categories are allowed when the article genuinely spans domains.

Respond ONLY with valid JSON — no markdown fences:
{
  "title": "...",
  "summary": "...",
  "why_it_matters": "...",
  "what_changed": "...",
  "executive_implications": "...",
  "primary_course_rationale": "...",
  "meta_description": "...",
  "categories": ["..."]
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

// Legacy: generate from course (used when admin manually specifies courseSlug)
async function generateFromCourse(
  course: { title: string; slug: string; snippet: string | null; category: string | null },
  referenceContent: string,
  apiKey: string,
  model: string,
): Promise<GeneratedArticle | null> {
  const referenceSection = referenceContent.length > 100
    ? `\n\nADDITIONAL REFERENCE SOURCES (for corroboration and context only — do NOT copy verbatim):\n${referenceContent.slice(0, 4500)}`
    : '';

  const prompt = `You are an editorial writer for BytesAI Learning. Write an insight article about the AI topic covered by the course below.

Course title: "${course.title}"
Category: ${course.category ?? 'Artificial Intelligence'}
Course description: ${course.snippet ?? 'A free AI course covering the fundamentals and practical applications'}
Course page: https://learn.bytesai.uk/courses/${course.slug}
${referenceSection}

QUALITY STANDARDS:
1. Ground every claim in the primary course description and the reference sources below — no fabricated stats
2. Pick one concrete use-case and stay there
3. Write like an operator, not a summariser
4. Include at least one limitation or failure mode
5. Make executive_implications operational, not strategic
6. When reference sources are provided, check them and cite them naturally in the text only when they corroborate or add necessary context
7. Quantify every major claim. Replace vague intensifiers (significant, substantial, more than, worsens, improves dramatically) with exact numbers, percentages, benchmark sizes, or named institutions. If a number is genuinely unavailable, state the gap explicitly.
8. Frame every topic as risk + opportunity: what bad thing happens if ignored, and what becomes possible if acted on.

BANNED PHRASES: force multiplier, unprecedented, game-changing, transformational, cutting-edge, revolutionary, robust, holistic, paradigm shift, leverage (as verb), synergy, seamlessly, bridge the gap, digital transformation, unlock value

SECTIONS:
- title: Specific headline under 85 characters
- summary: Start with 3–5 Markdown bullet lines (each starting with "- "). Every bullet must be one sentence; at least two bullets must contain a specific number, benchmark size, or named entity. Follow the bullets with ONE short framing sentence (≤25 words). This is the executive TL;DR.
- why_it_matters: 3–5 sentences. Frame both risk and opportunity: what bad thing happens if ignored, and what becomes possible if acted on. Include one specific use-case, the mechanism, and one honest limitation.
- what_changed: 3–5 sentences. Quantify the development: exact figures, benchmark size, authors/institution. Explain how it works + what specifically changed + one current limitation. Use a Markdown table if comparing methods.
- executive_implications: A time-boxed action playbook using these exact Markdown headings: "**This week**", "**This quarter**", "**This year**". Under each heading provide 2–3 specific bullet actions.
- primary_course_rationale: 3–5 sentences. Who this course is for, what they'll learn, honest limitation, why it's the right entry point. Only write this if the course is directly on-topic for the article; otherwise set to empty string "".
- meta_description: Under 155 characters
- categories: JSON array of 1–3 topic labels based on the article content. Choose from: AI Governance, AI Safety, Foundation Models, AI Tooling, AI Workflow, Ethics & Bias, Regulation & Compliance, Technical Implementation, Research & Models, AI in Business.

Respond ONLY with valid JSON:
{
  "title": "...",
  "summary": "...",
  "why_it_matters": "...",
  "what_changed": "...",
  "executive_implications": "...",
  "primary_course_rationale": "...",
  "meta_description": "...",
  "categories": ["..."]
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

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    const rows = await db.prepare(
      "SELECT key, value FROM site_settings WHERE key IN ('article_gen_mode','article_gen_frequency','article_gen_last_run','article_gen_auto_approve','article_gen_last_cron_attempt','article_gen_last_cron_result')"
    ).all<{ key: string; value: string }>();
    const map: Record<string, string> = {};
    for (const r of rows.results) map[r.key] = r.value;
    let lastCronResult: { status: string; msg: string; at: string } | null = null;
    try { lastCronResult = map['article_gen_last_cron_result'] ? JSON.parse(map['article_gen_last_cron_result']) : null; } catch { /* ignore */ }
    return NextResponse.json({
      mode: map['article_gen_mode'] ?? 'manual',
      frequency: map['article_gen_frequency'] ?? 'daily',
      lastRun: map['article_gen_last_run'] ?? null,
      autoApprove: map['article_gen_auto_approve'] === 'true',
      lastCronAttempt: map['article_gen_last_cron_attempt'] ?? null,
      lastCronResult,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load settings.' }, { status: 500 });
  }
}

// ── POST /api/admin/article-gen ───────────────────────────────────────────────
// Two modes:
//   { courseSlug } → manual: generate article from a specific course (admin use)
//   {}             → trend:  pick top trending RSS article, search Alison for congruent course

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  let body: { courseSlug?: string } = {};
  try { body = await req.json(); } catch { /* body is optional */ }

  // Resolve API key + model
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

  // editorial_review_status: 'approved' if auto-approve is on (skips review queue),
  // but published_status is always 'draft' — publishing requires a manual action.
  const autoApproveSetting = await db.prepare(
    "SELECT value FROM site_settings WHERE key = 'article_gen_auto_approve'"
  ).first<{ value: string }>();
  const editorialStatus = autoApproveSetting?.value === 'true' ? 'approved' : 'draft';

  const now = new Date().toISOString();
  let generated: GeneratedArticle | null = null;
  let linkedCourseSlug: string | null = null;
  let sourceRefs: Array<{ title: string; url: string }> = [];

  // ── MODE A: Manual — admin specifies a course ─────────────────────────────
  if (body.courseSlug) {
    type CourseRow = { title: string; slug: string; snippet: string | null; category: string | null };
    const course = await db.prepare(
      'SELECT title, slug, snippet, category FROM courses WHERE slug = ? AND is_alison = 1 LIMIT 1'
    ).bind(body.courseSlug).first<CourseRow>();

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    // Web search for reference context and corroborating sources
    const searchQuery = `${course.title} artificial intelligence`;
    const searchResults = await searchDDG(searchQuery);
    let referenceContent = '';
    const checkedSources: { url: string; title: string }[] = [];
    for (const result of searchResults.slice(0, 3)) {
      const snippet = await fetchSnippet(result.url);
      if (snippet.length > 200) {
        referenceContent += `\n\n--- Source: ${result.title} (${result.url}) ---\n${snippet}`;
        checkedSources.push(result);
        if (referenceContent.length > 5000) break;
      }
    }

    generated = await generateFromCourse(course, referenceContent, apiKey, model);
    linkedCourseSlug = course.slug;

    // Build source references: prefer extracted page titles, fall back to path slugs
    sourceRefs = await Promise.all(
      searchResults.slice(0, 4).map(async r => {
        const title = (await extractPageTitle(r.url)) ?? r.title;
        return { title, url: r.url };
      })
    );

  // ── MODE B: Trend — pick top unprocessed RSS article ─────────────────────
  } else {
    // Fetch trending articles
    const trendingArticles = await fetchTrendingArticles(RSS_SOURCES);
    if (trendingArticles.length === 0) {
      return NextResponse.json({ error: 'No trending articles found from RSS feeds.' }, { status: 404 });
    }

    // Get slugs already in curated_pages to avoid duplicates
    const existingSlugs = await db.prepare(
      'SELECT slug FROM curated_pages'
    ).all<{ slug: string }>();
    const existingSlugSet = new Set(existingSlugs.results.map(r => r.slug));

    // Pick top-scored article whose slug isn't already in curated_pages
    const article = trendingArticles.find(a => !existingSlugSet.has(toSlug(a.title)));
    if (!article) {
      return NextResponse.json({
        error: 'All trending articles have already been processed. Check back later for new content.',
      }, { status: 409 });
    }

    // Search Alison for congruent courses, pick best with rotation logic
    const alisonResults = await scrapeAlisonSearch(buildAlisonQuery(article));
    let linkedCourse: { slug: string; title: string; snippet: string | null } | null = null;

    if (alisonResults.length > 0) {
      // Get referral history: which DB course slugs have been used, and when last used
      const referralHistory = await db.prepare(
        'SELECT primary_course_slug, MAX(created_at) as last_referred FROM curated_pages WHERE primary_course_slug IS NOT NULL GROUP BY primary_course_slug'
      ).all<{ primary_course_slug: string; last_referred: string }>();
      const referralMap = new Map(referralHistory.results.map(r => [r.primary_course_slug, r.last_referred]));

      // Look up which Alison results are already in our DB
      type CourseRow = { slug: string; title: string; snippet: string | null };
      const dbLookups = await Promise.all(
        alisonResults.map(r =>
          db.prepare('SELECT slug, title, snippet FROM courses WHERE destination_url LIKE ? AND is_alison = 1 LIMIT 1')
            .bind(`%/course/${r.slug}%`).first<CourseRow>()
        )
      );

      // Build candidate list: { alisonSlug, dbSlug|null, lastReferred|null }
      type Candidate = { alisonSlug: string; dbSlug: string | null; lastReferred: string | null };
      const candidates: Candidate[] = alisonResults.map((r, i) => ({
        alisonSlug: r.slug,
        dbSlug: dbLookups[i]?.slug ?? null,
        lastReferred: dbLookups[i] ? (referralMap.get(dbLookups[i]!.slug) ?? null) : null,
      }));

      // Priority 1: not in DB (brand new to us)
      // Priority 2: in DB but never referred
      // Priority 3 (rotation): referred before — pick least recently referred
      const notInDb = candidates.find(c => !c.dbSlug);
      const unreferred = candidates.find(c => c.dbSlug && !c.lastReferred);
      const leastRecent = candidates
        .filter(c => c.dbSlug && c.lastReferred)
        .sort((a, b) => a.lastReferred!.localeCompare(b.lastReferred!))[0];

      const winner = notInDb ?? unreferred ?? leastRecent ?? candidates[0];

      if (winner) {
        const resolved = await resolveAlisonCourse(winner.alisonSlug, db, session.userId);
        if (resolved) {
          linkedCourse = resolved;
          linkedCourseSlug = resolved.slug;
        }
      }
    }

    // Search for additional reference sources related to the article topic
    const searchQuery = buildAlisonQuery(article) || article.title.slice(0, 80);
    const searchResults = await searchDDG(`${searchQuery} AI news`);
    const primaryDomain = new URL(article.url).hostname;
    const additionalResults = searchResults.filter(r => {
      try {
        return new URL(r.url).hostname !== primaryDomain;
      } catch {
        return false;
      }
    }).slice(0, 3);

    let referenceContent = '';
    const checkedAdditional: { url: string; title: string }[] = [];
    for (const result of additionalResults) {
      const snippet = await fetchSnippet(result.url);
      if (snippet.length > 200) {
        referenceContent += `\n\n--- Source: ${result.title} (${result.url}) ---\n${snippet}`;
        checkedAdditional.push(result);
        if (referenceContent.length > 4000) break;
      }
    }

    generated = await generateFromTrend(article, linkedCourse, referenceContent, apiKey, model);

    // Primary source first, then checked additional sources
    sourceRefs = [{ title: `${article.sourceName}: ${article.title}`, url: article.url }];
    for (const r of checkedAdditional) {
      const title = (await extractPageTitle(r.url)) ?? r.title;
      sourceRefs.push({ title, url: r.url });
    }
  }

  if (!generated) {
    return NextResponse.json({ error: 'Article generation failed. Please try again.' }, { status: 500 });
  }

  // ── Save to curated_pages ─────────────────────────────────────────────────
  const slug = toSlug(generated.title);
  if (!slug) {
    return NextResponse.json({ error: 'Could not generate a URL slug from the article title.' }, { status: 500 });
  }

  const id = `cp-${nanoid(10)}`;

  try {
    const categoriesJson = Array.isArray(generated.categories) && generated.categories.length
      ? JSON.stringify(generated.categories)
      : null;

    await db.prepare(`
      INSERT INTO curated_pages (
        id, slug, title, summary, why_it_matters, what_changed, executive_implications,
        primary_course_rationale, primary_course_slug, source_references_json, meta_description,
        categories_json, editorial_review_status, published_status,
        ai_generated, generated_model, generated_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).bind(
      id, slug, generated.title,
      generated.summary,
      generated.why_it_matters,
      generated.what_changed,
      generated.executive_implications,
      generated.primary_course_rationale || null,
      linkedCourseSlug,
      JSON.stringify(sourceRefs),
      generated.meta_description,
      categoriesJson,
      editorialStatus,
      'draft',
      model, now, now, now,
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
      after: { id, slug, title: generated.title, source: body.courseSlug ? 'manual' : 'trend-engine', linkedCourseSlug },
    });

    return NextResponse.json({
      ok: true,
      id,
      slug,
      title: generated.title,
      linkedCourseSlug,
    });
  } catch (e: unknown) {
    const msg = (e as { message?: string }).message ?? '';
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({
        error: 'An article with this slug already exists.',
      }, { status: 409 });
    }
    return NextResponse.json({ error: 'Database error saving article.' }, { status: 500 });
  }
}

// ── Helpers (used by manual/course mode) ─────────────────────────────────────

async function searchDDG(query: string): Promise<{ url: string; title: string }[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BytesAIBot/1.0)', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: { url: string; title: string }[] = [];

    // Extract result blocks and pull link + title from each
    const blockRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(html)) !== null) {
      try {
        const rawHref = bm[1];
        const title = stripHtml(bm[2]).trim();
        const decoded = rawHref.startsWith('http')
          ? rawHref
          : decodeURIComponent(rawHref.replace(/^\/l\/\?uddg=/, '').split('&')[0]);
        if (decoded.startsWith('http') && !decoded.includes('duckduckgo.com')) {
          results.push({ url: decoded, title: title || decoded });
        }
      } catch { /* skip */ }
    }

    // Fallback: direct uddg links if the block parse misses
    if (results.length === 0) {
      const re = /href="\/l\/\?uddg=([^&"]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        try {
          const decoded = decodeURIComponent(m[1]);
          if (decoded.startsWith('http') && !decoded.includes('duckduckgo.com')) {
            results.push({ url: decoded, title: decoded });
          }
        } catch { /* skip */ }
      }
    }

    // De-duplicate by URL
    const seen = new Set<string>();
    return results.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    }).slice(0, 6);
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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
    return stripHtml(html).slice(0, 2000);
  } catch {
    return '';
  }
}

async function extractPageTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,*/*',
      },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
    return title ? stripHtml(title) : null;
  } catch {
    return null;
  }
}

