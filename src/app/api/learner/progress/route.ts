import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { nanoid } from 'nanoid';

const ProgressSchema = z.object({
  courseId: z.string().min(1).max(100),
  status: z.enum(['saved', 'started', 'completed']),
  progressPercent: z.number().min(0).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  const parsed = ProgressSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.' }, { status: 422 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  const { courseId, status, progressPercent = 0 } = parsed.data;
  const now = new Date().toISOString();

  try {
    // Check course exists
    const course = await db.prepare('SELECT id FROM courses WHERE id = ? AND published_status = ?')
      .bind(courseId, 'published').first<{ id: string }>();
    if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 });

    // Upsert progress
    await db.prepare(`
      INSERT INTO user_course_progress (id, user_id, course_id, status, progress_percent, last_opened_at, started_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, course_id) DO UPDATE SET
        status = excluded.status,
        progress_percent = excluded.progress_percent,
        last_opened_at = excluded.last_opened_at,
        started_at = COALESCE(user_course_progress.started_at, excluded.started_at),
        updated_at = excluded.updated_at
    `).bind(
      nanoid(), session.userId, courseId, status, progressPercent,
      now,
      status === 'started' ? now : null,
      now, now
    ).run();

    // Record event
    await db.prepare(
      'INSERT INTO course_events (id, user_id, course_id, event_type, occurred_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(nanoid(), session.userId, courseId, status === 'saved' ? 'save' : status === 'started' ? 'start' : 'complete', now).run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Progress update error:', err);
    return NextResponse.json({ error: 'Failed to update progress.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) return NextResponse.json({ error: 'Missing courseId.' }, { status: 422 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  try {
    await db.prepare('DELETE FROM user_course_progress WHERE user_id = ? AND course_id = ?')
      .bind(session.userId, courseId).run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Progress delete error:', err);
    return NextResponse.json({ error: 'Failed to remove progress.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  try {
    const result = await db.prepare(
      'SELECT * FROM user_course_progress WHERE user_id = ? ORDER BY last_opened_at DESC LIMIT 50'
    ).bind(session.userId).all<import('@/lib/db').UserCourseProgress>();
    return NextResponse.json({ progress: result.results });
  } catch {
    return NextResponse.json({ progress: [] });
  }
}
