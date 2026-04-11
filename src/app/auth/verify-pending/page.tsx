'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, AlertCircle, BookOpen, RefreshCw } from 'lucide-react';

export default function VerifyPendingPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);

  async function handleResend() {
    setError('');
    setResending(true);
    try {
      // First try with session cookie only
      const body = needsEmail ? JSON.stringify({ email: emailInput }) : '{}';
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = await res.json() as { ok?: boolean; error?: string };

      if (res.status === 400 && data.error?.includes('enter your email')) {
        // Session lost — prompt for email
        setNeedsEmail(true);
        setError('');
      } else if (data.ok) {
        setResent(true);
        setNeedsEmail(false);
      } else {
        setError(data.error ?? 'Failed to resend. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: 800, fontSize: '1.125rem', textDecoration: 'none' }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4f6ef7, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} color="white" strokeWidth={2.5} />
          </span>
          BytesAI Learning
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #4f6ef7, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Mail size={28} color="white" />
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>Check your email</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              We&apos;ve sent a verification link to your email address.
              Please click the link to activate your account and access your dashboard.
            </p>

            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.875rem 1rem', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#fca5a5', textAlign: 'left' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            {resent ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem 1rem', background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#86efac' }}>
                <CheckCircle2 size={16} />
                Verification email sent! Check your inbox (and spam folder).
              </div>
            ) : (
              <>
                {needsEmail && (
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="input"
                    style={{ width: '100%', marginBottom: '0.75rem', textAlign: 'left' }}
                    onKeyDown={e => { if (e.key === 'Enter') handleResend(); }}
                    autoFocus
                  />
                )}
                <button
                  onClick={handleResend}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', height: 48, marginBottom: '1rem' }}
                  disabled={resending || (needsEmail && !emailInput.trim())}
                >
                  {resending
                    ? <><Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> Sending…</>
                    : <><RefreshCw size={18} /> Resend verification email</>}
                </button>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                <strong>Didn&apos;t receive it?</strong> Check your spam or junk folder. The link expires in 24 hours.
              </p>
            </div>

            <p style={{ marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Wrong email?{' '}
              <Link href="/api/auth/logout" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign out</Link>
              {' '}and register again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
