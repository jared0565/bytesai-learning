'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, ExternalLink, Loader2, RotateCcw, Search, X } from 'lucide-react';

interface ProviderSummary {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  course_count: number;
}

interface DiscoveryJob {
  id: string;
  status: string;
  strategy_id: string;
  source_url: string | null;
  found_count: number;
  new_count: number;
  existing_count: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

interface DiscoveryCandidate {
  id: string;
  normalized_url: string;
  title: string;
  description: string | null;
  image_url: string | null;
  detected_content_type: string | null;
  detected_level: string | null;
  free_evidence: string | null;
  confidence: number;
  status: CandidateTab;
  existing_course_id: string | null;
  created_course_id: string | null;
  updated_at: string;
}

interface StrategyOption {
  id: string;
  label: string;
  defaultSourceUrl: string | null;
}

interface DiscoveryState {
  latestJob: DiscoveryJob | null;
  counts: Record<string, number>;
  candidates: DiscoveryCandidate[];
  strategies: StrategyOption[];
}

type CandidateTab = 'new' | 'existing' | 'approved' | 'ignored' | 'rejected' | 'stale' | 'failed';

const TABS: Array<{ id: CandidateTab; label: string }> = [
  { id: 'new', label: 'Candidates' },
  { id: 'existing', label: 'Existing' },
  { id: 'approved', label: 'Approved' },
  { id: 'ignored', label: 'Ignored' },
];

export default function CourseDiscoveryModal({
  provider,
  open,
  onClose,
}: {
  provider: ProviderSummary;
  open: boolean;
  onClose: () => void;
}) {
  const [state, setState] = useState<DiscoveryState | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<CandidateTab>('new');
  const [strategyId, setStrategyId] = useState('auto');
  const [sourceUrl, setSourceUrl] = useState('');
  const [limit, setLimit] = useState(25);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}/course-discovery?limit=100`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load discovery state.');
        return;
      }
      setState(data);
      const firstStrategy = data.strategies?.[0] as StrategyOption | undefined;
      setStrategyId(prev => prev === 'auto' ? (firstStrategy?.id ?? 'auto') : prev);
      setSourceUrl(prev => prev || firstStrategy?.defaultSourceUrl || provider.website_url || '');
    } catch {
      setError('Network error loading discovery state.');
    } finally {
      setLoading(false);
    }
  }, [provider.id, provider.website_url]);

  useEffect(() => {
    if (!open) return;
    loadState();
  }, [open, loadState]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const selectedStrategy = useMemo(
    () => state?.strategies.find(strategy => strategy.id === strategyId),
    [state?.strategies, strategyId]
  );

  const visibleCandidates = useMemo(
    () => state?.candidates.filter(candidate => candidate.status === tab) ?? [],
    [state?.candidates, tab]
  );

  if (!open) return null;

  async function runDiscovery() {
    setRunning(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}/course-discovery/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId,
          sourceUrl: sourceUrl.trim() || null,
          limit,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Discovery failed.');
        return;
      }
      setState({
        latestJob: data.job,
        counts: data.counts,
        candidates: data.candidates,
        strategies: state?.strategies ?? [],
      });
      setTab(data.counts?.new > 0 ? 'new' : 'existing');
    } catch {
      setError('Network error running discovery.');
    } finally {
      setRunning(false);
    }
  }

  async function reviewCandidate(candidateId: string, action: 'ignore' | 'reject' | 'restore') {
    setBusyCandidateId(candidateId);
    setError('');
    try {
      const res = await fetch(`/api/admin/course-discovery/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Candidate update failed.');
        return;
      }
      await loadState();
    } catch {
      setError('Network error updating candidate.');
    } finally {
      setBusyCandidateId(null);
    }
  }

  async function approveCandidate(candidate: DiscoveryCandidate) {
    setBusyCandidateId(candidate.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/course-discovery/candidates/${candidate.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: candidate.detected_content_type || 'course',
          level: candidate.detected_level || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to approve candidate.');
        return;
      }
      await loadState();
      setTab('approved');
    } catch {
      setError('Network error approving candidate.');
    } finally {
      setBusyCandidateId(null);
    }
  }

  return (
    <div
      role="presentation"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 650,
        background: 'oklch(0 0 0 / 0.46)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-discovery-title"
        onMouseDown={event => event.stopPropagation()}
        style={{
          width: 'min(1040px, 100%)',
          maxHeight: 'calc(100dvh - 2rem)',
          overflow: 'hidden',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h2 id="provider-discovery-title" style={{ fontSize: '1.125rem', fontWeight: 800 }}>
              {provider.name} course discovery
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {provider.course_count} published course{provider.course_count === 1 ? '' : 's'}
              {state?.latestJob ? ` · last run ${formatDate(state.latestJob.created_at)}` : ''}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close discovery modal" style={{ width: 44, height: 44, padding: 0 }}>
            <X size={18} />
          </button>
        </header>

        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 1 220px', minWidth: 160 }}>
              <label className="label">Strategy</label>
              <select
                className="input"
                value={strategyId}
                onChange={event => {
                  const next = event.target.value;
                  setStrategyId(next);
                  const strategy = state?.strategies.find(item => item.id === next);
                  if (strategy?.defaultSourceUrl) setSourceUrl(strategy.defaultSourceUrl);
                }}
                disabled={loading || running}
              >
                {(state?.strategies ?? [{ id: 'auto', label: 'Auto', defaultSourceUrl: null }]).map(strategy => (
                  <option key={strategy.id} value={strategy.id}>{strategy.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 320px', minWidth: 220 }}>
              <label className="label">Source URL</label>
              <input
                className="input"
                type="url"
                value={sourceUrl}
                onChange={event => setSourceUrl(event.target.value)}
                placeholder={selectedStrategy?.defaultSourceUrl || provider.website_url || 'https://provider.com/catalog'}
                disabled={loading || running}
              />
            </div>
            <div style={{ flex: '0 0 96px' }}>
              <label className="label">Limit</label>
              <select className="input" value={limit} onChange={event => setLimit(Number(event.target.value))} disabled={running}>
                {[10, 25, 50].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={runDiscovery} disabled={running || loading || !sourceUrl.trim()} style={{ flex: '0 0 auto' }}>
              {running ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
              {running ? 'Scanning' : 'Run discovery'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: '1rem 1.5rem 0', padding: '0.75rem 1rem', border: '1px solid oklch(0.62 0.20 15 / 0.25)', background: 'oklch(0.62 0.20 15 / 0.08)', color: 'var(--rose)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <nav style={{ padding: '1rem 1.5rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {TABS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="btn btn-sm"
              style={{
                background: tab === item.id ? 'var(--accent-soft)' : 'transparent',
                color: tab === item.id ? 'var(--accent)' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {item.label}
              <span style={{ color: 'var(--text-muted)' }}>{state?.counts?.[item.id] ?? 0}</span>
            </button>
          ))}
        </nav>

        <main style={{ padding: '1rem 1.5rem 1.5rem', overflowY: 'auto', minHeight: 320 }}>
          {loading ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 74 }} />)}
            </div>
          ) : visibleCandidates.length === 0 ? (
            <EmptyState tab={tab} latestJob={state?.latestJob ?? null} />
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {visibleCandidates.map(candidate => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  busy={busyCandidateId === candidate.id}
                  onApprove={() => approveCandidate(candidate)}
                  onIgnore={() => reviewCandidate(candidate.id, 'ignore')}
                  onReject={() => reviewCandidate(candidate.id, 'reject')}
                  onRestore={() => reviewCandidate(candidate.id, 'restore')}
                />
              ))}
            </div>
          )}
        </main>
      </section>
    </div>
  );
}

function CandidateRow({
  candidate,
  busy,
  onApprove,
  onIgnore,
  onReject,
  onRestore,
}: {
  candidate: DiscoveryCandidate;
  busy: boolean;
  onApprove: () => void;
  onIgnore: () => void;
  onReject: () => void;
  onRestore: () => void;
}) {
  return (
    <article style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', background: 'var(--bg-card)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '1rem', alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 750 }}>{candidate.title}</h3>
            <StatusBadge status={candidate.status} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round(candidate.confidence * 100)}% confidence</span>
          </div>
          <a href={candidate.normalized_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', maxWidth: '100%' }}>
            <span className="truncate">{candidate.normalized_url}</span>
            <ExternalLink size={12} style={{ flexShrink: 0 }} />
          </a>
          {candidate.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
              {candidate.description}
            </p>
          )}
          {candidate.free_evidence && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
              {candidate.free_evidence}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {candidate.status === 'new' && (
            <>
              <button className="btn btn-primary btn-sm" onClick={onApprove} disabled={busy}>
                {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />}
                Approve draft
              </button>
              <button className="btn btn-outline btn-sm" onClick={onIgnore} disabled={busy}>
                <Ban size={14} /> Ignore
              </button>
            </>
          )}
          {(candidate.status === 'ignored' || candidate.status === 'rejected') && (
            <button className="btn btn-outline btn-sm" onClick={onRestore} disabled={busy}>
              <RotateCcw size={14} /> Restore
            </button>
          )}
          {candidate.status === 'new' && (
            <button className="btn btn-ghost btn-sm" onClick={onReject} disabled={busy} style={{ color: 'var(--rose)' }}>
              Reject
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'new' ? 'var(--emerald)' : status === 'approved' ? 'var(--accent)' : status === 'existing' ? 'var(--teal)' : 'var(--text-muted)';
  const bg = status === 'new' ? 'var(--emerald-soft)' : status === 'approved' ? 'var(--accent-soft)' : status === 'existing' ? 'var(--teal-soft)' : 'var(--bg-alt)';
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: bg, color }}>
      {status}
    </span>
  );
}

function EmptyState({ tab, latestJob }: { tab: CandidateTab; latestJob: DiscoveryJob | null }) {
  if (!latestJob) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No discovery runs yet</p>
        <p style={{ fontSize: '0.875rem' }}>Choose a source URL and run discovery to create a review queue for this provider.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
        No {tab === 'new' ? 'new candidates' : tab} in this queue
      </p>
      <p style={{ fontSize: '0.875rem' }}>
        Last run found {latestJob.found_count} item{latestJob.found_count === 1 ? '' : 's'} from {formatSourceHost(latestJob.source_url)}.
      </p>
    </div>
  );
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatSourceHost(value: string | null): string {
  if (!value) return 'the selected source';
  try {
    return new URL(value).hostname;
  } catch {
    return 'the selected source';
  }
}
