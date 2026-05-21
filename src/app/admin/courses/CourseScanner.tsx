'use client';

import { useState } from 'react';
import { Scan, Loader2, ExternalLink, Plus, ArrowRight, AlertCircle, X, Save, Trash2 } from 'lucide-react';

interface ScannedCourse {
  title: string;
  url: string;
  status: 'new' | 'existing';
  existingSlug?: string;
  meta?: {
    title: string | null;
    description: string | null;
    image: string | null;
  };
}

interface ExistingCourse {
  id: string;
  slug: string;
  title: string;
  official_link: string | null;
  snippet: string | null;
  cover_image_url: string | null;
  duration_text: string | null;
  level: string | null;
  category: string | null;
  published_status: string;
  created_at: string;
  updated_at: string;
}

interface ScanResult {
  provider: string;
  total: number;
  new: number;
  existing: number;
  courses: ScannedCourse[];
}

const PROVIDERS = [
  { id: 'microsoft', name: 'Microsoft Learn' },
];

export default function CourseScanner() {
  const [provider, setProvider] = useState('microsoft');
  const [customUrl, setCustomUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'existing'>('all');

  // Comparison modal state
  const [compareCourse, setCompareCourse] = useState<ScannedCourse | null>(null);
  const [existingCourse, setExistingCourse] = useState<ExistingCourse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  async function handleScan() {
    setScanning(true);
    setError('');
    setResult(null);
    try {
      const body: Record<string, unknown> = { provider, limit: 20 };
      if (customUrl.trim()) body.url = customUrl.trim();
      const res = await fetch('/api/admin/scan-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: ScanResult & { error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Scan failed.');
        return;
      }
      setResult(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setScanning(false);
    }
  }

  async function openComparison(course: ScannedCourse) {
    if (!course.existingSlug) return;
    setCompareCourse(course);
    setExistingCourse(null);
    setCompareLoading(true);
    try {
      const res = await fetch(`/api/admin/courses?slug=${encodeURIComponent(course.existingSlug)}`);
      const data = await res.json();
      if (res.ok && data.course) {
        setExistingCourse(data.course);
      } else {
        setExistingCourse(null);
      }
    } catch {
      setExistingCourse(null);
    } finally {
      setCompareLoading(false);
    }
  }

  function handleImport(course: ScannedCourse, asNew = false) {
    const params = new URLSearchParams();
    params.set('prefill_title', course.title);
    params.set('prefill_url', course.url);
    params.set('prefill_snippet', course.meta?.description ?? '');
    params.set('prefill_image', course.meta?.image ?? '');
    if (asNew) params.set('prefill_as_new', '1');
    window.history.replaceState(null, '', `?${params.toString()}`);
    const formEl = document.getElementById('add-course-form');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.dispatchEvent(new CustomEvent('scanner-prefill', { detail: Object.fromEntries(params) }));
    setCompareCourse(null);
  }

  async function handleBatchImport() {
    const newCourses = result?.courses.filter(c => c.status === 'new') ?? [];
    if (newCourses.length === 0) return;

    if (!confirm(`Import ${newCourses.length} new course${newCourses.length > 1 ? 's' : ''}? Existing courses will be skipped automatically.`)) return;

    const results: Array<{ title: string; ok: boolean; error?: string }> = [];
    for (const course of newCourses) {
      try {
        const res = await fetch('/api/admin/courses/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: course.title,
            official_link: course.url,
            snippet: course.meta?.description ?? undefined,
            og_image_url: course.meta?.image ?? undefined,
            content_type: 'course',
            published_status: 'draft',
          }),
        });
        const data = await res.json();
        results.push({ title: course.title, ok: res.ok, error: data.error });
      } catch {
        results.push({ title: course.title, ok: false, error: 'Network error' });
      }
    }

    const imported = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    alert(`Batch import complete: ${imported} imported, ${failed} failed.`);
    window.location.reload();
  }

  const filtered = result?.courses.filter(c =>
    filter === 'all' ? true : c.status === filter
  ) ?? [];

  return (
    <>
      <div className="card" style={{ padding: '1.5rem 2rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Scan size={18} /> Scan for new courses
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input"
              value={provider}
              onChange={e => setProvider(e.target.value)}
              disabled={scanning}
              style={{ minWidth: 180 }}
            >
              {PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleScan}
              disabled={scanning}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              {scanning ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Scan size={15} />}
              {scanning ? 'Scanning…' : 'Scan catalog'}
            </button>
          </div>

          <input
            type="url"
            className="input"
            placeholder="Optional: paste a filtered catalog URL (e.g. https://learn.microsoft.com/en-gb/training/browse/?subjects=artificial-intelligence...)"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            disabled={scanning}
            style={{ fontSize: '0.8125rem' }}
          />
        </div>

        {error && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: '#991b1b' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.875rem' }}>
                <span><strong>{result.total}</strong> found</span>
                <span style={{ color: 'var(--emerald)' }}><strong>{result.new}</strong> new</span>
                <span style={{ color: 'var(--text-muted)' }}><strong>{result.existing}</strong> existing</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {(['all', 'new', 'existing'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        border: filter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: filter === f ? 'var(--accent-soft)' : 'var(--bg)',
                        color: filter === f ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                {result.new > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchImport}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Plus size={13} /> Import {result.new} new
                  </button>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No courses match this filter.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filtered.map((c, i) => (
                  <div
                    key={`${c.url}-${i}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: c.status === 'new' ? 'rgba(16,185,129,0.04)' : 'var(--bg)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          View <ExternalLink size={10} />
                        </a>
                        {c.status === 'new' ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)' }}>New</span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(107,114,128,0.1)', color: 'var(--text-muted)' }}>Existing{c.existingSlug ? ` (${c.existingSlug})` : ''}</span>
                        )}
                      </div>
                      {c.meta?.description && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.meta.description}
                        </p>
                      )}
                    </div>
                    {c.status === 'new' && (
                      <button
                        type="button"
                        onClick={() => handleImport(c)}
                        className="btn btn-primary btn-sm"
                        style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Plus size={13} /> Import
                      </button>
                    )}
                    {c.status === 'existing' && c.existingSlug && (
                      <button
                        type="button"
                        onClick={() => openComparison(c)}
                        className="btn btn-outline btn-sm"
                        style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        Compare <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      {compareCourse && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }} onClick={() => setCompareCourse(null)}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '1.5rem',
            maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Course already exists</h2>
              <button
                onClick={() => setCompareCourse(null)}
                style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {compareLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem', color: 'var(--text-muted)' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading existing course…
              </div>
            ) : existingCourse ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Scanned */}
                <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '2px dashed var(--accent)', background: 'rgba(79,110,247,0.04)' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: '0.75rem' }}>Scanned</p>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>{compareCourse.title}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}><strong>URL:</strong> <a href={compareCourse.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{compareCourse.url}</a></p>
                  {compareCourse.meta?.description && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}><strong>Description:</strong> {compareCourse.meta.description}</p>
                  )}
                  {compareCourse.meta?.image && (
                    <img src={compareCourse.meta.image} alt="" style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6, marginTop: '0.5rem' }} />
                  )}
                </div>

                {/* Existing */}
                <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>In Database</p>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>{existingCourse.title}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}><strong>URL:</strong> {existingCourse.official_link ? <a href={existingCourse.official_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{existingCourse.official_link}</a> : '—'}</p>
                  {existingCourse.snippet && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}><strong>Description:</strong> {existingCourse.snippet}</p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Slug: <code>{existingCourse.slug}</code></span>
                    <span>Status: <span style={{ textTransform: 'capitalize' }}>{existingCourse.published_status}</span></span>
                    {existingCourse.level && <span>Level: {existingCourse.level}</span>}
                    {existingCourse.duration_text && <span>Duration: {existingCourse.duration_text}</span>}
                  </div>
                  {existingCourse.cover_image_url && (
                    <img src={existingCourse.cover_image_url} alt="" style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6, marginTop: '0.5rem' }} />
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Could not load existing course details.</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCompareCourse(null)}
                className="btn btn-outline"
              >
                Keep existing
              </button>
              {compareCourse.existingSlug && (
                <a
                  href={`/courses/${compareCourse.existingSlug}`}
                  target="_blank"
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  View existing <ArrowRight size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={() => handleImport(compareCourse, true)}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Plus size={14} /> Import as new
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
