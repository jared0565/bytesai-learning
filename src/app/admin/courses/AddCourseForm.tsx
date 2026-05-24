'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Link2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { CATEGORIES } from '@/lib/ranking';

interface FetchedMeta {
  title: string | null;
  description: string | null;
  ogImage: string | null;
  providerId: string | null;
  level: string | null;
}

interface ProviderOption {
  id: string;
  name: string;
}

const CONTENT_TYPES = ['course', 'book', 'other_source', 'platform', 'path'] as const;
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Beginner to intermediate', 'Intermediate to advanced', 'Beginner to advanced'] as const;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

export default function AddCourseForm() {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [snippet, setSnippet] = useState('');
  const [category, setCategory] = useState('');
  const [contentType, setContentType] = useState<string>('course');
  const [level, setLevel] = useState('');
  const [providerId, setProviderId] = useState('');
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [isAlison, setIsAlison] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [publishedStatus, setPublishedStatus] = useState<'draft' | 'published'>('draft');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; slug: string } | null>(null);

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    function applyPrefill(params: URLSearchParams) {
      const t = params.get('prefill_title');
      const u = params.get('prefill_url');
      const s = params.get('prefill_snippet');
      const i = params.get('prefill_image');
      const asNew = params.get('prefill_as_new') === '1';
      if (t) {
        applyTitle(t);
        if (asNew) {
          // Modify slug to avoid collision when importing as new
          setSlug(`${slugify(t)}-2`);
          setSlugManual(true);
        }
        setShowForm(true);
      }
      if (u) { setUrl(u); setShowForm(true); }
      if (s) { setSnippet(s); setShowForm(true); }
      if (i) { setOgImage(i); setShowForm(true); }
    }

    // Read from current URL on mount
    applyPrefill(new URLSearchParams(window.location.search));

    // Listen for scanner prefill events
    function onPrefill(e: Event) {
      const detail = (e as CustomEvent).detail as Record<string, string>;
      if (detail) {
        const params = new URLSearchParams(detail);
        applyPrefill(params);
      }
    }
    window.addEventListener('scanner-prefill', onPrefill);
    return () => window.removeEventListener('scanner-prefill', onPrefill);
  }, []);

  useEffect(() => {
    fetch('/api/admin/providers')
      .then(r => r.json())
      .then((data: { providers?: ProviderOption[] }) => {
        if (data.providers) setProviders(data.providers);
      })
      .catch(() => null);
  }, []);

  function applyTitle(t: string) {
    setTitle(t);
    if (!slugManual) setSlug(slugify(t));
  }

  async function handleFetchMeta() {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/courses/fetch-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data: FetchedMeta & { error?: string } = await res.json();
      if (!res.ok) {
        setFetchError(data.error ?? 'Failed to fetch metadata.');
      } else {
        if (data.title) applyTitle(data.title);
        if (data.description) setSnippet(data.description);
        if (data.ogImage) setOgImage(data.ogImage);
        if (data.providerId) setProviderId(data.providerId);
        if (data.level) setLevel(data.level);
        setShowForm(true);
      }
    } catch {
      setFetchError('Network error. Check the URL and try again.');
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/admin/courses/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          official_link: url.trim() || undefined,
          snippet: snippet.trim() || undefined,
          category: category || undefined,
          content_type: contentType,
          level: level || undefined,
          provider_id: providerId || undefined,
          is_alison: isAlison,
          is_affiliate: isAffiliate,
          affiliate_url: affiliateUrl.trim() || undefined,
          og_image_url: ogImage.trim() || undefined,
          published_status: publishedStatus,
        }),
      });
      const data: { ok?: boolean; course?: { id: string; slug: string }; error?: string } = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to create course.');
      } else {
        setCreated(data.course!);
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setUrl(''); setTitle(''); setSlug(''); setSlugManual(false);
    setSnippet(''); setCategory(''); setContentType('course'); setLevel(''); setProviderId('');
    setIsAlison(false); setIsAffiliate(false); setAffiliateUrl(''); setOgImage('');
    setPublishedStatus('draft'); setFetchError(null); setSubmitError(null);
    setCreated(null); setShowForm(false);
  }

  if (created) {
    return (
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
        <CheckCircle2 size={40} color="var(--emerald)" />
        <h2 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Course created</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Saved as <strong>{publishedStatus}</strong> with slug <code style={{ background: 'var(--bg)', padding: '0.125rem 0.375rem', borderRadius: 4 }}>{created.slug}</code>
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href={`/courses/${created.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
            View page <ArrowRight size={14} />
          </a>
          <button onClick={handleReset} className="btn btn-outline btn-sm">Add another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.75rem 2rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Add course by URL</h2>

      {/* URL input */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: fetchError ? '0.5rem' : '1.5rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Link2 size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="url"
            className="input"
            placeholder="https://course-provider.com/course-name"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetchMeta()}
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>
        <button
          type="button"
          onClick={handleFetchMeta}
          disabled={fetching || !url.trim()}
          className="btn btn-primary"
          style={{ flexShrink: 0 }}
        >
          {fetching ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Fetch metadata'}
        </button>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)} className="btn btn-outline" style={{ flexShrink: 0 }}>
            Fill manually
          </button>
        )}
      </div>

      {fetchError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
          <AlertCircle size={15} />
          {fetchError} — you can still fill in the fields manually.
          {!showForm && <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(true)} style={{ marginLeft: 'auto' }}>Fill manually</button>}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Title + Slug */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Title <span style={{ color: 'var(--rose)' }}>*</span></label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={e => applyTitle(e.target.value)}
                required
                placeholder="e.g. Introduction to Generative AI"
              />
            </div>
            <div className="form-group">
              <label className="label">Slug</label>
              <input
                type="text"
                className="input"
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
                placeholder="auto-generated from title"
              />
            </div>
          </div>

          {/* Provider */}
          <div className="form-group">
            <label className="label">Provider</label>
            <select className="input" value={providerId} onChange={e => setProviderId(e.target.value)}>
              <option value="">— none —</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Category + Content type + Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">— none —</option>
                {CATEGORIES.map(c => <option key={c.slug} value={c.db}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Content type <span style={{ color: 'var(--rose)' }}>*</span></label>
              <select className="input" value={contentType} onChange={e => setContentType(e.target.value)} required>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Level</label>
              <select className="input" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">— none —</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Snippet */}
          <div className="form-group">
            <label className="label">Snippet / Description</label>
            <textarea
              className="input"
              rows={3}
              value={snippet}
              onChange={e => setSnippet(e.target.value)}
              placeholder="Short description shown on course cards and search results"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* OG image */}
          <div className="form-group">
            <label className="label">Cover image URL</label>
            <input
              type="url"
              className="input"
              value={ogImage}
              onChange={e => setOgImage(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Flags */}
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
              <input type="checkbox" checked={isAlison} onChange={e => { setIsAlison(e.target.checked); if (e.target.checked) setIsAffiliate(true); }} />
              Alison course
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
              <input type="checkbox" checked={isAffiliate} onChange={e => setIsAffiliate(e.target.checked)} />
              Affiliate link
            </label>
          </div>

          {isAffiliate && (
            <div className="form-group">
              <label className="label">Affiliate URL</label>
              <input
                type="url"
                className="input"
                value={affiliateUrl}
                onChange={e => setAffiliateUrl(e.target.value)}
                placeholder="https://alison.com/course/...?utm_campaign=27668723"
              />
            </div>
          )}

          {/* Publish status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Save as:</span>
            {(['draft', 'published'] as const).map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="radio" name="status" value={s} checked={publishedStatus === s} onChange={() => setPublishedStatus(s)} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </label>
            ))}
          </div>

          {submitError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: '#991b1b' }}>
              <AlertCircle size={15} /> {submitError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" disabled={submitting || !title.trim()} className="btn btn-primary">
              {submitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Create course'}
            </button>
            <button type="button" onClick={handleReset} className="btn btn-outline">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
