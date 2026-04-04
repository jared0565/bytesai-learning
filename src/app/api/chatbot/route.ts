import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeText, detectPromptInjection, checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/security';
import { getDB, searchCourses } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { nanoid } from 'nanoid';

const ChatSchema = z.object({
  message: z.string().min(1).max(500),
  sessionId: z.string().max(64).optional(),
  history: z.array(z.object({ role: z.enum(['user', 'bot']), text: z.string().max(500) })).max(10).optional(),
});

// ─── Domain guard ─────────────────────────────────────────────────────────────
// Topics entirely outside of AI/ML/learning that should be politely declined
const OFF_TOPIC_PATTERNS = [
  /\b(recipe|cooking|cook|food|restaurant|meal)\b/i,
  /\b(sport|football|soccer|basketball|nba|nfl|cricket|tennis)\b/i,
  /\b(stock|crypto|bitcoin|invest|trading|forex|finance|money|price)\b/i,
  /\b(weather|forecast|temperature|rain|sun|snow)\b/i,
  /\b(movie|film|netflix|show|series|tv|watch)\b/i,
  /\b(game|gaming|minecraft|roblox|fortnite|playstation|xbox)\b/i,
  /\b(travel|flight|hotel|holiday|vacation|trip)\b/i,
  /\b(health|doctor|medical|drug|medicine|symptom)\b/i,
  /\b(politic|election|vote|president|government)\b/i,
  /\b(relationship|dating|love|romance|marriage)\b/i,
  /\b(news|headline|article|newspaper)\b/i,
];

function isOffTopic(message: string): boolean {
  // If it mentions learning/course/AI explicitly, always allow
  const allowTerms = /\b(ai|learn|course|class|tutorial|machine learning|ml|llm|genai|prompt|data|python|coding|model|agent|certificate|alison|skill)\b/i;
  if (allowTerms.test(message)) return false;
  return OFF_TOPIC_PATTERNS.some(p => p.test(message));
}

// (Off-topic replies now redirect to Alison search inline)

// ─── Keyword fallback ─────────────────────────────────────────────────────────
const KEYWORD_MAP: Array<{ terms: string[]; query: Partial<{ category: string; level: string; sort: string; provider: string }> }> = [
  { terms: ['beginner', 'start', 'new to', 'basics', 'introduction', 'intro', 'foundation', 'zero to'], query: { level: 'Beginner', sort: 'popular' } },
  { terms: ['agent', 'multi-agent', 'crewai', 'langgraph', 'agentic', 'autonomous'], query: { category: 'Agents', sort: 'popular' } },
  { terms: ['prompt', 'prompting', 'prompt engineering', 'prompts'], query: { category: 'Prompt Engineering', sort: 'popular' } },
  { terms: ['generative', 'genai', 'llm', 'large language model', 'gpt', 'claude', 'gemini', 'chatgpt', 'openai'], query: { category: 'LLMs / Generative AI', sort: 'popular' } },
  { terms: ['machine learning', 'supervised', 'unsupervised', 'neural network', 'deep learning'], query: { category: 'Data / ML', sort: 'popular' } },
  { terms: ['data science', 'data analysis', 'analytics', 'pandas', 'numpy'], query: { category: 'Data / ML', sort: 'popular' } },
  { terms: ['ethics', 'governance', 'responsible', 'safety', 'bias', 'fairness', 'trustworthy'], query: { category: 'Governance / Responsible AI', sort: 'popular' } },
  { terms: ['python', 'programming', 'code', 'coding', 'developer', 'software'], query: { category: 'Programming Foundations', sort: 'popular' } },
  { terms: ['book', 'read', 'reading', 'textbook', 'paper'], query: { category: 'Books / Reading Sources', sort: 'popular' } },
  { terms: ['certificate', 'certification', 'credential', 'diploma', 'certified'], query: { sort: 'popular' } },
  { terms: ['alison', 'free diploma', 'free certificate'], query: { sort: 'popular' } },
  { terms: ['microsoft', 'azure', 'copilot'], query: { provider: 'prov-microsoft', sort: 'popular' } },
  { terms: ['google', 'gemini course', 'google ai'], query: { provider: 'prov-google', sort: 'popular' } },
  { terms: ['anthropic', 'claude api', 'mcp', 'model context protocol'], query: { provider: 'prov-anthropic', sort: 'popular' } },
  { terms: ['nvidia', 'gpu', 'cuda'], query: { provider: 'prov-nvidia', sort: 'popular' } },
  { terms: ['deeplearning', 'deeplearning.ai', 'andrew ng', 'andrew'], query: { provider: 'prov-deeplearning-ai', sort: 'popular' } },
  { terms: ['hugging face', 'hf', 'transformers', 'diffusers'], query: { provider: 'prov-hugging-face', sort: 'popular' } },
  { terms: ['business', 'executive', 'manager', 'workplace', 'productivity'], query: { sort: 'popular' } },
];

