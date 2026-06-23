'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X, RotateCcw, BookOpen, Trophy, Zap, Share2, UserPlus, Sparkles, AlertTriangle, X as XIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import SharePanel from '@/components/ui/SharePanel';
import { getCategoryBySlug } from '@/lib/ranking';
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
  difficulty: string;
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

function UnsavedDataModal({ topic, onClose, onContinue, topicUrl }: { topic: string; onClose: () => void; onContinue: () => void; topicUrl: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={onClose}>
      <div style={{
        position: 'relative',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '1.5rem',
        maxWidth: 420, width: '100%',
        boxShadow: 'var(--shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--amber-soft)', border: '1.5px solid var(--amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={18} color="var(--amber)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Your result is not saved</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Create a free account to save this score, appear on the leaderboard, and get personalised course recommendations for <strong style={{ color: 'var(--text)' }}>{topic}</strong>.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link
            href="/auth/register"
            onClick={() => { sessionStorage.setItem('quizPendingUrl', topicUrl); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.625rem', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'var(--accent)',
              color: 'white', fontWeight: 700, fontSize: '0.875rem',
              textDecoration: 'none', transition: 'all 0.12s',
              textAlign: 'center',
            }}
          >
            <UserPlus size={16} /> Create free account
          </Link>
          <Link
            href="/auth/login"
            onClick={() => { sessionStorage.setItem('quizPendingUrl', topicUrl); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.625rem', borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem',
              textDecoration: 'none', textAlign: 'center',
            }}
          >
            Sign in
          </Link>
          <button
            onClick={onContinue}
            style={{
              padding: '0.625rem', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'none',
              color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem',
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            Continue without saving
          </button>
        </div>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            padding: '0.25rem', borderRadius: 'var(--radius-sm)',
            border: 'none', background: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}
          aria-label="Close"
        >
          <XIcon size={18} />
        </button>
      </div>
    </div>
  );
}

function ResultsContent() {
  const router = useRouter();
  const [result] = useState<QuizResult | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem('quizResult');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as QuizResult;
    } catch {
      return null;
    }
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!result) {
      router.push('/quiz');
    }
  }, [result, router]);

  const buildTopicUrl = (topic: string) => {
    const cat = getCategoryBySlug(topic);
    if (cat) {
      return `/courses?category=${encodeURIComponent(cat.db)}#course-results`;
    }
    return `/courses?q=${encodeURIComponent(topic.replace(/-/g, ' '))}#course-results`;
  };

  const handleTopicClick = (topic: string) => {
    if (!result) return;
    if (result.savedAttemptId) {
      router.push(buildTopicUrl(topic));
    } else {
      setPendingTopic(topic);
    }
  };

  if (!result) return null;

  const shareText = `I scored ${result.score}/${result.total} on the BytesAI AI Knowledge Quiz — can you beat me?`;
  const shareUrl = `https://learn.bytesai.uk/quiz`;

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

            {/* Three primary actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {/* Same level */}
              <Link
                href={`/quiz/${result.difficulty}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontWeight: 700, fontSize: '0.875rem',
                  textDecoration: 'none', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
              >
                <RotateCcw size={16} />
                Same level
              </Link>

              {/* Next level */}
              {result.difficulty !== 'advanced' ? (
                <Link
                  href={`/quiz/${result.difficulty === 'beginner' ? 'intermediate' : 'advanced'}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--accent)', background: 'var(--accent)',
                    color: 'white', fontWeight: 700, fontSize: '0.875rem',
                    textDecoration: 'none', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  <Zap size={16} />
                  Next level
                </Link>
              ) : (
                <Link
                  href="/quiz"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--accent)', background: 'var(--accent)',
                    color: 'white', fontWeight: 700, fontSize: '0.875rem',
                    textDecoration: 'none', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  <RotateCcw size={16} />
                  Start over
                </Link>
              )}

              {/* Share */}
              <button
                onClick={() => {
                  const el = document.getElementById('quiz-share-panel');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontWeight: 700, fontSize: '0.875rem',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1877f2'; (e.currentTarget as HTMLElement).style.background = 'rgba(24,119,242,0.08)'; (e.currentTarget as HTMLElement).style.color = '#1877f2'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
              >
                <Share2 size={16} />
                Share result
              </button>
            </div>
          </div>

          {/* Guest CTA — save score / create account */}
          {!result.savedAttemptId && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(79,110,247,0.08), rgba(20,184,166,0.06))',
              border: '1.5px solid var(--accent)',
              borderRadius: 'var(--radius-md)', padding: '1.5rem',
              marginBottom: '2rem', textAlign: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Sparkles size={18} color="var(--accent)" />
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>Great score! Save it?</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem', maxWidth: 420, margin: '0 auto 1rem' }}>
                Create a free account to save this score to the leaderboard, track your progress across quizzes, and get personalised course recommendations.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/auth/register"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-sm)',
                    border: 'none', background: 'var(--accent)',
                    color: 'white', fontWeight: 700, fontSize: '0.875rem',
                    textDecoration: 'none', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  <UserPlus size={16} /> Create free account
                </Link>
                <Link
                  href="/auth/login"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}

          {/* Share */}
          <div id="quiz-share-panel" style={{ marginBottom: '2rem', scrollMarginTop: '6rem' }}>
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
                  <button
                    key={t.tag}
                    onClick={() => handleTopicClick(t.tag)}
                    style={{
                      fontSize: '0.8rem', fontWeight: 600,
                      padding: '0.375rem 0.75rem', borderRadius: 99,
                      background: 'var(--accent-soft)', color: 'var(--accent)',
                      border: '1px solid var(--accent)30',
                      textTransform: 'capitalize', cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                  >
                    {t.tag.replace(/-/g, ' ')}
                    {!result.savedAttemptId && <span style={{ marginLeft: '0.375rem', opacity: 0.7 }}>*</span>}
                  </button>
                ))}
              </div>
              {!result.savedAttemptId && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>* Sign in to save and get personalised courses</p>}
            </div>
          )}

          {/* Unsaved data modal */}
          {pendingTopic && (
            <UnsavedDataModal
              topic={pendingTopic.replace(/-/g, ' ')}
              topicUrl={buildTopicUrl(pendingTopic)}
              onClose={() => setPendingTopic(null)}
              onContinue={() => {
                router.push(buildTopicUrl(pendingTopic));
                setPendingTopic(null);
              }}
            />
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
