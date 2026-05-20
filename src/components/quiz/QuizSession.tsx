'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  difficulty: string;
}

interface QuizSessionProps {
  questions: Question[];
  difficulty: string;
}

export default function QuizSession({ questions, difficulty }: QuizSessionProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = selected.get(currentQuestion.id);
  const total = questions.length;
  const isLast = currentIndex === total - 1;

  const handleSelect = useCallback((index: number) => {
    setSelected(prev => new Map(prev).set(currentQuestion.id, index));
  }, [currentQuestion.id]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [isLast]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const answers = questions.map(q => ({
      questionId: q.id,
      selectedIndex: selected.get(q.id) ?? -1,
    }));

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty, answers }),
      });

      if (!res.ok) throw new Error('Submit failed');
      const data = await res.json();

      // Pass result data via query params (lightweight) or sessionStorage
      sessionStorage.setItem('quizResult', JSON.stringify(data));
      router.push('/quiz/results');
    } catch {
      setSubmitting(false);
      alert('Something went wrong submitting your answers. Please try again.');
    }
  };

  const progress = ((currentIndex + (currentAnswer !== undefined ? 1 : 0)) / total) * 100;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingTop: '1.5rem' }}>
      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          height: 6, borderRadius: 3, background: 'var(--border)',
          overflow: 'hidden', marginBottom: '0.5rem',
        }}>
          <div style={{
            height: '100%', width: `${progress}%`, background: 'var(--accent)',
            borderRadius: 3, transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <span>Question {currentIndex + 1} of {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Question */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '1.75rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.5, marginBottom: '1.25rem' }}>
          {currentQuestion.question_text}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = currentAnswer === idx;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem 1rem', borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--accent-soft)' : 'var(--bg)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  fontSize: '0.95rem', color: 'var(--text)',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isSelected && <Check size={13} color="white" />}
                </div>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          style={{
            padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: currentIndex === 0 ? 0.5 : 1,
          }}
        >
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={currentAnswer === undefined || submitting}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.5rem', borderRadius: 'var(--radius-sm)',
            border: 'none', background: 'var(--accent)',
            color: 'white', fontWeight: 700, fontSize: '0.875rem',
            cursor: currentAnswer === undefined || submitting ? 'not-allowed' : 'pointer',
            opacity: currentAnswer === undefined || submitting ? 0.6 : 1,
          }}
        >
          {submitting ? (
            <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
          ) : isLast ? (
            <>Submit <Check size={16} /></>
          ) : (
            <>Next <ChevronRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}
