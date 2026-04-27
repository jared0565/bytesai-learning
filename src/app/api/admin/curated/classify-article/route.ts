import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { classifyArticle } from '@/lib/classify-article';

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

// POST /api/admin/curated/classify-article
// Body: { title, summary?, whyItMatters? }
// Returns: { categories: string[] }
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: { title?: string; summary?: string; whyItMatters?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const { title, summary = '', whyItMatters = '' } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'title is required.' }, { status: 422 });

  let apiKey = '';
  let model = 'google/gemini-3.1-flash-lite-preview';
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as Record<string, string>;
    apiKey = env.OPENROUTER_API_KEY ?? '';
    if (env.CHATBOT_MODEL) model = env.CHATBOT_MODEL;
  } catch { /* local dev */ }

  if (!apiKey) return NextResponse.json({ error: 'OpenRouter API key not configured.' }, { status: 503 });

  const categories = await classifyArticle(title.trim(), summary, whyItMatters, apiKey, model);

  if (categories.length === 0) {
    return NextResponse.json({ error: 'Could not classify article — add a summary or why-it-matters first.' }, { status: 422 });
  }

  return NextResponse.json({ categories });
}
