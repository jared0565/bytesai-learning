export const ARTICLE_CATEGORIES = [
  'AI Governance',
  'AI Safety',
  'Foundation Models',
  'AI Tooling',
  'AI Workflow',
  'Ethics & Bias',
  'Regulation & Compliance',
  'Technical Implementation',
  'Research & Models',
  'AI in Business',
] as const;

export type ArticleCategory = typeof ARTICLE_CATEGORIES[number];

export async function classifyArticle(
  title: string,
  summary: string,
  whyItMatters: string,
  apiKey: string,
  model: string,
): Promise<string[]> {
  const context = [
    `Title: ${title}`,
    summary ? `Summary: ${summary.slice(0, 300)}` : '',
    whyItMatters ? `Why it matters: ${whyItMatters.slice(0, 300)}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `Classify this AI insight article into 1 or 2 of the following categories (pick the most relevant):

${ARTICLE_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Article:
${context}

Respond with ONLY a JSON array of the matching category names exactly as written above, e.g.: ["AI Governance", "Regulation & Compliance"]`;

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
        temperature: 0.1,
        max_tokens: 60,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = (data.choices?.[0]?.message?.content ?? '').trim();
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return (parsed as string[])
        .filter(c => (ARTICLE_CATEGORIES as readonly string[]).includes(c))
        .slice(0, 2);
    }
  } catch { /* fall through */ }
  return [];
}
