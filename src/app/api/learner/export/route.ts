import { getDB } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

// GET /api/learner/export — GDPR Right to Data Portability
// Returns all personal data held about the authenticated user as a JSON download.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const db = await getDB();
  if (!db) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  try {
    // ── Account ────────────────────────────────────────────────────────
    const account = await db
      .prepare('SELECT id, email, role, email_verified, created_at, updated_at FROM users WHERE id = ?')
      .bind(session.userId)
      .first<{
        id: string; email: string; role: string;
        email_verified: number; created_at: string; updated_at: string;
      }>();

    // ── Profile ────────────────────────────────────────────────────────
    const profile = await db
      .prepare(
        `SELECT display_name, bio, avatar_url, dark_mode, timezone,
                learning_goal, preferred_format, created_at, updated_at
         FROM user_profiles WHERE user_id = ?`
      )
      .bind(session.userId)
      .first<{
        display_name: string | null; bio: string | null; avatar_url: string | null;
        dark_mode: number; timezone: string | null; learning_goal: string | null;
        preferred_format: string | null; created_at: string; updated_at: string;
      }>();

    // ── Course progress ────────────────────────────────────────────────
    const progressResult = await db
      .prepare(
        `SELECT p.status, p.started_at, p.last_opened_at, p.progress_percent,
                p.completed_at, p.certificate_claimed_flag, p.created_at, p.updated_at,
                c.title AS course_title, c.slug AS course_slug
         FROM user_course_progress p
         LEFT JOIN courses c ON c.id = p.course_id
         WHERE p.user_id = ?
         ORDER BY p.updated_at DESC`
      )
      .bind(session.userId)
      .all<{
        status: string; started_at: string | null; last_opened_at: string | null;
        progress_percent: number; completed_at: string | null;
        certificate_claimed_flag: number; created_at: string; updated_at: string;
        course_title: string | null; course_slug: string | null;
      }>();

    // ── Chatbot conversations ──────────────────────────────────────────
    const sessionsResult = await db
      .prepare(
        `SELECT id, started_at, last_message_at, message_count
         FROM chatbot_sessions WHERE user_id = ?
         ORDER BY started_at DESC`
      )
      .bind(session.userId)
      .all<{ id: string; started_at: string; last_message_at: string; message_count: number }>();

    // For each chatbot session, fetch messages
    const chatbotConversations = await Promise.all(
      sessionsResult.results.map(async (s) => {
        const msgs = await db
          .prepare(
            `SELECT role, content, occurred_at
             FROM chatbot_messages WHERE session_id = ?
             ORDER BY occurred_at ASC`
          )
          .bind(s.id)
          .all<{ role: string; content: string; occurred_at: string }>();
        return {
          session_started_at: s.started_at,
          session_last_message_at: s.last_message_at,
          message_count: s.message_count,
          messages: msgs.results,
        };
      })
    );

    // ── Course events (clicks, views, etc.) ────────────────────────────
    const eventsResult = await db
      .prepare(
        `SELECT e.event_type, e.occurred_at, c.title AS course_title, c.slug AS course_slug
         FROM course_events e
         LEFT JOIN courses c ON c.id = e.course_id
         WHERE e.user_id = ?
         ORDER BY e.occurred_at DESC
         LIMIT 500`
      )
      .bind(session.userId)
      .all<{
        event_type: string; occurred_at: string;
        course_title: string | null; course_slug: string | null;
      }>();

    // ── Assemble export payload ────────────────────────────────────────
    const exportData = {
      export_info: {
        generated_at: new Date().toISOString(),
        subject: session.email,
        note: 'This file contains all personal data BytesAI Learning holds about you, exported in accordance with your right to data portability under UK GDPR Article 20. Passwords are never stored in plain text and are not included.',
        contact: 'hello@bytesai.com',
        privacy_policy: 'https://learn.bytesai.uk/privacy-policy',
      },
      account: account
        ? {
            id: account.id,
            email: account.email,
            role: account.role,
            email_verified: account.email_verified === 1,
            account_created_at: account.created_at,
            account_updated_at: account.updated_at,
          }
        : null,
      profile: profile
        ? {
            display_name: profile.display_name,
            bio: profile.bio,
            avatar_url: profile.avatar_url,
            dark_mode: profile.dark_mode === 1,
            timezone: profile.timezone,
            learning_goal: profile.learning_goal,
            preferred_format: profile.preferred_format,
            profile_created_at: profile.created_at,
            profile_updated_at: profile.updated_at,
          }
        : null,
      course_progress: progressResult.results.map(p => ({
        course_title: p.course_title,
        course_slug: p.course_slug,
        status: p.status,
        progress_percent: p.progress_percent,
        started_at: p.started_at,
        last_opened_at: p.last_opened_at,
        completed_at: p.completed_at,
        certificate_claimed: p.certificate_claimed_flag === 1,
        saved_at: p.created_at,
        updated_at: p.updated_at,
      })),
      chatbot_conversations: chatbotConversations,
      course_activity_events: eventsResult.results.map(e => ({
        event_type: e.event_type,
        occurred_at: e.occurred_at,
        course_title: e.course_title,
        course_slug: e.course_slug,
      })),
    };

    const json = JSON.stringify(exportData, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bytesai-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Data export error:', err);
    return NextResponse.json({ error: 'Failed to generate export.' }, { status: 500 });
  }
}
