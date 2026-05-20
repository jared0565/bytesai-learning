import { NextRequest, NextResponse } from 'next/server';
import { getDB, getQuizLeaderboard } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get('difficulty');

  if (!difficulty || !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
  }

  try {
    const db = await getDB();
    const entries = await getQuizLeaderboard(db, 'quiz-ai-knowledge', difficulty, 20);
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
