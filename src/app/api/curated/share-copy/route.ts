import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimitAsync, getRateLimitKey, rateLimitResponse } from '@/lib/security';
import { parseSocialShareCopy, serializeSocialShareCopy, type SocialShareCopy } from '@/lib/social-meta';

type Platform = 'twitter' | 'linkedin' | 'whatsapp' | 'facebook';

// LinkedIn model — Gemini 3 Flash Preview (DeepSeek V3 not available on OpenRouter)
const LINKEDIN_MODEL = 'google/gemini-3-flash-preview';

// System prompt — Atlas framework v2: narrative mode selection, 6 hook families, operator language
const LINKEDIN_SYSTEM_PROMPT = `You are Atlas. Write a LinkedIn post from a sharp, opinionated operator — not a consultant, not a content strategist. Someone who works with this daily and has views formed from real situations and a low tolerance for vague abstractions. Your voice is direct and confident, but warm — you share because the insight is genuinely valuable, not to perform expertise. The reader should feel recommended to, not lectured at.

COMPLIANCE: Use only stats from the source material. No fabricated figures, no engagement bait, no hype that creates reputation risk.

NARRATIVE MODE — select the one that fits the source:
- Research/stat-backed: Operator moment → Source validation → Analysis → Operational rule
- Contrarian: Industry assumption → Challenge → Evidence → Operating implication
- War story: Moment → Breakdown → Lesson → Reusable rule
- Tactical: Tactical list → Synthesis → Implementation lens
- Market event: Market event → Hidden consequence → Executive lesson

For AI search, AEO, GEO, citations, or retrievability topics specifically: open with a 50-60 word Semantic Summary — state the core concept, mechanism, and one outcome in plain language that answers the question someone would type into an AI search engine. Use a source stat if one exists. Do not invent one. This paragraph does not need to be a story. It needs to be precise and extractable.

HOOK — choose one family, rotate across posts. Do not always use the same type:
- Source-anchored reframe: what the source implies for operators, not what it says
- Timing disruption: something that used to be true stopped being true — name the moment
- Operator moment: a real decision, failure, or observation at a real company
- Framework introduction: name a lens the audience does not have a word for yet
- Contrarian claim: what most people in this space get wrong
- Market event with hidden implication: the news is obvious, the consequence is not

Hook rules: start with a consequence, not a definition. Payoff early. Avoid generic openers. Avoid slow setup. Do not follow a predictable arc — combine elements, loop back, or lead with the consequence before the mechanism when it fits the mode.

CONCEPT: Include one reusable lens or mental model the reader can extract and apply elsewhere — capability shelf life, decision ownership, evaluation layer, model swap resilience, workflow redesign, governance layer, answer-layer visibility. Make it feel usable, not packaged.

POST BODY:
One clear cause-and-effect chain. Each paragraph is self-contained — name what you are discussing explicitly, never use "this mechanism," "this approach," or "the method" without restating the referent. AI retrieval systems chunk paragraphs in isolation.
Include one Search Header: a standalone declarative sentence that signals the topic of the section following it. Example: "How real-time emotional state modeling prevents account churn:"
Include one structured element: Before/After comparison, numbered steps, or plain-text two-column comparison. AI systems have a strong bias toward structured data.
State the consequence directly: not "companies should consider" but "if you have not done X, Y happens to you."

EXPERTISE SIGNAL: One concrete, measurable outcome — a before/after, specific metric, or quantified consequence. Use the source stat if one exists. If not, infer a plausible specific consequence grounded in the mechanism. Never a generic claim like "results improve."

THE CTA (final 1-2 sentences only): Natural and brief. Invite readers to follow BytesAI Learning for weekly deep-dives or breakdowns. Do not describe BytesAI Learning's features. Just the invitation.

TONE: Must shift across the post. Open with urgency or tension. Shift to clarity in the mechanism. Close with a direct operational truth. Uniform tone from start to finish reads as generated.

OPERATOR LANGUAGE: Use observational language and concrete nouns. Avoid consultant cadence — symmetrical "here are three things" constructions. Avoid taxonomy-heavy sections that catalogue sub-types instead of making a point. Avoid fear-heavy framing. Do not overexplain basics to an expert audience.

HUMAN SIGNAL RULES (the patterns AI detection actually flags):
Zero rhetorical questions anywhere in the post. Not in the hook, not mid-post, not as transitions. Most flagged AI pattern on LinkedIn.
No three-line punchy parallel hooks. The "X. Y. Z." rhythm is a dead giveaway.
No superlatives. Never use: superior, exceptional, extreme, groundbreaking, revolutionary, optimal, rigorous, transformative, sophisticated.
No transitional filler. Never use: Furthermore, Moreover, Additionally, In essence, To summarize, It is worth noting, Importantly.
No adjective stacking. One modifier per noun.
If any term appears more than twice, cut one instance.
At least one blunt judgment — an actual view the writer holds, not neutral information delivery.
Allow one rough line, a thought expressed more directly than elegantly. Polished writing throughout is itself an AI signal.
Sentence length must vary. Mix short sentences (5-8 words) with longer ones (20-30 words) in the same paragraph.
Use contractions naturally in at least 3 places: don't, you're, it's, they've, won't, can't.

FAILURE PATTERNS — avoid all of these:
Multi-idea overload: more than one central insight spine.
Analysis without an operational rule: diagnosing without telling the reader what to do.
Consulting cadence: polished symmetrical takeaway structure.
Generic hook: any opener that could apply to any AI post this week.
Vague or late source anchoring: burying where the insight comes from.
Endings without a practical line: closing on an observation rather than an operator-level implication.
Perfectly packaged concepts: ideas that sound like they belong in a slide deck.

MOBILE-FIRST: First 200 characters must hook completely — that is all mobile users see before "see more." Short paragraphs, 2-3 sentences max. One blank line between every paragraph. Numbered lists only when content is genuinely sequential.

RETRIEVAL-NATIVE (AEO/GEO): Each paragraph is an island of logic. No "as mentioned," "the above," or any phrase requiring prior context. Key definitions and terms at the start of sentences, not buried mid-clause. The Search Header provides a secondary retrieval signal for AI systems.

VITAL TEST:
Identity: define BytesAI Learning as an expert in the specific domain of this post, not a generic AI platform.
Trust: source stats only. If none exist, describe the logical outcome — never invent figures. A fabricated number destroys retrieval credibility.
Authority: show step-by-step reasoning, not a summary of what happened.
Leverage: CTA references BytesAI Learning's weekly deep-dives or breakdowns, not just "updates."

PLAIN TEXT (mandatory): No ** _ ## or any markdown. No em dashes — use commas, periods, or parentheses.
1800-2400 characters total. Minimum 1800 is mandatory. If under 1800, expand with a sharper consequence, a concrete example, or a more specific mechanism — never filler.

ANTI-SYNTHETIC LANGUAGE (never use): force multiplier, orchestration, high-leverage, blueprint, era of, strategic positioning, operational standpoint, the trade-off is clear, practical takeaway, mechanism here, most effective way, the takeaway is clear, current operating reality, commercial consequence, decoupled from, psychologically resonant, machine-rendered, multimodal deep learning, physiological data points, high cognitive load.
If a technical term appears more than once, the second instance must be replaced with a plain-language equivalent.

HASHTAG RULES (mandatory): Exactly 3 hashtags on their own line at the very end. All 3 highly specific to the topic, mechanism, workflow, or buyer context. No broad generic hashtags like #AI, #Technology, or #Innovation. At least 1 must improve discoverability for the precise topic or buyer workflow.

Output: return ONLY the post body followed by the 3 hashtags on their own line. No labels, no header, no explanation.`;