function keywordFallback(message: string) {
  const lower = message.toLowerCase();
  for (const item of KEYWORD_MAP) {
    if (item.terms.some(t => lower.includes(t))) return item.query;
  }
  return { sort: 'popular' };
}

function buildFallbackReply(message: string, courseCount: number): string {
  const lower = message.toLowerCase();
  if (lower.includes('alison') || lower.includes('diploma')) {
    return `Alison courses are completely free to learn — you only pay if you want the official certificate or diploma. Found ${courseCount} great option${courseCount === 1 ? '' : 's'} below! 🎓`;
  }
  if (lower.includes('certificate') || lower.includes('credential')) {
    return `These courses are free to start — some offer optional paid certificates. I've prioritised ones with affiliate links where you can get a recognised credential. Found ${courseCount} match${courseCount === 1 ? '' : 'es'}:`;
  }
  if (lower.includes('beginner') || lower.includes('new to') || lower.includes('start')) {
    return `Here are the best beginner-friendly free AI courses — all free to start! 🚀 Found ${courseCount} result${courseCount === 1 ? '' : 's'}:`;
  }
  if (courseCount === 0) {
    return `Hmm, I couldn't find an exact match in the catalog. Try browsing by category at /courses, or ask me something like "beginner AI course" or "prompt engineering".`;
  }
  return `Here are the best free courses for that — I've highlighted any with optional certificates first. All free to start! (${courseCount} found)`;
}

// ─── Affiliate-priority sort ──────────────────────────────────────────────────
type CourseResult = { title: string; slug: string; provider?: string; snippet?: string; is_affiliate: boolean; is_alison: boolean; affiliate_url?: string };

function sortBalancedAffiliate(courses: CourseResult[]): CourseResult[] {
  // Split into Alison, other-affiliate, and regular
  const alison = courses.filter(c => c.is_alison);
  const affiliate = courses.filter(c => !c.is_alison && c.is_affiliate);
  const regular = courses.filter(c => !c.is_alison && !c.is_affiliate);

  // Take max 2 Alison, then affiliates, then regular — balanced mix
  const result: CourseResult[] = [];
  result.push(...alison.slice(0, 2));
  result.push(...affiliate.slice(0, 2));
  // Fill remaining slots with regular courses (up to 4 total)
  const remaining = 4 - result.length;
  if (remaining > 0) result.push(...regular.slice(0, remaining));
  // If still under 4, backfill from whichever pool has extras
  if (result.length < 4) result.push(...alison.slice(2, 2 + (4 - result.length)));
  if (result.length < 4) result.push(...affiliate.slice(2, 2 + (4 - result.length)));
  return result.slice(0, 4);
}

