import { NextRequest, NextResponse } from 'next/server';
import { getDB, getQuizCorrectAnswers, saveQuizAttempt, searchCourses, distributeCourses } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

interface AnswerSubmission {
  questionId: string;
  selectedIndex: number;
}

function generateId(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  let body: { difficulty: string; answers: AnswerSubmission[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { difficulty, answers } = body;
  if (!difficulty || !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'Answers array required' }, { status: 400 });
  }

  try {
    const db = await getDB();
    const questionIds = answers.map(a => a.questionId);
    const correctData = await getQuizCorrectAnswers(db, questionIds);

    const correctMap = new Map(correctData.map(c => [c.id, c]));
    let score = 0;
    const gradedAnswers = [];
    const wrongTopicCounts = new Map<string, number>();

    for (const ans of answers) {
      const correct = correctMap.get(ans.questionId);
      const isCorrect = correct ? ans.selectedIndex === correct.correct_index : false;
      if (isCorrect) score++;

      gradedAnswers.push({
        questionId: ans.questionId,
        selectedIndex: ans.selectedIndex,
        correct: isCorrect,
        correctIndex: correct?.correct_index ?? null,
        explanation: correct?.explanation ?? null,
      });

      if (!isCorrect && correct?.topic_tags_json) {
        try {
          const tags = JSON.parse(correct.topic_tags_json) as string[];
          for (const tag of tags) {
            wrongTopicCounts.set(tag, (wrongTopicCounts.get(tag) ?? 0) + 1);
          }
        } catch { /* ignore parse errors */ }
      }
    }

    const weakTopics = Array.from(wrongTopicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag, count]) => ({ tag, count }));

    // Get course suggestions
    let suggestions: Awaited<ReturnType<typeof searchCourses>>['courses'] = [];
    try {
      if (weakTopics.length > 0) {
        const query = weakTopics.slice(0, 2).map(t => t.tag.replace(/-/g, ' ')).join(' ');
        const searchResult = await searchCourses(db, { q: query, limit: 6 });
        suggestions = distributeCourses(searchResult.courses, 4).slice(0, 4);
      } else {
        // All correct — suggest popular next-level courses
        const searchResult = await searchCourses(db, { sort: 'popular', limit: 6 });
        suggestions = distributeCourses(searchResult.courses, 4).slice(0, 4);
      }
    } catch {
      suggestions = [];
    }

    // Save attempt if user is logged in
    let savedAttemptId: string | null = null;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('bytesai_session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;

    if (session) {
      const attemptId = generateId();
      await saveQuizAttempt(db, {
        id: attemptId,
        user_id: session.userId,
        quiz_id: 'quiz-ai-knowledge',
        difficulty,
        score,
        total: answers.length,
        answers_json: JSON.stringify(gradedAnswers),
        weak_topics_json: JSON.stringify(weakTopics),
      });
      savedAttemptId = attemptId;
    }

    return NextResponse.json({
      score,
      total: answers.length,
      percentage: Math.round((score / answers.length) * 100),
      answers: gradedAnswers,
      weakTopics,
      suggestions,
      savedAttemptId,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process quiz submission' }, { status: 500 });
  }
}
