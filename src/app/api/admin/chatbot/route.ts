export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

function getDB(req: NextRequest) {
  const env = (req as unknown as { env?: { DB?: import('@/lib/db').D1Database } }).env;
  return env?.DB ?? (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

interface ChatSession {
  id: string;
  user_id: string | null;
  started_at: string;
  last_message_at: string;
  message_count: number;
  user_email?: string | null;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'bot';
  content: string;
  courses_json: string | null;
  off_topic: number;
  occurred_at: string;
}

// GET /api/admin/chatbot — list sessions or messages for a session
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const db = getDB(req);
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const page = parseInt(searchParams.get('page') ?? '1') || 1;
  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    if (sessionId) {
      // Return messages for a specific session
      const result = await db.prepare(
        'SELECT * FROM chatbot_messages WHERE session_id = ? ORDER BY occurred_at ASC'
      ).bind(sessionId).all<ChatMessage>();
      return NextResponse.json({ messages: result.results });
    }

    // Return paginated session list with user email if available
    const result = await db.prepare(`
      SELECT s.id, s.user_id, s.started_at, s.last_message_at, s.message_count,
             u.email AS user_email
      FROM chatbot_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.last_message_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all<ChatSession>();

    const countResult = await db.prepare('SELECT COUNT(*) AS total FROM chatbot_sessions').first<{ total: number }>();

    return NextResponse.json({ sessions: result.results, total: countResult?.total ?? 0, page, limit });
  } catch (err) {
    console.error('Admin chatbot GET error:', err);
    return NextResponse.json({ error: 'Failed to load conversations.' }, { status: 500 });
  }
}