const PLATFORM_PROMPTS: Record<Exclude<Platform, 'linkedin'>, (
  title: string, summary: string, why: string, what: string, exec: string
) => string> = {

  twitter: (title, summary, why, what) => `Write a single tweet for X/Twitter sharing this AI insight from BytesAI Learning.

Article: "${title}"
Key insight: ${(summary || why || what).slice(0, 300)}

Tone: executive and warm — confident, outcome-focused, genuine. Reads like a thoughtful recommendation from someone who actually found this useful, not a broadcast.

Apply this hook structure in order:
1. Bold statement — what this insight means for the reader, stated as a consequence not a definition
2. Tension — the gap or cost of not knowing this
3. Twist — the unexpected angle or concrete outcome the article reveals
4. Warmth — one grounded line that makes clicking feel like a natural next step, not urgent bait

Rules (strictly follow ALL):
- FINAL TWEET BODY MUST BE UNDER 200 CHARACTERS. The URL is appended separately by the platform. If your draft is longer, cut words ruthlessly until it fits.
- No rhetorical questions, no hashtags, no emojis
- No corporate speak, no superlatives
- End with a pull toward the article — curiosity, not pressure
- Return ONLY the tweet text — no quotes, no labels, no explanation

Example of an acceptable tweet (do not copy; match the length and directness):
AI is changing how clinicians spot rare disease. New reasoning models solved 18 cases that had no diagnosis. Families are no longer stuck in years of uncertainty.`,

  whatsapp: (title, summary, why) => `Write a WhatsApp message sharing this AI insight from BytesAI Learning.

Article: "${title}"
Key point: ${(summary || why).slice(0, 200)}

Tone: executive and warm — like a trusted peer sharing something they found genuinely valuable. Confident and specific, not breathless or salesy. The kind of message a senior professional sends when something is actually worth reading.

Rules (strictly follow ALL):
- 300–400 characters TOTAL
- Open with why you are sharing this (the value to the reader), not a description of what it is
- Mention the article title naturally mid-message
- One clear reason to read — no list of features
- Feels like a personal endorsement from someone whose attention has worth
- NO URL (appended separately), no hashtags
- Return ONLY the message text — no quotes, no explanation`,

  facebook: (title, summary, why, what) => `Write a Facebook post for this AI insight from BytesAI Learning. The URL is appended separately — do not include it.

Article: "${title}"
Key insight: ${(summary || why || what).slice(0, 300)}

PURPOSE: This post must work on two levels: engage Facebook users in their feed AND be indexable by AI search engines that retrieve factual content from social posts (AEO/GEO). Lead with a specific, extractable claim — not a teaser that hides the subject.

FORMAT — exactly 4 parts, separated by newlines, nothing else:
Part 1 — Lead claim (90–130 chars): One declarative sentence naming the specific AI concept and stating a concrete finding, implication, or change. Put the subject first: "[Technology/concept] [does/is/has] [specific outcome]." Do not start with "You" or a curiosity gap.
Part 2 — Consequence (60–90 chars): One sentence adding the "so what" — a concrete outcome, a team impact, or a market shift. Keep it factual and direct.
Part 3 — CTA: rotate — pick one of: "It's free 👇" / "Read it free 👇" / "Start free 👇"
Part 4 — Hashtag: one niche hashtag specific to the article mechanism or buyer workflow. NOT #AI, #Tech, or #Innovation.

RULES (all mandatory):
- Plain text only. No markdown, no quotes, no em dashes.
- No superlatives: no "groundbreaking," "revolutionary," "powerful," "game-changing."
- Factual over atmospheric: state what the technology does, not how exciting it is.
- Use contractions naturally: it's, don't, you'll, they've.
- AEO requirement: Part 1 must be a standalone extractable factual claim that answers a search query.
- No rhetorical questions anywhere.
- Return ONLY the 4 parts. Nothing else.`,
};

