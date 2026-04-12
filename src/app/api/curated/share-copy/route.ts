import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

type Platform = 'twitter' | 'linkedin' | 'whatsapp' | 'facebook';

const PLATFORM_PROMPTS: Record<Platform, (
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

  linkedin: (title, summary, why, what, exec) => `Write a LinkedIn post about this AI insight.

Article: ${title}
Summary: ${summary}
Why it matters: ${why}
What changed: ${what}
Key implications: ${exec}

Rules (strictly follow ALL):
- 1,800-2,400 characters total (mandatory minimum — if under 1,800, expand with sharper consequence, clearer mechanism, or stronger practical implication, never filler)
- Answer-first: open with the direct key insight or most commercially surprising detail in the first 60 words — no setup, no preamble
- Hook: consequence-first, contradiction-first, or operator moment — never a generic opening, broad abstract question, or definition before consequence
- Post shape: strong opening (answer-first) -> one mechanism explained -> one consequence -> one practical takeaway -> clean ending with CTA
- Write like a practitioner interpreting what this means, not a journalist describing what happened — state what this changes for executives, founders, or operators
- Show reasoning step-by-step — explain why this matters, not just what happened; make the mechanism behind the change explicit
- Each paragraph expresses one complete idea on its own — no cross-references like "as mentioned" or "as above"
- Short paragraphs only, 2-3 sentences max — mobile-first pacing
- No bullet points, numbered lists, or headings inside the post
- Never use em dashes (—) — use commas, periods, or parentheses instead
- Avoid consultant phrasing: "force multiplier", "orchestration", "high-leverage", "blueprint", "era of", "strategic positioning", "operational standpoint", "the trade-off is clear", "practical takeaway" — write like a smart operator would actually type
- Final paragraph: CTA asking readers to follow BytesAI Learning for weekly AI updates
- End with exactly 3 hashtags on a new line — highly specific to the topic, mechanism, or buyer context; no broad generic hashtags like #AI or #Technology
- NO URL (appended separately)
- Return ONLY the post text with hashtags at the bottom — no quotes, no explanation`,

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
  if (!slug || !platform || !Object.keys(PLATFORM_PROMPTS).includes(platform)) {
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
  const prompt = PLATFORM_PROMPTS[platform as Platform](
    page.title,
    page.summary ?? '',
    page.why_it_matters ?? '',
    page.what_changed ?? '',
    page.executive_implications ?? ''
  );

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
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
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
    if (!copy) return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 });

    return NextResponse.json({ copy, platform, charCount: copy.length });
  } catch {
    return NextResponse.json({ error: 'Failed to generate copy.' }, { status: 500 });
  }
}
