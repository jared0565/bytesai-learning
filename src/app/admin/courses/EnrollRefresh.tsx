'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  slug: string;
  initialCount: number | null;
}

export default function EnrollRefresh({ slug, initialCount }: Props) {
  const [count, setCount]     = useState<number | null>(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/alison-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json() as { enrollCount?: number; updated?: boolean; error?: string };
      if (data.updated && data.enrollCount != null) {
        setCount(data.enrollCount);
      } else {
        setError(data.error ?? 'No count found');
      }
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 120 }}>
      <span style={{ fontWeight: 600, color: count ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.875rem' }}>
        {count != null ? count.toLocaleString('en-US') : '—'}
      </span>
      <button
        onClick={refresh}
        disabled={loading}
        title="Refresh from Alison"
        style={{
          background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          color: error ? 'var(--red, #f87171)' : 'var(--text-muted)',
          padding: '0.15rem', display: 'flex', alignItems: 'center',
          opacity: loading ? 0.5 : 1, transition: 'color 0.15s',
        }}
      >
        <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
      </button>
      {error && (
        <span style={{ fontSize: '0.7rem', color: 'var(--red, #f87171)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
