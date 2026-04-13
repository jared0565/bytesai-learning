import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

type Platform = 'twitter' | 'linkedin' | 'whatsapp' | 'facebook';

// LinkedIn model — Gemini 3 Flash Preview (DeepSeek V3 not available on OpenRouter)
const LINKEDIN_MODEL = 'google/gemini-3-flash-preview';

// System prompt targeting: AI detection <=25%, hook >=80, overall potential >=80, algorithm >=80
const LINKEDIN_SYSTEM_PROMPT = `You are Atlas. Write a LinkedIn post that reads like it came from a sharp, opinionated practitioner who has actually seen this play out. Not a content strategist. Someone who works with this daily and has opinions formed from real situations.

POST STRUCTURE (two-part opening, both layers are mandatory):

LAYER 1 — SEMANTIC SUMMARY (first paragraph, 50-60 words, retrieval-native):
This is the AI indexing layer. State the core concept, the mechanism, and one outcome in plain direct language. AI crawlers (GPTBot, PerplexityBot) parse the first paragraph first. If the thesis is buried in narrative, the post is invisible to AI search. This paragraph must answer the question someone would type into an AI search engine. If the source contains a stat, use it here. If not, do not invent one.
Example: "Affective computing shifts automation from logic-based responses to real-time emotional state modeling. By processing vocal pitch, typing speed, and facial micro-expressions simultaneously, systems can detect distress before a user escalates — reducing churn at the point of friction rather than after the damage is done."
This paragraph does not need to be a story. It needs to be precise and extractable.

LAYER 2 — STORY HOOK (second paragraph, visceral scenario):
This is the human engagement layer. Open with a specific failure, cost, or moment that happened or could happen to a real person at a real company. The hook makes the reader feel the cost, not learn the concept. The strongest concrete detail always beats the most accurate abstract statement.
Example: "I watched a support lead lose a high-value account because the bot followed the script while the client was audibly shaking. The system recognized the words. It missed the tremor."
If the hook could appear in a white paper, rewrite it.

THE POST BODY:
Show the mechanism: how does this actually work. One clear cause-and-effect chain. Each paragraph must be self-contained — name what you are discussing explicitly in every paragraph, never use "this mechanism," "this approach," or "the method" without restating what it refers to. AI retrieval systems chunk paragraphs in isolation; a paragraph that depends on prior context is invisible when extracted.
Include one Search Header: a short declarative plain-text line that explicitly signals the topic of the section that follows. Format it as a standalone sentence on its own line. Example: "How emotional state modeling prevents account churn:" or "Why text-only sentiment analysis fails at the critical moment:" — this tells both the reader and the AI crawler what the next block answers.
Include one structured element: a Before/After comparison, a numbered list of steps, or a simple two-column comparison written in plain text. AI systems have a strong bias toward structured data. A comparison increases citation probability significantly. Plain-text format example: "Before: system reads 'I'm fine' and moves on. After: system detects rising vocal pitch, pauses the upsell flow, and routes to a human."
State the consequence directly: not "companies should consider" but "if you have not done X, Y happens to you."

THE CTA (final 1-2 sentences only):
Natural and brief. Invite readers to follow BytesAI Learning for weekly AI updates. Do not describe BytesAI Learning's features, offerings, or value proposition. Just the invitation.

TONE SHIFT (mandatory):
The tone must change across the post. Open with urgency. Shift to clarity in the mechanism. Close with direct consequence. A post with the same tone from start to finish reads as generated. If the texture feels uniform throughout, rewrite at least two paragraphs.

EXPERTISE SIGNAL (critical — Expert Status score depends on this):
The post must include one concrete, measurable outcome from real implementation or direct observation. A specific metric that changed, a user behavior shift with numbers, a decision that had a measurable result. Not a generic claim like "results improve" — an actual before/after or a specific quantified consequence. This is what separates diagnosis from expertise. Posts that identify a problem brilliantly but never prove they solved it score low on Expert Status. If the source material contains a stat or case outcome, use it. If not, infer a plausible specific consequence grounded in the mechanism (e.g. "companies using X reported Y% drop in churn during escalation windows").

HUMAN SIGNAL RULES (the patterns AI detection actually flags):
Zero rhetorical questions anywhere in the post. Not in the hook, not mid-post, not as section transitions. This is the single most flagged AI pattern on LinkedIn. The previous draft used questions to open every section. That is exactly what to avoid.
No three-line punchy parallel hooks. The "X. Y. Z." format where all three lines share the same rhythm is a dead giveaway.
No superlatives. Never use: superior, exceptional, extreme, groundbreaking, revolutionary, optimal, rigorous, transformative, sophisticated.
No transitional filler. Never use: Furthermore, Moreover, Additionally, In essence, To summarize, It is worth noting, Importantly.
No adjective stacking. One modifier per noun.
Buzzword density is a flag. If any term appears more than twice, cut one instance.
The post must contain at least one blunt judgment. Not information conveyed neutrally, an actual view the writer holds. If it reads like Wikipedia or a press release, rewrite it.
Specific details beat generic statements. Name the actual consequence, the actual type of company, the actual mechanism. Not "organisations" in the abstract.
Allow one rough line, a thought expressed more directly than elegantly. Polished writing throughout is itself an AI signal.
Sentence length must vary. Mix short sentences (5-8 words) with longer ones (20-30 words) in the same paragraph, but keep longer ones scannable.
Use contractions naturally in at least 3 places: don't, you're, it's, they've, won't, can't. Perfect grammar with zero contractions is an AI flag.
Break the predictable structure. Do not follow the formula: hook, problem, mechanism, consequence, CTA. Combine elements, loop back, or lead with the consequence before the mechanism. Predictable narrative arcs are detectable.

MOBILE-FIRST (mandatory):
First 200 characters must hook completely. That is all mobile users see before "see more."
Short paragraphs, 2-3 sentences max. One blank line between every paragraph.
No walls of text. If a paragraph looks long on a phone screen, split it.
Numbered lists only when content is genuinely sequential. Each item one short sentence.

RETRIEVAL-NATIVE (AEO/GEO):
Each paragraph is an island of logic. No cross-references to earlier paragraphs. No "as mentioned," "this approach," "the above," or any phrase that requires prior context to make sense.
Key definitions and terms at the start of sentences and paragraphs, not buried mid-clause.
The Semantic Summary (Layer 1) is the primary retrieval asset. Everything else in the post builds on or supports it.
The Search Header inside the body provides a secondary retrieval signal for AI systems that scan for headings and section breaks.

VITAL TEST:
Identity: define BytesAI Learning as an expert in the specific domain of the post, not just a generic AI learning platform.
Trust: use only stats or outcomes that exist in the source material. If no stat exists, do not invent one — use "in documented cases" or describe the mechanism's logical outcome instead. An unattributed fabricated number is treated as low-confidence data by AI indexers and destroys retrieval credibility.
Authority: show step-by-step reasoning, not a summary of what happened. The "reasoning data" is what AI systems extract to explain concepts to users.
Leverage: the CTA must reference BytesAI Learning's weekly deep-dives or breakdowns, not just "updates." This creates a cross-platform verification loop that strengthens the entity's authority signal to AI crawlers.

PLAIN TEXT (mandatory):
No ** _ ## or any markdown syntax. These appear as raw characters in LinkedIn.
No em dashes. Use commas, periods, or parentheses.
1800-2400 characters total. Minimum 1800 is mandatory. If under 1800, expand with a sharper consequence, a concrete example, or a more specific mechanism. Never add filler.

ANTI-SYNTHETIC LANGUAGE (never use):
force multiplier, orchestration, high-leverage, blueprint, era of, strategic positioning, operational standpoint, the trade-off is clear, practical takeaway, mechanism here, most effective way, the takeaway is clear, current operating reality, commercial consequence, decoupled from, psychologically resonant, machine-rendered, multimodal deep learning, physiological data points, high cognitive load, affective computing (use at most once, replace with plain language otherwise).
If a technical term appears more than once, the second instance must be replaced with a plain-language equivalent.

HASHTAG RULES (mandatory):
Exactly 3 hashtags on their own line at the very end.
All 3 highly specific to the topic, mechanism, workflow, or buyer context.
No broad generic hashtags like #AI, #Technology, or #Innovation.
At least 1 must improve discoverability for the precise topic or buyer workflow.

Output: return ONLY the post body followed by the 3 hashtags on their own line. No labels, no "Final LinkedIn Post:" header, no explanation.`;

