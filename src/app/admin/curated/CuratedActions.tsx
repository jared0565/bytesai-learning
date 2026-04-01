'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  pageId: string;
  editorialStatus: string;
  publishedStatus: string;
  onUpdate: (id: string, updates: Record<string, string>) => void;
}

const EDITORIAL_OPTIONS = ['draft', 'in_review', 'approved', 'rejected'] as const;
const PUBLISHED_OPTIONS = ['draft', 'published', 'archived'] as const;

export default function CuratedActions({ pageId, editorialStatus, publishedStatus, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);

  async function patch(updates: Record<string, string>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/curated?id=${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) onUpdate(pageId, updates);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />}

      <select
        className="input"
        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto', minWidth: 110 }}
        value={editorialStatus}
        disabled={saving}
        onChange={e => patch({ editorial_review_status: e.target.value })}
      >
        {EDITORIAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      <select
        className="input"
        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto', minWidth: 100 }}
        value={publishedStatus}
        disabled={saving}
        onChange={e => patch({ published_status: e.target.value })}
      >
        {PUBLISHED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
