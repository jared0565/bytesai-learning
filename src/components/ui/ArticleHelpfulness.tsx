'use client';

import { useState, useEffect, useRef } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  slug: string;
  pageUrl?: string;
}

export default function ArticleHelpfulness({ slug, pageUrl }: Props) {
  const [visible, setVisible]       = useState(false);  // appears when scrolled to bottom
  const [voted, setVoted]           = useState<'positive' | 'negative' | null>(null);
  const [showMessage, setShowMessage] = useState(false); // expand textarea on thumbs down
  const [message, setMessage]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Layer 1: Engagement gate — only show after scrolling to this element
  useEffect(() => {
    const storageKey = `art_fb_${slug}`;
    if (sessionStorage.getItem(storageKey)) {
      // Already voted this session — don't show again
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [slug]);

  async function submit(sentiment: 'positive' | 'negative', msg?: string) {
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'article',
          slug,
          sentiment,
          message: msg?.trim() || undefined,
          page_url: pageUrl ?? (typeof window !== 'undefined' ? window.location.href : ''),
          website: '', // honeypot
        }),
      });
      sessionStorage.setItem(`art_fb_${slug}`, '1'); // dedup for this session
      setSubmitted(true);
    } catch {
      // silent fail — don't break the reading experience
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleThumbsUp() {
    setVoted('positive');
    submit('positive');
  }

  function handleThumbsDown() {
    setVoted('negative');
    setShowMessage(true);
  }

  function handleNegativeSubmit() {
    submit('negative', message);
  }

  return (
    <div
      ref={containerRef}
      style={{
        padding: '1.25rem 1.5rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      {submitted ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <CheckCircle2 size={16} color="var(--emerald)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {voted === 'positive'
              ? 'Glad it was helpful — thank you!'
              : 'Thanks for the feedback — we\'ll use it to improve.'}
          </p>
        </div>
      ) : showMessage ? (
        /* ── Expanded: negative feedback detail ── */
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.625rem' }}>
            What could be improved?
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Missing context, hard to read, outdated info…"
            rows={3}
            maxLength={500}
            autoFocus
            style={{
              width: '100%', padding: '0.625rem 0.75rem',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', resize: 'none',
              fontSize: '0.875rem', lineHeight: 1.55,
              color: 'var(--text-primary)', fontFamily: 'inherit',
              boxSizing: 'border-box', marginBottom: '0.625rem',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleNegativeSubmit}
              disabled={submitting}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              {submitting
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : null}
              {submitting ? 'Sending…' : 'Send'}
            </button>
            <button
              onClick={() => submit('negative')}
              disabled={submitting}
              className="btn btn-outline btn-sm"
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        /* ── Default: thumbs up / down ── */
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Was this article helpful?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleThumbsUp}
              disabled={submitting || voted !== null}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.4rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700,
                border: `1.5px solid ${voted === 'positive' ? 'var(--emerald)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-full)', cursor: 'pointer',
                background: voted === 'positive' ? 'rgba(16,185,129,0.1)' : 'var(--bg)',
                color: voted === 'positive' ? 'var(--emerald)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!voted) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--emerald)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--emerald)';
                }
              }}
              onMouseLeave={e => {
                if (!voted) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <ThumbsUp size={14} /> Yes
            </button>
            <button
              onClick={handleThumbsDown}
              disabled={submitting || voted !== null}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.4rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700,
                border: `1.5px solid ${voted === 'negative' ? 'var(--rose)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-full)', cursor: 'pointer',
                background: voted === 'negative' ? 'rgba(239,68,68,0.08)' : 'var(--bg)',
                color: voted === 'negative' ? 'var(--rose)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!voted) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--rose)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--rose)';
                }
              }}
              onMouseLeave={e => {
                if (!voted) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <ThumbsDown size={14} /> Could be better
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
