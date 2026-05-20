import { NextRequest, NextResponse } from 'next/server';
import { getDB, getQuizQuestions } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get('difficulty');

  if (!difficulty || !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty. Use beginner, intermediate, or advanced.' }, { status: 400 });
  }

  try {
    const db = await getDB();
    const questions = await getQuizQuestions(db, difficulty, 5);
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: 'Failed to load quiz questions' }, { status: 500 });
  }
}