// ─── Conversation persistence ─────────────────────────────────────────────────
async function persistMessages(
  db: import('@/lib/db').D1Database,
  sessionId: string,
  userId: string | null,
  userMessage: string,
  botReply: string,
  courses: CourseResult[],
  offTopic: boolean,
) {
  if (!db) return;
  const now = new Date().toISOString();
  try {
    // Upsert session
    await db.prepare(`
      INSERT INTO chatbot_sessions (id, visitor_id, user_id, started_at, last_message_at, message_count)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        last_message_at = excluded.last_message_at,
        message_count = chatbot_sessions.message_count + 1
    `).bind(sessionId, sessionId, userId, now, now).run();

    // Insert user message
    await db.prepare(
      'INSERT INTO chatbot_messages (id, session_id, role, content, off_topic, occurred_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(nanoid(), sessionId, 'user', userMessage, offTopic ? 1 : 0, now).run();

    // Insert bot reply
    await db.prepare(
      'INSERT INTO chatbot_messages (id, session_id, role, content, courses_json, off_topic, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(nanoid(), sessionId, 'bot', botReply, courses.length ? JSON.stringify(courses.map(c => c.slug)) : null, 0, now).run();
  } catch {
    // Non-fatal
  }
}

// ─── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a course librarian for BytesAI Learning — a curated catalog of free AI courses.
Your ONLY job is to help learners find free AI, ML, and data science courses.

Rules:
- Keep replies SHORT — 1-2 sentences max, under 40 words. No lists, no bullet points, no URLs.
- For AI/ML topics: reply briefly, then append SEARCH_QUERY:{"q":"...","category":"...","level":"..."} with the best catalog search.
- For NON-AI topics (e.g. English, photography, philosophy, accounting, music, cooking, etc.): reply with exactly one short sentence, then append ALISON_REDIRECT:corrected_topic where corrected_topic is the properly spelled topic name. Fix any typos the user made. Do NOT include any URLs or links in your text. Example: user says "philosphy" → your reply is "Alison has free philosophy courses!" then ALISON_REDIRECT:philosophy
- Never invent courses. Never output URLs. Never mention competitor platforms.
- Mention Alison courses are free with optional paid certificates when relevant.`;

export async function POST(req: NextRequest) {
  // Rate limit: 30 requests/hour per IP
  const key = getRateLimitKey(req, 'chatbot');
  const limit = checkRateLimit(key, 30, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.' }, { status: 422 });

  const rawMessage = sanitizeText(parsed.data.message);
  const sessionId = parsed.data.sessionId ?? nanoid();

  // Get user from session cookie (optional — guest conversations also stored)
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token).catch(() => null) : null;
  const userId = session?.userId ?? null;

  // Prompt injection
  if (detectPromptInjection(rawMessage)) {
    return NextResponse.json({
      reply: "I'm here to help you find free AI courses! Ask me something like 'Find beginner AI courses' or 'Best prompt engineering courses'. 😊",
      sessionId,
    });
  }

  // Domain guard — redirect obvious non-AI topics to Alison without burning an LLM call
  const offTopic = isOffTopic(rawMessage);
  if (offTopic) {
    const reply = `Alison has free courses on that — check below! I can also help you find AI courses. 🎓`;
    const db = await getDB();
    await persistMessages(db, sessionId, userId, rawMessage, reply, [], true);
    return NextResponse.json({ reply, courses: [], sessionId, ok: true, alisonRedirect: rawMessage });
  }

  const db = await getDB();

  // ─── Check chatbot mode setting ──────────────────────────────────────────────
  let chatbotModeSetting: 'ai' | 'keyword' = 'ai';
  if (db) {
    try {
      const row = await db.prepare("SELECT value FROM site_settings WHERE key = 'chatbot_mode'").first<{ value: string }>();
      if (row?.value === 'keyword') chatbotModeSetting = 'keyword';
    } catch { /* default to ai */ }
  }

  // ─── Try LLM (via OpenRouter) — only in AI mode ─────────────────────────────
  // Always read secrets from Cloudflare env bindings (process.env may not stringify correctly)
  let apiKey: string | undefined;
  let chatbotModel: string | undefined;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    const cfEnv = env as Record<string, unknown>;
    apiKey = String(cfEnv.OPENROUTER_API_KEY ?? '').trim() || undefined;
    chatbotModel = String(cfEnv.CHATBOT_MODEL ?? '').trim() || undefined;
  } catch {
    // Local dev fallback
    apiKey = process.env.OPENROUTER_API_KEY?.trim();
    chatbotModel = process.env.CHATBOT_MODEL?.trim();
  }

  let llmReply: string | null = null;
  let llmSearchQuery: string | null = null;
  let llmAlisonRedirect: string | null = null;

  if (apiKey && db && chatbotModeSetting === 'ai') {
    try {
      const history = parsed.data.history ?? [];
      const msgs = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
        { role: 'user', content: rawMessage },
      ];

      const model = chatbotModel ?? 'google/gemini-3.1-flash-lite-preview';
      const trimmedKey = String(apiKey).trim();
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmedKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://learn.bytesai.uk',
          'X-Title': 'BytesAI Learning',
        }),
        body: JSON.stringify({ model, messages: msgs, max_tokens: 200, temperature: 0.3 }),
      });

      if (response.ok) {
        const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        let content = data.choices?.[0]?.message?.content ?? '';

        // Parse ALISON_REDIRECT — LLM signals this is a non-AI topic with corrected spelling
        const alisonMatch = content.match(/ALISON_REDIRECT:\s*(.+)/i);
        if (alisonMatch) {
          llmAlisonRedirect = alisonMatch[1].trim().replace(/["`*]/g, '');
          content = content.replace(/ALISON_REDIRECT:.+/i, '').trim();
        }

        // Parse SEARCH_QUERY — LLM provides structured catalog search
        const searchMatch = content.match(/SEARCH_QUERY:\s*(\{.+\})/i);
        if (searchMatch) {
          content = content.replace(/SEARCH_QUERY:.+/i, '').trim();
          try { llmSearchQuery = JSON.parse(searchMatch[1]).q; } catch { /* ignore */ }
        }

        // Clean up any stray URLs the LLM may have included
        llmReply = content.replace(/https?:\/\/\S+/g, '').trim() || null;
      }
    } catch { /* fall through to keyword fallback */ }
  }

  // ─── If LLM redirected to Alison, return early with the button ──────────────
  if (llmAlisonRedirect) {
    const reply = llmReply || `Alison has free ${llmAlisonRedirect} courses — check them out below! 🎓`;
    await persistMessages(db, sessionId, userId, rawMessage, reply, [], true);
    return NextResponse.json({ reply, courses: [], sessionId, ok: true, alisonRedirect: llmAlisonRedirect });
  }

  // ─── Course lookup (affiliate-prioritised) ───────────────────────────────────
  let courses: CourseResult[] = [];

  if (db) {
    try {
      const searchOpts = llmReply
        ? { q: llmSearchQuery ?? rawMessage, limit: 6, sort: 'popular' }
        : { ...keywordFallback(rawMessage), q: undefined, limit: 6 };

      const result = await searchCourses(db, searchOpts as Parameters<typeof searchCourses>[1]);
      const raw = result.courses.map(c => ({
        title: c.title,
        slug: c.slug,
        provider: c.provider_id?.replace('prov-', '').replace(/-/g, ' '),
        snippet: c.snippet ?? undefined,
        is_affiliate: c.is_affiliate === 1,
        is_alison: c.is_alison === 1,
        affiliate_url: c.affiliate_url ?? undefined,
      }));

      // Balanced sort: max 2 Alison, then affiliates, then regular
      courses = sortBalancedAffiliate(raw);
    } catch { /* non-fatal */ }
  }

  const reply = llmReply ?? buildFallbackReply(rawMessage, courses.length);

  // Persist conversation
  await persistMessages(db, sessionId, userId, rawMessage, reply, courses, false);

  return NextResponse.json({ reply, courses, sessionId, ok: true });
}
