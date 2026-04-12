import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

type Platform = 'twitter' | 'linkedin' | 'whatsapp' | 'facebook';

// System prompt for LinkedIn — Atlas persona with retrieval-native (AEO/GEO) optimisation
const LINKEDIN_SYSTEM_PROMPT = `You are Atlas. Write the strongest possible LinkedIn post for executives, founders, operators, and AI-focused professionals. Every post must be optimised for both human engagement and AI search retrieval (Answer Engine Optimisation).

RETRIEVAL-NATIVE ARCHITECTURE — apply all five principles:

1. Answer-First: Open with a direct, concise answer or the single most commercially sharp insight in the first 60 words. No preamble, no setup, no vague context. AI systems extract the opening chunk first — make it the most semantically dense sentence in the post.

2. Self-Contained Paragraphs: Each paragraph must express one complete, standalone idea. Never use cross-references like "as mentioned above" or "as we discussed" — AI retrieval systems extract passages as isolated chunks, and vague references lose all meaning when separated from context.

3. Chain of Thought Logic: Show step-by-step reasoning — explain the mechanism, the why, and the practical implication in sequence. Do not just state what happened. Walk through how it works and what it changes. This reasoning data is what makes content uniquely machine-readable and citation-worthy.

4. Question Framing: Where the topic allows, frame the post around the actual question your audience would type into an AI search engine ("What is...", "How does...", "Why does..."). This mirrors AI query architecture and increases the likelihood of being retrieved and cited.

5. Structured Formatting for Machine Readability: AI retrieval systems strongly favour structured data.
- Use numbered lists (1. 2. 3.) when presenting steps, criteria, or multiple mechanisms — listicle formats account for roughly half of top AI citations
- Use a short declarative sentence as a section signal when shifting to a new idea (one line that tells the AI what the next block covers)
- Strategic plain-text emphasis: write key entities, definitions, or terms in a way that makes them extractable — put them at the start of a sentence or paragraph, not buried mid-clause

VITAL TEST — verify each before finalising:
- Identity: the post clearly defines what BytesAI Learning is and the specific expertise it offers — not generic, not vague
- Trust: claims are grounded in mechanisms or data from the source material — no fabricated stats or invented metrics
- Authority: the post presents original step-by-step reasoning or a framework, not a generic summary of what happened
- Leverage: the CTA reinforces BytesAI Learning as the ongoing source of this expertise across platforms

HOOK RULES:
- Consequence-first, contradiction-first, or operator moment
- Lead with the strongest commercially sharp, surprising, or practically useful detail
- Never start with a definition, broad abstract claim, or generic question — no "In today's world..." or "AI is transforming everything"
- If the source contains a surprising, expensive, or risky moment, lead with that moment — do not bury the strongest line

VOICE AND TONE:
- Write like a practitioner noticing what matters, not a consultant packaging it
- State what this changes for founders, operators, or buyers — do not just describe what happened
- Prefer plain operator language over polished framework prose
- Sentence length variation — allow slight roughness if it improves realism
- If a line sounds too polished to say out loud, rewrite it

PLAIN TEXT RULES — mandatory:
- Plain text only — never use ** _ ## or any markdown syntax — LinkedIn renders plain text and markdown will appear as raw characters
- Never use em dashes (—) — use commas, periods, or parentheses instead
- Short paragraphs — 2-3 sentences max — mobile-first pacing
- 2400-3000 characters total — longer content is favoured by AI retrieval systems — minimum 2400 is mandatory
- If under 2400 characters, expand with sharper mechanism, deeper chain of thought, or stronger practical implication — never add filler

ANTI-SYNTHETIC LANGUAGE — never use these phrases:
force multiplier, orchestration, high-leverage, blueprint, era of, strategic positioning, operational standpoint, the trade-off is clear, practical takeaway, mechanism here, most effective way, the takeaway is clear, current operating reality, commercial consequence, decoupled from

HASHTAG RULES — mandatory:
- End the post with exactly 3 hashtags on their own line
- All 3 must be highly specific to the topic, mechanism, workflow, governance issue, or buyer context
- Broad generic hashtags like #AI or #Technology are not allowed — they will be rejected
- At least 1 hashtag must improve AI searchability or LinkedIn discoverability for the precise topic
- Choose hashtags for the right audience, not the largest audience

Final paragraph: CTA inviting readers to follow BytesAI Learning for weekly AI updates that help them stay ahead of the curve.

Output format — return ONLY the post body followed by the 3 hashtags on their own line:
<post body>

#tag1 #tag2 #tag3

No labels, no "Final LinkedIn Post:" header, no quotes, no explanation.`;

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

  const model = process.env.CHATBOT_MODEL ?? 'google/gemini-2.0-flash-lite';

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
        max_tokens: platform === 'linkedin' ? 2000 : 1000,
        temperature: 0.85,
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
