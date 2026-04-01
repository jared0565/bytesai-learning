'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function DeleteAccountButton() {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/learner/account', { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/';
      } else {
        const data: { error?: string } = await res.json();
        setError(data.error ?? 'Failed to delete account.');
        setConfirm(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  if (confirm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--rose)', fontWeight: 600, textAlign: 'right' }}>
          Are you sure? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setConfirm(false)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ borderColor: 'var(--rose)', color: 'var(--rose)' }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <AlertTriangle size={14} style={{ marginRight: '0.25rem' }} />}
            Yes, delete my account
          </button>
        </div>
        {error && <p style={{ fontSize: '0.8125rem', color: 'var(--rose)' }}>{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-outline"
      style={{ borderColor: 'var(--rose)', color: 'var(--rose)' }}
      onClick={() => setConfirm(true)}
    >
      <AlertTriangle size={16} style={{ marginRight: '0.375rem' }} /> Delete account
    </button>
  );
}
