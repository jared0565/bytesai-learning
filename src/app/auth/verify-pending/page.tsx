'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, AlertCircle, BookOpen, RefreshCw } from 'lucide-react';

export default function VerifyPendingPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  async function handleResend() {
    setError('');
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setResent(true);
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
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.875rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#991b1b', textAlign: 'left' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            {resent ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem 1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#166534' }}>
                <CheckCircle2 size={16} />
                Verification email resent! Check your inbox.
              </div>
            ) : (
              <button
                onClick={handleResend}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', height: 48, marginBottom: '1rem' }}
                disabled={resending}
              >
                {resending ? <><Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> Resending…</> : <><RefreshCw size={18} /> Resend verification email</>}
              </button>
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
