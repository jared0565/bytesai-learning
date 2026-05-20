import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerToken } from '@/lib/auth';
import { getDB } from '@/lib/db';

interface SeedQuestion {
  id: string;
  quiz_id: string;
  difficulty: string;
  question_text: string;
  options_json: string;
  correct_index: number;
  explanation: string | null;
  topic_tags_json: string | null;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  const admin = await verifyBearerToken(auth);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let questions: SeedQuestion[];
  try {
    const body = await request.json();
    questions = body.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Questions array required' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const db = await getDB();
    const now = new Date().toISOString();

    // Upsert the quiz itself
    await db.prepare(
      `INSERT INTO quizzes (id, slug, title, description, category, published_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`
    ).bind(
      'quiz-ai-knowledge',
      'ai-knowledge',
      'AI Knowledge Check',
      'Test your understanding of AI concepts across beginner, intermediate, and advanced levels.',
      'ai-knowledge',
      'published',
      now,
      now
    ).run();

    const batchSize = 20;
    let inserted = 0;
    for (let i = 0; i < questions.length; i += batchSize) {
      const chunk = questions.slice(i, i + batchSize);
      const statements = chunk.map(q =>
        db.prepare(
          `INSERT INTO quiz_questions (id, quiz_id, question_text, options_json, correct_index, explanation, difficulty, topic_tags_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             question_text = excluded.question_text,
             options_json = excluded.options_json,
             correct_index = excluded.correct_index,
             explanation = excluded.explanation,
             difficulty = excluded.difficulty,
             topic_tags_json = excluded.topic_tags_json`
        ).bind(
          q.id,
          q.quiz_id,
          q.question_text,
          q.options_json,
          q.correct_index,
          q.explanation ?? null,
          q.difficulty,
          q.topic_tags_json ?? null
        )
      );
      await db.batch(statements);
      inserted += chunk.length;
    }

    return NextResponse.json({ success: true, inserted, quizId: 'quiz-ai-knowledge' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to seed quiz questions', details: message }, { status: 500 });
  }
}
