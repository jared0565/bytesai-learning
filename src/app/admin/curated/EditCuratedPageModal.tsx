'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

interface PageData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  why_it_matters: string | null;
  what_changed: string | null;
  executive_implications: string | null;
  primary_course_slug: string | null;
  related_course_slugs_json: string | null;
  source_references_json: string | null;
  meta_title: string | null;
  meta_description: string | null;
  editorial_review_status: string;
  published_status: string;
}

interface Props {
  pageId: string;
  onClose: () => void;
  onSaved: (id: string, updates: Record<string, string | null>) => void;
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

const EDITORIAL_OPTIONS = ['draft', 'in_review', 'approved', 'rejected'] as const;
const PUBLISHED_OPTIONS = ['draft', 'published', 'archived'] as const;

export default function EditCuratedPageModal({ pageId, onClose, onSaved }: Props) {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [whyItMatters, setWhyItMatters] = useState('');
  const [whatChanged, setWhatChanged] = useState('');
  const [executiveImplications, setExecutiveImplications] = useState('');
  const [primaryCourse, setPrimaryCourse] = useState('');
  const [relatedCourses, setRelatedCourses] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [editorialStatus, setEditorialStatus] = useState('draft');
  const [publishedStatus, setPublishedStatus] = useState('draft');

  // Load existing page
  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/curated?id=${pageId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLoadError(d.error); return; }
        const p: PageData = d.page;
        setPage(p);
        setTitle(p.title ?? '');
        setSlug(p.slug ?? '');
        setSummary(p.summary ?? '');
        setWhyItMatters(p.why_it_matters ?? '');
        setWhatChanged(p.what_changed ?? '');
        setExecutiveImplications(p.executive_implications ?? '');
        setPrimaryCourse(p.primary_course_slug ?? '');
        setEditorialStatus(p.editorial_review_status ?? 'draft');
        setPublishedStatus(p.published_status ?? 'draft');
        setMetaTitle(p.meta_title ?? '');
        setMetaDescription(p.meta_description ?? '');

        // Related slugs
        const relSlugs: string[] = p.related_course_slugs_json
          ? JSON.parse(p.related_course_slugs_json)
          : [];
        setRelatedCourses(relSlugs.join(', '));
      })
      .catch(() => setLoadError('Failed to load page data.'))
      .finally(() => setLoading(false));
  }, [pageId]);

  // Auto-derive slug only if user hasn't manually edited it AND slug was empty
  useEffect(() => {
    if (!slugEdited && page && !page.slug) setSlug(toSlug(title));
  }, [title, slugEdited, page]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError('');
    if (!title.trim() || !slug.trim()) { setSaveError('Title and slug are required.'); return; }

    const relatedArr = relatedCourses
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/curated?id=${pageId}`, {
        method: 'PATCH',
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
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          editorial_review_status: editorialStatus,
          published_status: publishedStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? 'Save failed.'); return; }

      onSaved(pageId, {
        title: title.trim(),
        slug: slug.trim(),
        summary: summary.trim() || null,
        editorial_review_status: editorialStatus,
        published_status: publishedStatus,
        primary_course_slug: primaryCourse.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleSlugChange(v: string) {
    setSlugEdited(true);
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem',
    display: 'block', color: 'var(--text-secondary)',
  };
  const fieldStyle: React.CSSProperties = { marginBottom: '1rem' };
  const hintStyle: React.CSSProperties = {
    fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{
        width: '100%', maxWidth: 700, maxHeight: '92vh',
        overflowY: 'auto', padding: '2rem', position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Edit Article</h2>
            {page && (
              <a
                href={`/curated/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.78rem', color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Preview live page <ExternalLink size={11} />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ padding: '3rem 0', textAlign: 'center' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading article…</p>
          </div>
        )}

        {/* Load error */}
        {loadError && !loading && (
          <div style={{
            padding: '1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem', alignItems: 'center',
          }}>
            <AlertCircle size={15} color="var(--rose)" />
            <p style={{ fontSize: '0.875rem', color: 'var(--rose)' }}>{loadError}</p>
          </div>
        )}

        {/* Form */}
        {!loading && !loadError && (
          <form onSubmit={handleSubmit}>

            {/* Save error */}
            {saveError && (
              <div style={{
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                color: 'var(--rose)', borderRadius: 'var(--radius)', padding: '0.625rem 0.875rem',
                fontSize: '0.875rem', marginBottom: '1rem',
              }}>
                {saveError}
              </div>
            )}

            {/* ── Status row ── */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
              marginBottom: '1.25rem', padding: '0.875rem 1rem',
              background: 'var(--bg)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}>
              <div>
                <label style={labelStyle}>Editorial status</label>
                <select
                  className="input"
                  value={editorialStatus}
                  onChange={e => setEditorialStatus(e.target.value)}
                  style={{ fontSize: '0.875rem' }}
                >
                  {EDITORIAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Publish status</label>
                <select
                  className="input"
                  value={publishedStatus}
                  onChange={e => setPublishedStatus(e.target.value)}
                  style={{ fontSize: '0.875rem' }}
                >
                  {PUBLISHED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* ── Core content ── */}
            <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', paddingBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>Article content</p>

              <div style={fieldStyle}>
                <label style={labelStyle}>Title *</label>
                <input
                  className="input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Why Generative AI Is Reshaping Content Creation"
                  required
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Slug *</label>
                <input
                  className="input"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="e.g. generative-ai-content-creation"
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  required
                />
                <span style={hintStyle}>
                  Public URL: learn.bytesai.uk/curated/<strong>{slug || '…'}</strong>
                </span>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Summary</label>
                <textarea
                  className="input" rows={2}
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="A 1–2 sentence hook that explains why this topic matters right now."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Why it matters</label>
                <textarea
                  className="input" rows={4}
                  value={whyItMatters}
                  onChange={e => setWhyItMatters(e.target.value)}
                  placeholder="3–5 sentences on the real-world significance. Naturally mention the free course here."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>What changed</label>
                <textarea
                  className="input" rows={4}
                  value={whatChanged}
                  onChange={e => setWhatChanged(e.target.value)}
                  placeholder="3–5 sentences on current developments, recent releases, or breakthroughs."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Key implications</label>
                <textarea
                  className="input" rows={4}
                  value={executiveImplications}
                  onChange={e => setExecutiveImplications(e.target.value)}
                  placeholder="3–5 sentences on practical takeaways for learners and organisations."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* ── Course linking ── */}
            <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', paddingBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>Course links</p>

              <div style={fieldStyle}>
                <label style={labelStyle}>Primary course slug</label>
                <input
                  className="input"
                  value={primaryCourse}
                  onChange={e => setPrimaryCourse(e.target.value)}
                  placeholder="e.g. introduction-to-artificial-intelligence-alison"
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                <span style={hintStyle}>Embedded mid-article as "Free course to get started"</span>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Related course slugs</label>
                <input
                  className="input"
                  value={relatedCourses}
                  onChange={e => setRelatedCourses(e.target.value)}
                  placeholder="slug-one, slug-two, slug-three"
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                <span style={hintStyle}>Comma-separated — shown as a grid after the article</span>
              </div>
            </div>

            {/* ── SEO ── */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>SEO (optional)</p>

              <div style={fieldStyle}>
                <label style={labelStyle}>Meta title</label>
                <input
                  className="input"
                  value={metaTitle}
                  onChange={e => setMetaTitle(e.target.value)}
                  placeholder="Overrides article title in search results (under 60 chars)"
                />
                <span style={hintStyle}>{metaTitle.length}/60 chars</span>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Meta description</label>
                <textarea
                  className="input" rows={2}
                  value={metaDescription}
                  onChange={e => setMetaDescription(e.target.value)}
                  placeholder="SEO description shown in search results (under 155 chars)"
                  style={{ resize: 'vertical' }}
                />
                <span style={hintStyle}>{metaDescription.length}/155 chars</span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                Save changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
