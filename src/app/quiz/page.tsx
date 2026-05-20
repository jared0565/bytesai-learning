'use client';

import Link from 'next/link';
import { ArrowRight, Brain, Zap, Trophy } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';


const LEVELS = [
  {
    slug: 'beginner',
    label: 'Beginner',
    description: 'AI basics, history, and fundamental concepts. Perfect if you are just starting out.',
    color: '#22c55e',
    bgSoft: 'rgba(34,197,94,0.08)',
    icon: <Brain size={28} color="#22c55e" />,
  },
  {
    slug: 'intermediate',
    label: 'Intermediate',
    description: 'LLMs, prompt engineering, machine learning techniques, and AI agents.',
    color: '#f59e0b',
    bgSoft: 'rgba(245,158,11,0.08)',
    icon: <Zap size={28} color="#f59e0b" />,
  },
  {
    slug: 'advanced',
    label: 'Advanced',
    description: 'Alignment, adversarial robustness, mechanistic interpretability, and cutting-edge research.',
    color: '#ef4444',
    bgSoft: 'rgba(239,68,68,0.08)',
    icon: <Trophy size={28} color="#ef4444" />,
  },
];

export default function QuizPage() {
  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
            AI Knowledge Quiz
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            5 quick questions to test your understanding. Pick a level and see how you score. We will recommend courses based on your results.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '1rem', maxWidth: 640, margin: '0 auto' }}>
          {LEVELS.map(level => (
            <Link
              key={level.slug}
              href={`/quiz/${level.slug}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '1.25rem',
                padding: '1.5rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--card)',
                textDecoration: 'none', color: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = level.color; (e.currentTarget as HTMLElement).style.background = level.bgSoft; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--card)'; }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: level.bgSoft, border: `1px solid ${level.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {level.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{level.label}</span>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    padding: '2px 8px', borderRadius: 99,
                    background: level.bgSoft, color: level.color, border: `1px solid ${level.color}40`,
                  }}>
                    {level.slug}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {level.description}
                </p>
              </div>
              <ArrowRight size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            </Link>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/quiz/leaderboard" style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            View Leaderboard →
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
