import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import {
  sanitizeText, sanitizeEmail, isValidEmail,
  checkRateLimitAsync, getRateLimitKey,
} from '@/lib/security';
import { nanoid } from 'nanoid';

const VALID_SENTIMENTS = ['positive', 'neutral', 'negative'] as const;
const VALID_TYPES = ['general', 'article'] as const;

export async function POST(req: NextRequest) {
  // ── Layer 3: Rate limit — 3 submissions per IP per hour ───────────────
  const rlKey = getRateLimitKey(req, 'feedback');
  const rl = await checkRateLimitAsync(rlKey, 3, 60 * 60 * 1000);
  if (!rl.allowed) {
    // Silently accept so bots don't know they're blocked
    return NextResponse.json({ ok: true });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  // ── Layer 2: Honeypot — bots fill hidden fields, humans don't ─────────
  if (body.website) {
    return NextResponse.json({ ok: true }); // silent discard
  }

  // ── Layer 4: Minimum content validation ───────────────────────────────
  const sentiment = body.sentiment as string | undefined;
  const rawMessage = body.message as string | undefined;
  const message = sanitizeText(rawMessage ?? '');

  const hasSentiment = sentiment && VALID_SENTIMENTS.includes(sentiment as typeof VALID_SENTIMENTS[number]);
  const hasMessage = message.length >= 3;

  if (!hasSentiment && !hasMessage) {
    return NextResponse.json({ error: 'Please select a sentiment or write a message.' }, { status: 422 });
  }

  // ── Validate type + slug ──────────────────────────────────────────────
  const type = (body.type as string | undefined) ?? 'general';
  if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid type.' }, { status: 422 });
  }

  const slug = type === 'article' ? (body.slug as string | undefined)?.slice(0, 200) : null;
  const pageUrl = sanitizeText((body.page_url as string | undefined) ?? '').slice(0, 500);

  // ── Optional email ────────────────────────────────────────────────────
  const rawEmail = body.email as string | undefined;
  const email = rawEmail ? sanitizeEmail(rawEmail) : null;
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 422 });
  }

  // ── Optional auth ─────────────────────────────────────────────────────
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token).catch(() => null) : null;
  const userId = session?.userId ?? null;

  // ── Persist to DB ─────────────────────────────────────────────────────
  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  try {
    await db.prepare(`
      INSERT INTO feedback (id, type, slug, page_url, sentiment, message, email, user_id, reviewed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(
      `fb-${nanoid(10)}`,
      type,
      slug,
      pageUrl || null,
      hasSentiment ? sentiment : null,
      hasMessage ? message : null,
      email,
      userId,
      new Date().toISOString(),
    ).run();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save feedback.' }, { status: 500 });
  }
}
