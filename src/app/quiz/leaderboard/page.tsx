'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Medal, ArrowLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface LeaderboardEntry {
  id: string;
  display_name: string | null;
  score: number;
  total: number;
  completed_at: string;
}

const TABS = [
  { slug: 'beginner', label: 'Beginner', color: '#22c55e' },
  { slug: 'intermediate', label: 'Intermediate', color: '#f59e0b' },
  { slug: 'advanced', label: 'Advanced', color: '#ef4444' },
];

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const initialDifficulty = searchParams.get('difficulty') ?? 'beginner';
  const [active, setActive] = useState(initialDifficulty);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (difficulty: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz/leaderboard?difficulty=${difficulty}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (TABS.some(t => t.slug === active)) {
      load(active);
    }
  }, [active, load]);

  const rankColor = (i: number) => {
    if (i === 0) return '#f59e0b';
    if (i === 1) return '#94a3b8';
    if (i === 2) return '#b45309';
    return 'var(--text-muted)';
  };

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/quiz" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
              <ArrowLeft size={14} /> Back to quiz
            </Link>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Leaderboard</h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Top scores per difficulty level.</p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {TABS.map(tab => (
              <button
                key={tab.slug}
                onClick={() => setActive(tab.slug)}
                style={{
                  flex: 1, padding: '0.625rem', borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${active === tab.slug ? tab.color : 'var(--border)'}`,
                  background: active === tab.slug ? `${tab.color}12` : 'var(--bg)',
                  color: active === tab.slug ? tab.color : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>}

          {!loading && entries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Trophy size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
              <p>No entries yet. Be the first to take the quiz!</p>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {entries.map((entry, i) => (
                <div key={entry.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--card)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.85rem', color: rankColor(i),
                    border: i < 3 ? `2px solid ${rankColor(i)}` : '2px solid var(--border)',
                  }}>
                    {i < 3 ? <Medal size={16} color={rankColor(i)} /> : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {entry.display_name ?? 'Anonymous'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(entry.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
                    {entry.score}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/{entry.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
