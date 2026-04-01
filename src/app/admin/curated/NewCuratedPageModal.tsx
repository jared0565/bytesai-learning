'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (page: { id: string; slug: string; title: string }) => void;
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function NewCuratedPageModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [summary, setSummary] = useState('');
  const [whyItMatters, setWhyItMatters] = useState('');
  const [whatChanged, setWhatChanged] = useState('');
  const [executiveImplications, setExecutiveImplications] = useState('');
  const [primaryCourse, setPrimaryCourse] = useState('');
  const [relatedCourses, setRelatedCourses] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  // Auto-derive slug from title unless user has manually edited it
  useEffect(() => {
    if (!slugEdited) setSlug(toSlug(title));
  }, [title, slugEdited]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim() || !slug.trim()) { setError('Title and slug are required.'); return; }

    const relatedArr = relatedCourses
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const res = await fetch('/api/admin/curated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          summary: summary.trim() || null,
          why_it_matters: whyItMatters.trim() || null,
          what_changed: whatChanged.trim() || null,
          executive_implications: executiveImplications.trim() || null,
          primary_course_slug: primaryCourse.trim() || null,
          related_course_slugs: relatedArr,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create page.'); return; }
      onCreated({ id: data.id, slug: data.slug, title: title.trim() });
    } finally {
      setSaving(false);
    }
  }

  function handleSlugChange(v: string) {
    setSlugEdited(true);
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));
  }

  const labelStyle: React.CSSProperties = { fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block', color: 'var(--text-secondary)' };
  const fieldStyle: React.CSSProperties = { marginBottom: '1rem' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>New Curated Page</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Created as <strong>draft / draft</strong> — update status after filling in content.
        </p>

        {error && (
          <div style={{ background: 'var(--rose)18', border: '1px solid var(--rose)', color: 'var(--rose)', borderRadius: 'var(--radius)', padding: '0.625rem 0.875rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Title *</label>
            <input ref={titleRef} className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Why AI Agents Are Changing Software Development" required />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Slug *</label>
            <input
              className="input"
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="e.g. ai-agents-software-development"
              style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Public URL: /curated/<strong>{slug || '…'}</strong>
            </span>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Summary</label>
            <textarea className="input" rows={2} value={summary} onChange={e => setSummary(e.target.value)} placeholder="One or two sentences describing the topic." style={{ resize: 'vertical' }} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Why it matters</label>
            <textarea className="input" rows={3} value={whyItMatters} onChange={e => setWhyItMatters(e.target.value)} placeholder="Explain the significance of this topic." style={{ resize: 'vertical' }} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>What changed</label>
            <textarea className="input" rows={3} value={whatChanged} onChange={e => setWhatChanged(e.target.value)} placeholder="Recent developments, releases, or breakthroughs." style={{ resize: 'vertical' }} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Executive implications</label>
            <textarea className="input" rows={3} value={executiveImplications} onChange={e => setExecutiveImplications(e.target.value)} placeholder="What leaders and teams should know or do." style={{ resize: 'vertical' }} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Primary course slug</label>
            <input className="input" value={primaryCourse} onChange={e => setPrimaryCourse(e.target.value)} placeholder="e.g. intro-to-ai-alison" style={{ fontFamily: 'monospace', fontSize: '0.875rem' }} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Related course slugs</label>
            <input className="input" value={relatedCourses} onChange={e => setRelatedCourses(e.target.value)} placeholder="slug-one, slug-two, slug-three" style={{ fontFamily: 'monospace', fontSize: '0.875rem' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Comma-separated slugs</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              Create page
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
