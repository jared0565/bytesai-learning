import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import QuizSession from '@/components/quiz/QuizSession';
import { getDB, getQuizQuestions } from '@/lib/db';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { difficulty } = await params;
  const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  return {
    title: `${label} Quiz — BytesAI Learning`,
    description: `Test your AI knowledge with 5 ${difficulty} questions.`,
  };
}

interface PageProps {
  params: Promise<{ difficulty: string }>;
}

export default async function QuizDifficultyPage({ params }: PageProps) {
  const { difficulty } = await params;

  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    notFound();
  }

  const db = await getDB();
  const questions = await getQuizQuestions(db, difficulty, 5);

  if (questions.length === 0) {
    return (
      <>
        <Header />
        <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Quiz coming soon</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Questions for this level are not yet available. Check back soon!</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
        <QuizSession questions={questions} difficulty={difficulty} />
      </main>
      <Footer />
    </>
  );
}
