'use client';

import { useState } from 'react';
import { Loader2, Pencil, ExternalLink, Trash2 } from 'lucide-react';

interface Props {
  pageId: string;
  slug: string;
  editorialStatus: string;
  publishedStatus: string;
  onUpdate: (id: string, updates: Record<string, string>) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const EDITORIAL_OPTIONS = ['draft', 'in_review', 'approved', 'rejected'] as const;
const PUBLISHED_OPTIONS = ['draft', 'published', 'archived'] as const;

export default function CuratedActions({
  pageId, slug, editorialStatus, publishedStatus, onUpdate, onEdit, onDelete,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/curated?id=${pageId}`, { method: 'DELETE' });
      if (res.ok) onDelete(pageId);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />}

      {/* Editorial status */}
      <select
        className="input"
        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto', minWidth: 105 }}
        value={editorialStatus}
        disabled={saving}
        onChange={e => patch({ editorial_review_status: e.target.value })}
      >
        {EDITORIAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      {/* Publish status */}
      <select
        className="input"
        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto', minWidth: 95 }}
        value={publishedStatus}
        disabled={saving}
        onChange={e => patch({ published_status: e.target.value })}
      >
        {PUBLISHED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      {/* Edit button */}
      <button
        title="Edit article content"
        onClick={() => onEdit(pageId)}
        className="btn btn-outline btn-sm"
        style={{ padding: '0.25rem 0.5rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
      >
        <Pencil size={12} /> Edit
      </button>

      {/* View (external link) */}
      <a
        href={`/curated/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        title="View public page"
        className="btn btn-outline btn-sm"
        style={{ padding: '0.25rem 0.5rem', height: 'auto', display: 'inline-flex', alignItems: 'center' }}
      >
        <ExternalLink size={12} />
      </a>

      {/* Delete */}
      {confirmDelete ? (
        <div style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--rose)', fontWeight: 600 }}>Sure?</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-sm"
            style={{
              padding: '0.2rem 0.45rem', height: 'auto', fontSize: '0.72rem',
              background: 'var(--rose)', color: 'white', border: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
            }}
          >
            {deleting ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 'Yes, delete'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="btn btn-outline btn-sm"
            style={{ padding: '0.2rem 0.45rem', height: 'auto', fontSize: '0.72rem' }}
          >
            No
          </button>
        </div>
      ) : (
        <button
          title="Delete this article"
          onClick={handleDelete}
          className="btn btn-outline btn-sm"
          style={{
            padding: '0.25rem 0.5rem', height: 'auto',
            display: 'inline-flex', alignItems: 'center',
            color: 'var(--rose)', borderColor: 'rgba(239,68,68,0.3)',
          }}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}
