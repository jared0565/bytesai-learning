import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

const INSTRUCTIONS: Record<string, string> = {
  clarity: `Rewrite the following text for clarity and better flow. Fix awkward phrasing, improve sentence structure, and ensure ideas connect smoothly. Keep the same information, tone, and approximate length. Return only the rewritten text — no explanation, no quotes, no preamble.`,

  concise: `Make the following text more concise. Remove filler words, redundant phrases, and unnecessary repetition. Preserve all key information and the overall meaning. Return only the rewritten text — no explanation, no quotes, no preamble.`,

  engaging: `Rewrite the following text to be more engaging and compelling. Use active voice, stronger verbs, and a confident editorial tone. Avoid passive constructions. Keep the same meaning and approximate length. Return only the rewritten text — no explanation, no quotes, no preamble.`,

  seo: `Rewrite the following text optimised for search engines. Naturally incorporate relevant AI and technology keywords without keyword stuffing. Keep the content accurate, readable, and the same approximate length. Return only the rewritten text — no explanation, no quotes, no preamble.`,

  grammar: `Fix grammar, spelling, punctuation, and tense consistency in the following text. Do not change the content, meaning, or length — only correct errors and improve readability. Return only the corrected text — no explanation, no quotes, no preamble.`,

  expand: `Expand the following text with more depth, context, and concrete detail. Roughly double the length while staying on topic. Maintain the same writing style and tone. Return only the expanded text — no explanation, no quotes, no preamble.`,

  simplify: `Rewrite the following text in plain, simple English. Remove jargon and technical language where possible. Keep the meaning intact but make it accessible to a general audience. Return only the rewritten text — no explanation, no quotes, no preamble.`,
};

// POST /api/admin/article-rewrite
// Body: { text: string, instruction: string, context?: string }
// Returns: { rewritten: string }
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: { text?: string; instruction?: string; context?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const { text, instruction, context } = body;

  if (!text?.trim()) return NextResponse.json({ error: 'No text provided.' }, { status: 422 });
  if (!instruction || !INSTRUCTIONS[instruction]) {
    return NextResponse.json({ error: 'Invalid instruction.' }, { status: 422 });
  }
  if (text.trim().length > 8000) {
    return NextResponse.json({ error: 'Text too long (max 8,000 characters).' }, { status: 422 });
  }

  // Resolve API key + model
  let apiKey = '';
  let model = 'google/gemini-3.1-flash-lite-preview';
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as Record<string, string>;
    apiKey = env.OPENROUTER_API_KEY ?? '';
    if (env.CHATBOT_MODEL) model = env.CHATBOT_MODEL;
  } catch { /* local dev */ }

  if (!apiKey) {
    return NextResponse.json({ error: 'OpenRouter API key not configured.' }, { status: 503 });
  }

  const contextLine = context
    ? `Article context: "${context.slice(0, 200)}"\n\n`
    : '';

  const prompt = `${INSTRUCTIONS[instruction]}\n\n${contextLine}Text to rewrite:\n${text.trim()}`;

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
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI model request failed. Please try again.' }, { status: 502 });
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const rewritten = data.choices?.[0]?.message?.content?.trim() ?? '';

    if (!rewritten) {
      return NextResponse.json({ error: 'AI returned an empty response.' }, { status: 500 });
    }

    // Strip any surrounding quotes the model may add
    const cleaned = rewritten.replace(/^["']|["']$/g, '').trim();

    return NextResponse.json({ rewritten: cleaned });
  } catch {
    return NextResponse.json({ error: 'Rewrite request timed out. Please try again.' }, { status: 504 });
  }
}
