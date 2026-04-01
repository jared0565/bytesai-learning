'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Trash2, Loader2, RotateCcw } from 'lucide-react';

interface Props {
  courseId: string;
  currentStatus: string;
}

export default function CourseActions({ courseId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<'archive' | 'delete' | null>(null);

  const isArchived = currentStatus === 'archived';

  async function handleArchiveToggle() {
    const newStatus = isArchived ? 'published' : 'archived';
    setLoading('archive');
    try {
      await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this course? This cannot be undone.')) return;
    setLoading('delete');
    try {
      await fetch(`/api/admin/courses/${courseId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
    background: 'transparent', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  };

  return (
    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
      <button
        onClick={handleArchiveToggle}
        disabled={loading !== null}
        title={isArchived ? 'Restore to published' : 'Archive'}
        style={{ ...btnBase, color: isArchived ? 'var(--emerald)' : 'var(--amber)' }}
      >
        {loading === 'archive'
          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          : isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
      </button>

      <button
        onClick={handleDelete}
        disabled={loading !== null}
        title="Delete permanently"
        style={{ ...btnBase, color: 'var(--rose, #f43f5e)' }}
      >
        {loading === 'delete'
          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          : <Trash2 size={13} />}
      </button>
    </div>
  );
}
