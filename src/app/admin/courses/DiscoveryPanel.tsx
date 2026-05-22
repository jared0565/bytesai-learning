'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, ExternalLink, Plus, AlertCircle, CheckCircle2, X, Trash2 } from 'lucide-react';

interface ProviderRow {
  id: string;
  slug: string;
  name: string;
  sampleUrl: string;
  websiteUrl: string | null;
  courseCount?: number;
}

interface DiscoveredCourse {
  title: string;
  url: string;
  status: 'new' | 'existing';
  existingSlug?: string;
  meta?: {
    title: string | null;
    description: string | null;
    image: string | null;
  };
  providerId: string;
}

interface DiscoveryResult {
  provider: string;
  providerId: string;
  catalogUrl: string | null;
  total: number;
  new: number;
  existing: number;
  courses: DiscoveredCourse[];
}

interface ImportState {
  importing: boolean;
  importingCourse: string | null;
  error: string | null;
}

export default function DiscoveryPanel() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<DiscoveredCourse[]>([]);
  const [importState, setImportState] = useState<ImportState>({
    importing: false,
    importingCourse: null,
    error: null,
  });

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    setLoadingProviders(true);
    try {
      const res = await fetch('/api/admin/scan-courses');
      const data = await res.json();
      if (res.ok && data.providers) {
        setProviders(data.providers);
        if (data.providers.length > 0) setSelectedProviderId(data.providers[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoadingProviders(false);
    }
  }

  async function handleDiscover() {
    if (!selectedProviderId) return;
    setDiscovering(true);
    setError('');
    setResult(null);
    setPending([]);
    try {
      const res = await fetch('/api/admin/scan-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: selectedProviderId, limit: 20 }),
      });
      const data: DiscoveryResult & { error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Discovery failed.');
        return;
      }
      setResult(data);
      setPending(data.courses.filter(c => c.status === 'new'));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDiscovering(false);
    }
  }

  async function handleApprove(course: DiscoveredCourse) {
    setImportState({ importing: true, importingCourse: course.url, error: null });
    try {
      const res = await fetch('/api/admin/courses/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: course.title,
          official_link: course.url,
          provider_id: course.providerId,
          snippet: course.meta?.description ?? undefined,
          og_image_url: course.meta?.image ?? undefined,
          content_type: 'course',
          published_status: 'draft',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportState({ importing: false, importingCourse: null, error: data.error ?? 'Import failed.' });
        return;
      }
      setPending(prev => prev.filter(c => c.url !== course.url));
      setImportState({ importing: false, importingCourse: null, error: null });
    } catch {
      setImportState({ importing: false, importingCourse: null, error: 'Network error during import.' });
    }
  }

  function handleDiscard(course: DiscoveredCourse) {
    setPending(prev => prev.filter(c => c.url !== course.url));
  }

  async function handleApproveAll() {
    if (!confirm(`Approve and import ${pending.length} new course${pending.length > 1 ? 's' : ''}?`)) return;

    let imported = 0;
    let failed = 0;

    for (const course of pending) {
      try {
        const res = await fetch('/api/admin/courses/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: course.title,
            official_link: course.url,
            provider_id: course.providerId,
            snippet: course.meta?.description ?? undefined,
            og_image_url: course.meta?.image ?? undefined,
            content_type: 'course',
            published_status: 'draft',
          }),
        });
        if (res.ok) imported++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setPending([]);
    alert(`Import complete: ${imported} imported, ${failed} failed.`);
  }

  function handleDiscardAll() {
    if (!confirm('Discard all pending courses?')) return;
    setPending([]);
  }

  return (
    <div>
      {/* Provider selector */}
      {loadingProviders ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', padding: '0.5rem 0 1rem' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading providers…
        </div>
      ) : providers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>No providers with courses found yet.</p>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Provider
            </label>
            <select
              className="input"
              value={selectedProviderId}
              onChange={e => setSelectedProviderId(e.target.value)}
              disabled={discovering}
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{typeof p.courseCount === 'number' ? ` · ${p.courseCount} courses` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleDiscover}
            disabled={!selectedProviderId || discovering}
            className="btn btn-primary"
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {discovering
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Search size={14} />}
            {discovering ? 'Scanning…' : 'Discover'}
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: '#991b1b' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{result.provider}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {result.total} found · <span style={{ color: 'var(--emerald)' }}>{result.new} new</span> · <span>{result.existing} existing</span>
                {result.catalogUrl && (
                  <a href={result.catalogUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>
                    View catalog <ExternalLink size={10} />
                  </a>
                )}
              </p>
            </div>
          </div>

          {importState.error && (
            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#991b1b' }}>
              <AlertCircle size={14} /> {importState.error}
            </div>
          )}

          {pending.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleApproveAll}
                className="btn btn-primary btn-sm"
                disabled={importState.importing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <CheckCircle2 size={13} /> Approve all ({pending.length})
              </button>
              <button
                type="button"
                onClick={handleDiscardAll}
                className="btn btn-outline btn-sm"
                disabled={importState.importing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--rose)' }}
              >
                <Trash2 size={13} /> Discard all
              </button>
            </div>
          )}

          {pending.length === 0 && result.new > 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <CheckCircle2 size={32} color="var(--emerald)" style={{ marginBottom: '0.5rem' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 600 }}>All new courses processed</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{result.existing} existing courses were skipped.</p>
            </div>
          ) : pending.length === 0 && result.new === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>No new courses found on this catalog page.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pending.map((c, i) => (
                <div
                  key={`${c.url}-${i}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'rgba(16,185,129,0.04)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem', flexWrap: 'wrap' }}>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        View source <ExternalLink size={10} />
                      </a>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)' }}>New</span>
                    </div>
                    {c.meta?.description && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.meta.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleApprove(c)}
                      disabled={importState.importing && importState.importingCourse === c.url}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      {importState.importing && importState.importingCourse === c.url ? (
                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Plus size={13} />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDiscard(c)}
                      disabled={importState.importing && importState.importingCourse === c.url}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--rose)' }}
                    >
                      <X size={13} /> Discard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
