'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from 'lucide-react';

interface BatchRowResult {
  row: number;
  title: string;
  status: 'created' | 'existing' | 'updated' | 'failed' | 'validated' | 'archive_candidate' | 'archived';
  slug?: string;
  id?: string;
  error?: string;
}

interface BatchImportResult {
  ok: boolean;
  dryRun: boolean;
  summary: {
    total: number;
    created: number;
    existing: number;
    updated: number;
    failed: number;
    validated: number;
    archiveCandidates: number;
    archived: number;
  };
  results: BatchRowResult[];
}

export default function BatchCourseImport() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState<'draft' | 'published'>('draft');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [archiveMissing, setArchiveMissing] = useState(false);
  const [providerId, setProviderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append('file', file);
    form.append('dryRun', String(dryRun));
    form.append('defaultStatus', defaultStatus);
    form.append('updateExisting', String(updateExisting));
    form.append('archiveMissing', String(archiveMissing));
    if (providerId.trim()) form.append('providerId', providerId.trim());

    try {
      const res = await fetch('/api/admin/courses/batch-ingest', {
        method: 'POST',
        body: form,
      });
      const data = await res.json() as BatchImportResult & { error?: string };
      if (!res.ok && !data.results) {
        setError(data.error ?? 'Batch import failed.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = Boolean(file) && !submitting && (!archiveMissing || Boolean(providerId.trim()));

  return (
    <div className="card" style={{ padding: '1.75rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Batch import courses</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5, maxWidth: 680 }}>
            Upload JSON or Markdown. Each course must include a title, HTTPS URL, and short brief.
          </p>
        </div>
        <FileUp size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'end',
          }}
        >
          <div className="form-group">
            <label className="label">Import file</label>
            <input
              type="file"
              className="input"
              accept=".json,.md,.markdown,application/json,text/markdown,text/plain"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="form-group">
            <label className="label">Default status</label>
            <select
              className="input"
              value={defaultStatus}
              onChange={e => setDefaultStatus(e.target.value === 'published' ? 'published' : 'draft')}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Provider refresh
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
              <input type="checkbox" checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)} />
              Refresh existing matches
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={archiveMissing}
                onChange={e => {
                  setArchiveMissing(e.target.checked);
                  if (e.target.checked) setUpdateExisting(true);
                }}
              />
              Archive missing provider courses
            </label>
            <div className="form-group">
              <label className="label">Provider ID for archive comparison</label>
              <input
                type="text"
                className="input"
                value={providerId}
                onChange={e => setProviderId(e.target.value)}
                placeholder="prov-anthropic"
              />
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
            Refresh updates matched courses by URL, slug, or provider-scoped title. Archive only marks unmatched provider courses as archived.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
            Preview only
          </label>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {result && (
              <button type="button" className="btn btn-outline" onClick={() => { setResult(null); setError(null); }}>
                Clear result
              </button>
            )}
            <button type="submit" disabled={!canSubmit} className="btn btn-primary">
              {submitting ? (
                <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
              ) : dryRun ? 'Preview batch' : 'Import batch'}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginTop: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: result.ok ? 'var(--emerald)' : 'var(--amber)', fontSize: '0.9rem', fontWeight: 700 }}>
            {result.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {result.dryRun ? 'Preview complete' : 'Import complete'}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <SummaryPill label="Total" value={result.summary.total} />
            <SummaryPill label="Validated" value={result.summary.validated} />
            <SummaryPill label="Created" value={result.summary.created} />
            <SummaryPill label="Existing" value={result.summary.existing} />
            <SummaryPill label="Updated" value={result.summary.updated ?? 0} />
            <SummaryPill label="Archive candidates" value={result.summary.archiveCandidates ?? 0} tone={(result.summary.archiveCandidates ?? 0) > 0 ? 'warning' : 'neutral'} />
            <SummaryPill label="Archived" value={result.summary.archived ?? 0} tone={(result.summary.archived ?? 0) > 0 ? 'warning' : 'neutral'} />
            <SummaryPill label="Failed" value={result.summary.failed} tone={result.summary.failed > 0 ? 'error' : 'neutral'} />
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>Row</th>
                  <th style={thStyle}>Course</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Slug / error</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row, index) => (
                  <tr key={`${row.row}-${row.title}`} style={{ borderBottom: index < result.results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={tdStyle}>{row.row}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{row.title}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: statusColor(row.status),
                        background: `${statusColor(row.status)}18`,
                        textTransform: 'capitalize',
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: row.error ? 'var(--rose)' : 'var(--text-muted)', fontFamily: row.error ? undefined : 'monospace' }}>
                      {row.error ?? row.slug ?? 'Validated'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'error' | 'warning' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.3rem 0.65rem',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--border)',
      background: tone === 'error' ? 'rgba(244,63,94,0.08)' : tone === 'warning' ? 'rgba(245,158,11,0.1)' : 'var(--bg)',
      color: tone === 'error' ? 'var(--rose)' : tone === 'warning' ? 'var(--amber)' : 'var(--text-secondary)',
      fontWeight: 600,
    }}>
      {label}: <strong>{value}</strong>
    </span>
  );
}

function statusColor(status: BatchRowResult['status']) {
  if (status === 'created') return 'var(--emerald)';
  if (status === 'updated') return 'var(--emerald)';
  if (status === 'existing') return 'var(--accent)';
  if (status === 'archive_candidate' || status === 'archived') return 'var(--amber)';
  if (status === 'failed') return 'var(--rose)';
  return 'var(--text-muted)';
}

const thStyle: CSSProperties = {
  padding: '0.65rem 0.75rem',
  textAlign: 'left',
  color: 'var(--text-muted)',
  fontWeight: 700,
};

const tdStyle: CSSProperties = {
  padding: '0.65rem 0.75rem',
  color: 'var(--text-secondary)',
  verticalAlign: 'top',
};