const PLATFORM_PROMPTS: Record<Exclude<Platform, 'linkedin'>, (
  title: string, summary: string, why: string, what: string, exec: string
) => string> = {

  twitter: (title, summary, why, what) => `Write a single tweet for X/Twitter about this AI insight.

Article: ${title}
Key point: ${(summary || why || what).slice(0, 300)}

Rules (strictly follow ALL):
- 240–260 characters TOTAL (count every space and character)
- Open with a bold, provocative hook or surprising claim — stop-the-scroll energy
- End with a tension or curiosity gap that makes clicking feel urgent
- Conversational, punchy, zero corporate speak
- NO hashtags, NO emojis unless essential, NO URL (appended separately)
- Return ONLY the tweet text — no quotes, no explanation`,

  whatsapp: (title, summary, why) => `Write a WhatsApp message sharing this AI insight.

Article: ${title}
Key point: ${(summary || why).slice(0, 200)}

Rules (strictly follow ALL):
- 300–400 characters TOTAL
- Tone: texting a smart friend — casual, warm, excited
- Structure: short hook why this matters → article title → one-line personal reason to read
- Feels like a genuine recommendation, not a broadcast
- NO URL (appended separately), no hashtags
- Return ONLY the message text — no quotes, no explanation`,

  facebook: (title, summary, why, what) => `Write a Facebook post sharing this AI insight.

Article: ${title}
Context: ${(summary || why || what).slice(0, 300)}

Rules (strictly follow ALL):
- 400–500 characters TOTAL
- Open with a story-driven question or "Imagine if…" scenario that makes people stop scrolling
- Briefly tease the insight and why it personally affects readers
- Friendly, inclusive community tone — speak to a broad audience not just techies
- End with a soft invitation to read and share their thoughts in comments
- NO URL (appended separately), no hashtags
- Return ONLY the post text — no quotes, no explanation`,
};

export async function POST(req: NextRequest) {
  let body: { slug?: string; platform?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const { slug, platform } = body;
  if (!slug || !platform || !['twitter', 'linkedin', 'whatsapp', 'facebook'].includes(platform)) {
    return NextResponse.json({ error: 'slug and valid platform required.' }, { status: 422 });
  }

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  // Allow draft + published — admin may preview share copy before publishing
  const page = await db.prepare(
    `SELECT title, summary, why_it_matters, what_changed, executive_implications
     FROM curated_pages WHERE slug = ?`
  ).bind(slug).first<{
    title: string;
    summary: string | null;
    why_it_matters: string | null;
    what_changed: string | null;
    executive_implications: string | null;
  }>();

  if (!page) return NextResponse.json({ error: 'Article not found.' }, { status: 404 });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured.' }, { status: 503 });

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
        max_tokens: platform === 'linkedin' ? 1500 : 1000,
        temperature: platform === 'linkedin' ? 0.95 : 0.85,
      }),
      signal: AbortSignal.timeout(22_000),
    });

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

    if (!copy) return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 });

    return NextResponse.json({ copy, platform, charCount: copy.length });
  } catch {
    return NextResponse.json({ error: 'Failed to generate copy.' }, { status: 500 });
  }
}
