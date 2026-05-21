'use client';

import { useState } from 'react';
import { Scan, Loader2, ExternalLink, Plus, ArrowRight, AlertCircle } from 'lucide-react';

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

  function handleImport(course: ScannedCourse) {
    const params = new URLSearchParams();
    params.set('prefill_title', course.title);
    params.set('prefill_url', course.url);
    params.set('prefill_snippet', course.meta?.description ?? '');
    params.set('prefill_image', course.meta?.image ?? '');
    // Scroll to AddCourseForm by navigating with hash or emitting a custom event
    // For simplicity, scroll to the form and update query params which the form reads
    window.history.replaceState(null, '', `?${params.toString()}`);
    // Scroll to the form section
    const formEl = document.getElementById('add-course-form');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Dispatch a custom event that AddCourseForm can listen to
    window.dispatchEvent(new CustomEvent('scanner-prefill', { detail: Object.fromEntries(params) }));
  }

  const filtered = result?.courses.filter(c =>
    filter === 'all' ? true : c.status === filter
  ) ?? [];

  return (
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
                    <a
                      href={`/courses/${c.existingSlug}`}
                      target="_blank"
                      className="btn btn-outline btn-sm"
                      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      View <ArrowRight size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
