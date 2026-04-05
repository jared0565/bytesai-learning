'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ExternalLink, CheckSquare, Square, Clock,
  BookOpen, PlayCircle, CheckCircle2, StickyNote, RotateCcw,
} from 'lucide-react';
import type { Course } from '@/lib/db';
import AlisonCertSuggestion from '@/components/ui/AlisonCertSuggestion';

// ── YouTube URL detection ─────────────────────────────────────────────────────
function detectYouTube(url: string | null): { type: 'video' | 'playlist'; id: string } | null {
  if (!url) return null;
  const videoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (videoMatch) return { type: 'video', id: videoMatch[1] };
  const playlistMatch = url.match(/youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch) return { type: 'playlist', id: playlistMatch[1] };
  // YouTube embed URLs that are already formatted
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return { type: 'video', id: embedMatch[1] };
  return null;
}

function buildEmbedUrl(yt: { type: 'video' | 'playlist'; id: string }): string {
  if (yt.type === 'playlist') {
    return `https://www.youtube.com/embed/videoseries?list=${yt.id}&rel=0&modestbranding=1`;
  }
  return `https://www.youtube.com/embed/${yt.id}?rel=0&modestbranding=1&color=white`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const PROVIDER_NAMES: Record<string, string> = {
  'prov-microsoft': 'Microsoft', 'prov-google': 'Google', 'prov-anthropic': 'Anthropic',
  'prov-nvidia': 'NVIDIA', 'prov-deeplearning-ai': 'DeepLearning.AI',
  'prov-hugging-face': 'Hugging Face', 'prov-aws': 'AWS', 'prov-ibm': 'IBM',
  'prov-stanford': 'Stanford', 'prov-harvard': 'Harvard',
  'prov-linux-foundation': 'Linux Foundation', 'prov-fast-ai': 'fast.ai',
  'prov-meta': 'Meta', 'prov-langchain': 'LangChain',
};
function providerName(id: string | null): string {
  if (!id) return 'Provider';
  return PROVIDER_NAMES[id] ?? id.replace('prov-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ENGAGE_THRESHOLD = 5 * 60; // 5 minutes in seconds

interface Props {
  course: Course;
  destination: string | null;
  alisonMatch: Course | null;
  userId: string;
}

export default function LearnEnvironment({ course, destination, alisonMatch, userId }: Props) {
  const outcomes: string[] = course.learning_outcomes_json
    ? JSON.parse(course.learning_outcomes_json)
    : [];

  const yt = detectYouTube(destination);
  const storageKey = `learn_checked_${course.slug}`;
  const shownKey = `learn_cert_shown_${course.slug}`;

  // ── Checklist state (persisted to localStorage) ───────────────────────────
  const [checked, setChecked] = useState<boolean[]>(() => {
    if (typeof window === 'undefined') return outcomes.map(() => false);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const arr = JSON.parse(stored) as boolean[];
        // Pad / trim to match current outcomes length
        const padded = outcomes.map((_, i) => arr[i] ?? false);
        return padded;
      }
    } catch { /* ignore */ }
    return outcomes.map(() => false);
  });

  // ── Notes state (localStorage) ────────────────────────────────────────────
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(`learn_notes_${course.slug}`) ?? '';
  });
  const [showNotes, setShowNotes] = useState(false);
  const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Timer state ───────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const [showCertSuggestion, setShowCertSuggestion] = useState(false);
  const hasTriggered = useRef(false);

  // ── Progress state ────────────────────────────────────────────────────────
  const [progressSaved, setProgressSaved] = useState(false);

  // ── Persist checklist ─────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(checked)); } catch { /* ignore */ }
  }, [checked, storageKey]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= ENGAGE_THRESHOLD && !hasTriggered.current) {
          hasTriggered.current = true;
          // Don't re-show if they've already seen it this session
          const alreadyShown = sessionStorage.getItem(shownKey);
          if (!alreadyShown && alisonMatch) {
            sessionStorage.setItem(shownKey, '1');
            setShowCertSuggestion(true);
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [shownKey, alisonMatch]);

  // ── Auto-mark as started after 2 minutes ─────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/learner/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            status: 'started',
            progressPercent: Math.round((checked.filter(Boolean).length / Math.max(outcomes.length, 1)) * 100),
          }),
        });
        setProgressSaved(true);
      } catch { /* silent */ }
    }, 2 * 60 * 1000); // 2 minutes
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]); // only run once on mount

  // ── Notes auto-save ───────────────────────────────────────────────────────
  const handleNotesChange = useCallback((val: string) => {
    setNotes(val);
    if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
    notesSaveTimer.current = setTimeout(() => {
      try { localStorage.setItem(`learn_notes_${course.slug}`, val); } catch { /* ignore */ }
    }, 800);
  }, [course.slug]);

  // ── Checklist toggle ──────────────────────────────────────────────────────
  function toggleCheck(i: number) {
    setChecked(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  const checkedCount = checked.filter(Boolean).length;
  const progressPct = outcomes.length > 0 ? Math.round((checkedCount / outcomes.length) * 100) : 0;
  const prov = providerName(course.provider_id);

  // ── Mark complete ─────────────────────────────────────────────────────────
  async function markComplete() {
    try {
      await fetch('/api/learner/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, status: 'completed', progressPercent: 100 }),
      });
      setProgressSaved(true);
      // Check all outcomes
      setChecked(outcomes.map(() => true));
    } catch { /* silent */ }
  }

  // ── Timer colour ──────────────────────────────────────────────────────────
  const timerColor = elapsed >= ENGAGE_THRESHOLD
    ? 'var(--emerald)'
    : elapsed >= 60
    ? 'var(--accent)'
    : 'var(--text-muted)';

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '0.75rem 0', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div className="container" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <Link
              href={`/courses/${course.slug}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}
            >
              <ArrowLeft size={14} /> Course details
            </Link>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{
              fontSize: '0.8125rem', fontWeight: 700,
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 280,
              color: 'var(--text-secondary)',
            }}>
              {course.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {/* Study timer */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.8125rem', fontWeight: 700, color: timerColor,
              padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)',
              background: elapsed >= ENGAGE_THRESHOLD ? 'rgba(16,185,129,0.1)' : 'var(--bg)',
              border: '1px solid var(--border)',
              transition: 'all 0.5s',
            }}>
              <Clock size={12} />
              {formatTime(elapsed)}
            </div>

            {progressSaved && (
              <span style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={12} /> Progress saved
              </span>
            )}

            {destination && (
              <a
                href={destination}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                Open on {prov} <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: 960 }}>

        {/* ── YouTube embed ────────────────────────────────────────────── */}
        {yt && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              position: 'relative', width: '100%', paddingBottom: '56.25%',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              background: '#000', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <iframe
                src={buildEmbedUrl(yt)}
                title={course.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%', border: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* ── Non-YouTube: Study guide banner ──────────────────────────── */}
        {!yt && destination && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'rgba(79,110,247,0.05)',
            border: '1px solid rgba(79,110,247,0.15)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap',
          }}>
            <BookOpen size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                Study guide mode
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                This course is hosted on <strong>{prov}</strong>. Use this study guide to track your progress — open the course alongside this tab and check off each learning outcome as you go.
              </p>
            </div>
            <a
              href={destination}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}
            >
              <PlayCircle size={13} /> Open course <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* ── Two-column layout: content + sidebar ─────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(240px, 300px)', gap: '1.5rem', alignItems: 'start' }}>

          {/* ── Left: course content ──────────────────────────────────── */}
          <div>
            <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.625rem)', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.3 }}>
              {course.title}
            </h1>
            {course.level && (
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge badge-level">{course.level}</span>
                <span className="badge badge-free">Free</span>
                {course.format_type && <span className="badge badge-level">{course.format_type}</span>}
              </div>
            )}

            {/* About */}
            {(course.snippet || course.long_description) && (
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.625rem' }}>About this course</h2>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  {course.long_description ?? course.snippet}
                </p>
              </div>
            )}

            {/* Learning outcomes — interactive checklist */}
            {outcomes.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>
                    What you&apos;ll learn
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {checkedCount}/{outcomes.length} covered
                    </span>
                    {checkedCount > 0 && (
                      <button
                        onClick={() => setChecked(outcomes.map(() => false))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0' }}
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {outcomes.length > 1 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${progressPct}%`,
                        background: progressPct === 100
                          ? 'var(--emerald)'
                          : 'linear-gradient(90deg, var(--accent), var(--teal))',
                        borderRadius: 3, transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <p style={{ fontSize: '0.72rem', color: progressPct === 100 ? 'var(--emerald)' : 'var(--text-muted)', marginTop: '0.375rem', fontWeight: progressPct === 100 ? 700 : 400 }}>
                      {progressPct === 100 ? '✓ All outcomes covered!' : `${progressPct}% of outcomes covered`}
                    </p>
                  </div>
                )}

                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
                  {outcomes.map((outcome, i) => (
                    <li key={i}>
                      <button
                        onClick={() => toggleCheck(i)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                          width: '100%', textAlign: 'left', border: 'none',
                          cursor: 'pointer', padding: '0.625rem 0.75rem',
                          borderRadius: 'var(--radius)',
                          background: checked[i] ? 'rgba(16,185,129,0.06)' : 'transparent',
                          transition: 'background 0.15s',
                        } as React.CSSProperties}
                      >
                        {checked[i]
                          ? <CheckSquare size={16} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 2 }} />
                          : <Square size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                        }
                        <span style={{
                          fontSize: '0.9rem', color: checked[i] ? 'var(--text-muted)' : 'var(--text-secondary)',
                          lineHeight: 1.6,
                          textDecoration: checked[i] ? 'line-through' : 'none',
                          transition: 'all 0.15s',
                        }}>
                          {outcome}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Who it's for */}
            {course.who_its_for && (
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.625rem' }}>Who this is for</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  {course.who_its_for}
                </p>
              </div>
            )}

            {/* Notes area */}
            <div style={{ marginBottom: '2rem' }}>
              <button
                onClick={() => setShowNotes(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  marginBottom: showNotes ? '0.75rem' : 0,
                }}
              >
                <StickyNote size={15} />
                {showNotes ? 'Hide notes' : 'My study notes'}
                {notes && !showNotes && (
                  <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-full)', padding: '0 0.375rem', fontWeight: 800 }}>
                    •
                  </span>
                )}
              </button>
              {showNotes && (
                <textarea
                  value={notes}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder="Jot down key ideas, questions, or things to revisit…"
                  rows={6}
                  style={{
                    width: '100%', padding: '0.875rem',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', resize: 'vertical',
                    fontSize: '0.875rem', lineHeight: 1.65,
                    color: 'var(--text-primary)', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              )}
              {showNotes && notes && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Auto-saved to your browser
                </p>
              )}
            </div>
          </div>

          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <div style={{ position: 'sticky', top: 72 }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              {/* Progress ring summary */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 0.75rem' }}>
                  <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke={progressPct === 100 ? 'var(--emerald)' : 'var(--accent)'}
                      strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.0625rem', fontWeight: 800,
                    color: progressPct === 100 ? 'var(--emerald)' : 'var(--text-primary)',
                  }}>
                    {progressPct}%
                  </div>
                </div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {progressPct === 100
                    ? '🎉 All done!'
                    : checkedCount === 0
                    ? 'Study checklist'
                    : `${checkedCount} of ${outcomes.length} covered`}
                </p>
              </div>

              {/* Timer */}
              <div style={{
                marginBottom: '1.25rem', padding: '0.625rem',
                background: 'var(--bg)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                  Study time
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: timerColor, fontFamily: 'monospace' }}>
                  {formatTime(elapsed)}
                </p>
                {elapsed < ENGAGE_THRESHOLD && (
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {Math.ceil((ENGAGE_THRESHOLD - elapsed) / 60)} min to engagement milestone
                  </p>
                )}
                {elapsed >= ENGAGE_THRESHOLD && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--emerald)', marginTop: '0.125rem', fontWeight: 600 }}>
                    ✓ Highly engaged learner
                  </p>
                )}
              </div>

              {/* Action buttons */}
              {destination && (
                <a
                  href={destination}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  <PlayCircle size={15} /> Open course <ExternalLink size={13} />
                </a>
              )}

              {progressPct < 100 ? (
                <button
                  onClick={markComplete}
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}
                >
                  <CheckCircle2 size={14} /> Mark as completed
                </button>
              ) : (
                <div style={{ padding: '0.625rem', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--emerald)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                    <CheckCircle2 size={14} /> Course completed!
                  </p>
                </div>
              )}

              {/* Quick facts */}
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {course.level && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Level</span>
                    <span style={{ fontWeight: 600 }}>{course.level}</span>
                  </div>
                )}
                {course.duration_text && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Duration</span>
                    <span style={{ fontWeight: 600 }}>{course.duration_text}</span>
                  </div>
                )}
                {course.format_type && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Format</span>
                    <span style={{ fontWeight: 600 }}>{course.format_type}</span>
                  </div>
                )}
                {course.provider_id && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Provider</span>
                    <span style={{ fontWeight: 600 }}>{prov}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alison Certification Suggestion ─────────────────────────────── */}
      {alisonMatch && (
        <AlisonCertSuggestion
          course={alisonMatch}
          studiedTitle={course.title}
          visible={showCertSuggestion}
          onDismiss={() => setShowCertSuggestion(false)}
        />
      )}
    </>
  );
}
