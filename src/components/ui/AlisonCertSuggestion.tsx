'use client';

import { useState } from 'react';
import { X, Award, ChevronUp, ExternalLink, CheckCircle2 } from 'lucide-react';
import type { Course } from '@/lib/db';

interface Props {
  course: Course;          // the matching Alison course
  studiedTitle: string;    // title of the course they're currently studying
  visible: boolean;
  onDismiss: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'AI Foundations': '🤖',
  'LLMs / Generative AI': '✨',
  'AI Agents': '🤝',
  'Prompt Engineering': '💬',
  'Governance / Responsible AI': '⚖️',
  'Data / ML': '📊',
  'Programming Foundations': '💻',
};

export default function AlisonCertSuggestion({ course, studiedTitle, visible, onDismiss }: Props) {
  const [minimized, setMinimized] = useState(false);

  if (!visible) return null;

  const destination = course.affiliate_url ?? course.destination_url ?? course.official_link ?? '#';
  const catIcon = CATEGORY_ICONS[course.category ?? ''] ?? '🎓';
  const certType = course.certification_type ?? 'Certificate';
  const level = course.level ?? 'All levels';

  // ── Minimised pill ─────────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div
        role="complementary"
        aria-label="Certificate suggestion (minimised)"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          zIndex: 8000,
          animation: 'slideUpIn 0.3s ease',
        }}
      >
        <button
          onClick={() => setMinimized(false)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'linear-gradient(135deg, #f59e0b, #fb923c)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-full)',
            cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700,
            boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(245,158,11,0.5)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(245,158,11,0.4)';
          }}
        >
          <Award size={15} />
          Free certificate available
          <ChevronUp size={14} />
        </button>
      </div>
    );
  }

  // ── Full suggestion card ───────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes slideUpIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        role="complementary"
        aria-label="Certificate suggestion"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          zIndex: 8000, width: 'min(380px, calc(100vw - 2rem))',
          animation: 'slideUpIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(245,158,11,0.1)',
          overflow: 'hidden',
        }}>
          {/* Accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #f59e0b, #fb923c)' }} />

          <div style={{ padding: '1.125rem 1.25rem' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b, #fb923c)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Award size={16} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
                    5 MINUTES IN 🎉
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    You&apos;re clearly interested in this topic
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                <button
                  onClick={() => setMinimized(true)}
                  aria-label="Minimise"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: '0.25rem',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem',
                  }}
                >
                  — Later
                </button>
                <button
                  onClick={onDismiss}
                  aria-label="Close"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: '0.25rem',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Message */}
            <p style={{ fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Want a <strong style={{ color: 'var(--text-primary)' }}>free certificate</strong> for completing
              {' '}<em>{studiedTitle.length > 50 ? studiedTitle.slice(0, 47) + '…' : studiedTitle}</em>?
              {' '}Alison offers a very similar course you can do for free and earn a verifiable certificate.
            </p>

            {/* Course card */}
            <div style={{
              padding: '0.875rem',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(251,146,60,0.04))',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '0.875rem',
            }}>
              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0, lineHeight: 1 }}>{catIcon}</span>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{
                    fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.35, marginBottom: '0.375rem',
                    color: 'var(--text-primary)',
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>
                    {course.title}
                  </p>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-full)', background: '#f59e0b22', color: '#f59e0b',
                    }}>
                      Alison
                    </span>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-full)', background: 'rgba(16,185,129,0.12)', color: 'var(--emerald)',
                    }}>
                      Free
                    </span>
                    {level && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{level}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Certificate perks */}
              <div style={{ marginTop: '0.625rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {[
                  `${certType} upon completion`,
                  'Free to learn — certificate optional',
                  'Self-paced, no deadline',
                ].map((perk, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <CheckCircle2 size={11} color="var(--emerald)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href={destination}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{
                  flex: 1, justifyContent: 'center', display: 'flex',
                  alignItems: 'center', gap: '0.375rem',
                  background: 'linear-gradient(135deg, #f59e0b, #fb923c)',
                  border: 'none',
                }}
              >
                <Award size={13} /> View Alison course <ExternalLink size={11} />
              </a>
              <button
                onClick={() => setMinimized(true)}
                className="btn btn-outline btn-sm"
                style={{ flexShrink: 0 }}
              >
                Not now
              </button>
            </div>

            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.625rem', lineHeight: 1.4 }}>
              This is a friendly suggestion — no obligation. We may earn a small commission if you purchase a certificate.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
