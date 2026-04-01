'use client';

import { useState } from 'react';
import { MailWarning, X, Loader2, CheckCircle } from 'lucide-react';

interface Props {
  email: string;
}

export default function VerificationBanner({ email }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (dismissed) return null;

  async function resend() {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error ?? 'Failed to send. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      background: '#fffbeb', borderBottom: '1px solid #fcd34d',
      padding: '0.75rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
    }}>
      <MailWarning size={16} style={{ color: '#d97706', flexShrink: 0 }} />
      <span style={{ fontSize: '0.875rem', color: '#92400e', flex: 1 }}>
        {sent
          ? <><CheckCircle size={14} style={{ display: 'inline', marginRight: 4, color: '#059669' }} />Verification link sent to <strong>{email}</strong> — check your inbox.</>
          : <>Please verify your email address. Check your inbox or </>
        }
        {!sent && (
          <button
            onClick={resend}
            disabled={sending}
            style={{ color: '#b45309', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            {sending ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : 'resend the link.'}
          </button>
        )}
        {error && <span style={{ color: '#dc2626', marginLeft: 8, fontSize: '0.8rem' }}>{error}</span>}
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', display: 'flex', padding: 2 }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