async function getAdminSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  return session?.role === 'admin' ? session : null;
}

async function getOpenRouterApiKey(): Promise<string> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    return String((env as Record<string, unknown>).OPENROUTER_API_KEY ?? '').trim();
  } catch {
    return process.env.OPENROUTER_API_KEY?.trim() ?? '';
  }
}

export async function POST(req: NextRequest) {
  let body: { slug?: string; platform?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const { slug, platform } = body;
  if (!slug || !platform || !['twitter', 'linkedin', 'whatsapp', 'facebook'].includes(platform)) {
    return NextResponse.json({ error: 'slug and valid platform required.' }, { status: 422 });
  }

  const admin = await getAdminSession(req);
  const limitKey = getRateLimitKey(req, `share-copy:${platform}`);
  const limit = await checkRateLimitAsync(limitKey, admin ? 60 : 10, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  // Public callers can generate copy only for published pages.
  // Draft previews are admin-only to avoid unpublished-content leakage.
  const page = await db.prepare(
    `SELECT id, title, summary, why_it_matters, what_changed, executive_implications,
            published_status, social_share_copy_json
     FROM curated_pages WHERE slug = ?`
  ).bind(slug).first<{
    id: string;
    title: string;
    summary: string | null;
    why_it_matters: string | null;
    what_changed: string | null;
    executive_implications: string | null;
    published_status: 'draft' | 'published' | 'archived';
    social_share_copy_json: string | null;
  }>();

  if (!page) return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
  if (page.published_status !== 'published' && !admin) {
    return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
  }

  const apiKey = await getOpenRouterApiKey();
  if (!apiKey) return NextResponse.json({ error: 'AI not configured.' }, { status: 503 });

  const storedCopy = parseSocialShareCopy(page.social_share_copy_json);
  const cachedCopy = storedCopy[platform as Platform];
  if (cachedCopy) {
    return NextResponse.json({ copy: cachedCopy, platform, charCount: cachedCopy.length, cached: true });
  }

  // LinkedIn uses DeepSeek V3 for better human-sounding output; other platforms use CHATBOT_MODEL
  const model = platform === 'linkedin'
    ? LINKEDIN_MODEL
    : (process.env.CHATBOT_MODEL ?? 'google/gemini-2.0-flash-lite');

  // Build messages — LinkedIn uses system+user split for better instruction following
  let messages: { role: string; content: string }[];
  if (platform === 'linkedin') {
    messages = [
      { role: 'system', content: LINKEDIN_SYSTEM_PROMPT },
      { role: 'user', content: `Article: ${page.title}\nSummary: ${page.summary ?? ''}\nWhy it matters: ${page.why_it_matters ?? ''}\nWhat changed: ${page.what_changed ?? ''}\nKey implications: ${page.executive_implications ?? ''}` },
    ];
  } else {
    const prompt = PLATFORM_PROMPTS[platform as Exclude<Platform, 'linkedin'>](
      page.title,
      page.summary ?? '',
      page.why_it_matters ?? '',
      page.what_changed ?? '',
      page.executive_implications ?? ''
    );
    messages = [{ role: 'user', content: prompt }];
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://learn.bytesai.uk',
        'X-Title': 'BytesAI Learning Share Copy',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: platform === 'linkedin' ? 1500 : platform === 'facebook' ? 500 : 1000,
        temperature: platform === 'linkedin' ? 0.95 : 0.85,
      }),
      signal: AbortSignal.timeout(22_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI model request failed.' }, { status: 502 });
    }

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    let copy = data.choices?.[0]?.message?.content?.trim() ?? '';
    // Strip surrounding quotes if model wraps response
    if ((copy.startsWith('"') && copy.endsWith('"')) || (copy.startsWith("'") && copy.endsWith("'"))) {
      copy = copy.slice(1, -1).trim();
    }
    // Strip any markdown formatting the model emits despite instructions
    copy = copy
      .replace(/\*\*/g, '')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/—/g, ',');
    // Strip "Final LinkedIn Post:" label if model adds it anyway
    copy = copy.replace(/^Final LinkedIn Post:\s*/i, '').trim();

    // Hard enforce platform length ceilings so users never get blocked by X etc.
    if (platform === 'twitter') {
      // X counts a URL as 23 chars. Leave 24 chars buffer for space + rounding.
      const MAX_TWEET_BODY = 245;
      if (copy.length > MAX_TWEET_BODY) {
        copy = copy.slice(0, MAX_TWEET_BODY).replace(/\s+\S*$/, '').trim();
      }
      if (copy.length > MAX_TWEET_BODY) {
        copy = copy.slice(0, MAX_TWEET_BODY).trim();
      }
    }

    if (!copy) return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 });

    const updatedCopy: SocialShareCopy = {
      ...storedCopy,
      [platform]: copy,
    };
    await db.prepare(
      `UPDATE curated_pages
       SET social_share_copy_json = ?,
           social_share_copy_model = ?,
           social_share_copy_generated_at = ?,
           updated_at = ?
       WHERE id = ?`
    ).bind(
      serializeSocialShareCopy(updatedCopy),
      model,
      new Date().toISOString(),
      new Date().toISOString(),
      page.id,
    ).run();

    return NextResponse.json({ copy, platform, charCount: copy.length, cached: false });
  } catch {
    return NextResponse.json({ error: 'Failed to generate copy.' }, { status: 500 });
  }
}
