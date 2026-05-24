'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Trash2, Loader2, RotateCcw, Pencil, X, CheckCircle2 } from 'lucide-react';
import { CATEGORIES, LEVELS } from '@/lib/ranking';

interface Props {
  courseId: string;
  currentStatus: string;
  title: string;
  category: string | null;
  level: string | null;
  snippet: string | null;
  providerId: string | null;
}

interface ProviderOption { id: string; name: string; }

export default function CourseActions({ courseId, currentStatus, title, category, level, snippet, providerId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<'archive' | 'delete' | 'save' | null>(null);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [eTitle, setETitle] = useState(title);
  const [eCategory, setECategory] = useState(category ?? '');
  const [eLevel, setELevel] = useState(level ?? '');
  const [eStatus, setEStatus] = useState(currentStatus);
  const [eSnippet, setESnippet] = useState(snippet ?? '');
  const [eProvider, setEProvider] = useState(providerId ?? '');
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isArchived = currentStatus === 'archived';

  useEffect(() => {
    if (editing && providers.length === 0) {
      fetch('/api/admin/providers')
        .then(r => r.json())
        .then((d: { providers?: ProviderOption[] }) => { if (d.providers) setProviders(d.providers); })
        .catch(() => null);
    }
  }, [editing]);

  function openEdit() {
    setETitle(title); setECategory(category ?? ''); setELevel(level ?? '');
    setEStatus(currentStatus); setESnippet(snippet ?? ''); setEProvider(providerId ?? '');
    setSaveError(null); setEditing(true);
  }

  async function handleSave() {
    setLoading('save'); setSaveError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eTitle.trim(),
          category: eCategory || null,
          level: eLevel || null,
          status: eStatus,
          snippet: eSnippet.trim() || null,
          provider_id: eProvider || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setSaveError(d.error ?? 'Save failed.');
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setSaveError('Network error.');
    } finally {
      setLoading(null);
    }
  }

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
    } finally { setLoading(null); }
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this course? This cannot be undone.')) return;
    setLoading('delete');
    try {
      await fetch(`/api/admin/courses/${courseId}`, { method: 'DELETE' });
      router.refresh();
    } finally { setLoading(null); }
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
    background: 'transparent', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
        {/* Edit */}
        <button onClick={openEdit} title="Edit" style={{ ...btnBase, color: 'var(--accent)' }}>
          <Pencil size={13} />
        </button>

        {/* Archive / Restore */}
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

        {/* Delete */}
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

      {/* Edit modal */}
      {editing && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(false); }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)', padding: '1.75rem',
            width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Edit course</h2>
              <button onClick={() => setEditing(false)} style={{ ...btnBase, border: 'none' }}>
                <X size={16} />
              </button>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="label">Title <span style={{ color: 'var(--rose)' }}>*</span></label>
              <input className="input" value={eTitle} onChange={e => setETitle(e.target.value)} />
            </div>

            {/* Provider */}
            <div className="form-group">
              <label className="label">Provider</label>
              <select className="input" value={eProvider} onChange={e => setEProvider(e.target.value)}>
                <option value="">— none —</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Category + Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Category</label>
                <select className="input" value={eCategory} onChange={e => setECategory(e.target.value)}>
                  <option value="">— none —</option>
                  {CATEGORIES.map(c => <option key={c.slug} value={c.db}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Level</label>
                <select className="input" value={eLevel} onChange={e => setELevel(e.target.value)}>
                  <option value="">— none —</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Status:</span>
              {(['draft', 'published', 'archived'] as const).map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="radio" name={`status-${courseId}`} value={s} checked={eStatus === s} onChange={() => setEStatus(s)} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>

            {/* Snippet */}
            <div className="form-group">
              <label className="label">Snippet</label>
              <textarea
                className="input" rows={3} value={eSnippet}
                onChange={e => setESnippet(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            {saveError && (
              <p style={{ color: 'var(--rose)', fontSize: '0.875rem' }}>{saveError}</p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={loading === 'save' || !eTitle.trim()}
              >
                {loading === 'save'
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : <><CheckCircle2 size={13} /> Save changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
