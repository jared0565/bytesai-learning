'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X, RotateCcw, BookOpen, Trophy } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import SharePanel from '@/components/ui/SharePanel';
import type { Course } from '@/lib/db';

interface GradedAnswer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  correctIndex: number | null;
  explanation: string | null;
}

interface WeakTopic {
  tag: string;
  count: number;
}

interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  answers: GradedAnswer[];
  weakTopics: WeakTopic[];
  suggestions: Course[];
  savedAttemptId: string | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

function ResultsContent() {
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const raw = sessionStorage.getItem('quizResult');
    if (!raw) {
      router.push('/quiz');
      return;
    }
    try {
      setResult(JSON.parse(raw));
    } catch {
      router.push('/quiz');
    }
  }, [router]);

  if (!result) return null;

  const shareText = `I scored ${result.score}/${result.total} on the BytesAI AI Knowledge Quiz — can you beat me?`;
  const shareUrl = `https://learn.bytesai.uk/quiz`;
  const ogImageUrl = `https://learn.bytesai.uk/api/og?type=quiz&score=${result.score}&total=${result.total}&difficulty=beginner`;

  const toggleExplanation = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Score card */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '2rem',
            textAlign: 'center', marginBottom: '2rem',
          }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              {result.score}<span style={{ fontSize: '1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>/{result.total}</span>
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {result.percentage}%
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {result.percentage >= 80
                ? 'Excellent! You have a strong grasp of these concepts.'
                : result.percentage >= 60
                  ? 'Good effort — there is room to grow in a few areas.'
                  : 'Keep learning! We have recommended some courses below.'}
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/quiz" style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem',
                textDecoration: 'none',
              }}>
                <RotateCcw size={14} /> Try another
              </Link>
              <Link href="/quiz/leaderboard" style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem',
                textDecoration: 'none',
              }}>
                <Trophy size={14} /> Leaderboard
              </Link>
            </div>
          </div>

          {/* Share */}
          <div style={{ marginBottom: '2rem' }}>
            <SharePanel url={shareUrl} title={shareText} compact labeled />
          </div>

          {/* Weak topics */}
          {result.weakTopics.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                Topics to review
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {result.weakTopics.map(t => (
                  <span key={t.tag} style={{
                    fontSize: '0.8rem', fontWeight: 600,
                    padding: '0.375rem 0.75rem', borderRadius: 99,
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    border: '1px solid var(--accent)20',
                    textTransform: 'capitalize',
                  }}>
                    {t.tag.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Answer review */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
              Review your answers
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {result.answers.map((ans, i) => {
                const isOpen = expanded.has(ans.questionId);
                return (
                  <div key={ans.questionId} style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => toggleExplanation(ans.questionId)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        width: '100%', padding: '1rem', textAlign: 'left',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.9rem', color: 'var(--text)',
                      }}
                    >
                      {ans.correct ? (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={13} color="white" />
                        </div>
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X size={13} color="white" />
                        </div>
                      )}
                      <span style={{ fontWeight: 600 }}>Question {i + 1}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: ans.correct ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                        {ans.correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </button>
                    {isOpen && ans.explanation && (
                      <div style={{ padding: '0 1rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {ans.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Course suggestions */}
          {result.suggestions.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <BookOpen size={14} /> Recommended courses
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {result.suggestions.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function QuizResultsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}>
      <ResultsContent />
    </Suspense>
  );
}
