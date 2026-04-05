'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, CheckCircle2, Loader2, MessageSquarePlus } from 'lucide-react';

type Sentiment = 'positive' | 'neutral' | 'negative';

const SENTIMENTS: { value: Sentiment; emoji: string; label: string; color: string }[] = [
  { value: 'positive', emoji: '😊', label: 'Great',    color: 'var(--emerald)' },
  { value: 'neutral',  emoji: '😐', label: 'OK',       color: 'var(--amber)'   },
  { value: 'negative', emoji: '😞', label: 'Not good', color: 'var(--rose)'    },
];

export default function FeedbackTab() {
  const [visible, setVisible]       = useState(false);   // tab appears after 15s
  const [open, setOpen]             = useState(false);   // panel open
  const [sentiment, setSentiment]   = useState<Sentiment | null>(null);
  const [message, setMessage]       = useState('');
  const [email, setEmail]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Layer 1: Engagement gate — show tab after 15 seconds
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 15_000);
    return () => clearTimeout(t);
  }, []);

  // Close panel on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Capture current page URL
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sentiment && message.trim().length < 3) {
      setError('Please choose a sentiment or write at least a few words.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'general',
          sentiment,
          message: message.trim() || undefined,
          email: email.trim() || undefined,
          page_url: pageUrl,
          website: '', // honeypot — always empty for real users
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubmitted(true);
      } else {
        setError(data.error ?? 'Something went wrong — please try again.');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    // Reset form after panel closes
    setTimeout(() => {
      if (!open) {
        setSentiment(null);
        setMessage('');
        setEmail('');
        setError('');
        setSubmitted(false);
      }
    }, 300);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop when panel open */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 6990,
            background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        style={{
          position: 'fixed', right: 40, top: '50%', zIndex: 7000,
          transform: open
            ? 'translateY(-50%) translateX(0)'
            : 'translateY(-50%) translateX(calc(100% + 48px))',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          width: 'min(320px, calc(100vw - 2rem)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--accent), var(--teal))' }} />

        <div style={{ padding: '1.125rem 1.25rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p style={{ fontWeight: 800, fontSize: '0.9375rem' }}>Share your feedback</p>
            <button
              onClick={handleClose}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: 'var(--radius)' }}
            >
              <X size={16} />
            </button>
          </div>

          {submitted ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem' }}>
              <CheckCircle2 size={36} color="var(--emerald)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
              <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.375rem' }}>Thank you! 🎉</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Your feedback helps us make BytesAI Learning better for everyone.
              </p>
              <button
                onClick={handleClose}
                className="btn btn-outline btn-sm"
                style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                Close
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit}>
              {/* Hidden honeypot — Layer 2 */}
              <input
                name="website"
                type="text"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
                style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
              />

              {/* Sentiment selector */}
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>
                How&apos;s your experience?
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {SENTIMENTS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSentiment(prev => prev === s.value ? null : s.value)}
                    style={{
                      flex: 1, padding: '0.5rem 0.25rem',
                      border: `2px solid ${sentiment === s.value ? s.color : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: sentiment === s.value ? `${s.color}15` : 'var(--bg)',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                    }}
                  >
                    <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>{s.emoji}</span>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700,
                      color: sentiment === s.value ? s.color : 'var(--text-muted)',
                    }}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Message */}
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
                  Tell us more <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What could we do better? What's working well?"
                  rows={3}
                  maxLength={1000}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', resize: 'none',
                    fontSize: '0.875rem', lineHeight: 1.55,
                    color: 'var(--text-primary)', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                {message.length > 0 && (
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.2rem' }}>
                    {message.length}/1000
                  </p>
                )}
              </div>

              {/* Email */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
                  Email <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional — for follow-up)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', padding: '0.5rem 0.75rem',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
                    color: 'var(--text-primary)', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <p style={{ fontSize: '0.78rem', color: 'var(--rose)', marginBottom: '0.625rem', lineHeight: 1.5 }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {submitting
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
                  : <><Send size={14} /> Send feedback</>
                }
              </button>

              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.625rem', lineHeight: 1.4 }}>
                Your feedback is private and only seen by the BytesAI team.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Vertical tab trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Open feedback panel"
        aria-expanded={open}
        style={{
          position: 'fixed', right: 0, top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 7001,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '0.375rem', padding: '0.75rem 0.375rem',
          background: open ? 'var(--accent)' : 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRight: 'none',
          borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
          cursor: 'pointer',
          boxShadow: '-2px 0 12px rgba(0,0,0,0.08)',
          transition: 'background 0.2s',
        }}
      >
        <MessageSquarePlus
          size={16}
          color={open ? 'white' : 'var(--accent)'}
          style={{ transition: 'color 0.2s' }}
        />
        <span style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: open ? 'white' : 'var(--text-muted)',
          userSelect: 'none',
          transition: 'color 0.2s',
        }}>
          FEEDBACK
        </span>
      </button>
    </>
  );
}
