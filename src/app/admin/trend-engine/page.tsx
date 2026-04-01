'use client';



import { useState } from 'react';
import { RefreshCw, ExternalLink, Loader2, CheckSquare, Square, ChevronDown, ChevronUp, Rss } from 'lucide-react';
import type { ParsedArticle } from '@/lib/rss-parser';

const TIER_LABEL: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3' };
const TIER_COLOR: Record<number, string> = {
  1: '#4f6ef7',
  2: '#0ea5e9',
  3: '#6b7280',
};

type Status = 'idle' | 'fetching' | 'loaded' | 'error';

interface CreateResult {
  created: string[];
  skipped: Array<{ title: string; reason: string }>;
}

export default function TrendEnginePage() {
  const [status, setStatus] = useState<Status>('idle');
  const [articles, setArticles] = useState<ParsedArticle[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [filterTier, setFilterTier] = useState<'all' | '1' | '2'>('all');

  async function fetchArticles() {
    setStatus('fetching');
    setArticles([]);
    setSelected(new Set());
    setResult(null);
    try {
      const res = await fetch('/api/admin/trend-engine');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setArticles(data.articles ?? []);
      setStatus('loaded');
    } catch {
      setStatus('error');
    }
  }

  async function createDrafts() {
    const toCreate = articles.filter(a => selected.has(a.url));
    if (toCreate.length === 0) return;
    setCreating(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/trend-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: toCreate }),
      });
      const data = await res.json();
      setResult(data);
      // Deselect created ones
      if (data.created?.length) {
        const createdSlugs = new Set<string>(data.created);
        setSelected(prev => {
          const next = new Set(prev);
          for (const a of toCreate) {
            const slug = a.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);
            if (createdSlugs.has(slug)) next.delete(a.url);
          }
          return next;
        });
      }
    } finally {
      setCreating(false);
    }
  }

  function toggleSelect(url: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  }

  function toggleExpand(url: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map(a => a.url)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const filtered = articles.filter(a =>
    filterTier === 'all' ? true : String(a.sourceTier) === filterTier
  );

  const selectedCount = filtered.filter(a => selected.has(a.url)).length;

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Trend Engine</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 520 }}>
            Fetches latest articles from {14} authoritative AI sources, scores them by tier, recency and completeness, and auto-drafts curated pages with all fields pre-filled.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={fetchArticles}
          disabled={status === 'fetching'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          {status === 'fetching'
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Fetching…</>
            : <><RefreshCw size={15} /> Fetch latest articles</>
          }
        </button>
      </div>

      {/* Source legend */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.25rem' }}>SOURCES</span>
        {([1, 2] as const).map(t => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: TIER_COLOR[t], display: 'inline-block' }} />
            <span style={{ fontWeight: 600, color: TIER_COLOR[t] }}>Tier {t}</span>
            <span style={{ color: 'var(--text-muted)' }}>{t === 1 ? '— Official AI lab / research blogs' : '— Reputable tech & science media'}</span>
          </span>
        ))}
      </div>

      {/* Error */}
      {status === 'error' && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--rose)', fontWeight: 600 }}>Failed to fetch articles — check network or try again.</p>
        </div>
      )}

      {/* Loading */}
      {status === 'fetching' && (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Fetching articles and retrieving full content…</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.375rem' }}>This may take up to 30 seconds.</p>
        </div>
      )}

      {/* Results */}
      {status === 'loaded' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {filtered.length} article{filtered.length !== 1 ? 's' : ''}
            </span>

            <select
              className="input"
              value={filterTier}
              onChange={e => setFilterTier(e.target.value as typeof filterTier)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: 'auto', width: 'auto' }}
            >
              <option value="all">All tiers</option>
              <option value="1">Tier 1 only</option>
              <option value="2">Tier 2 only</option>
            </select>

            <button className="btn btn-outline btn-sm" onClick={selectAll} style={{ fontSize: '0.8rem' }}>Select all</button>
            {selected.size > 0 && (
              <button className="btn btn-outline btn-sm" onClick={clearAll} style={{ fontSize: '0.8rem' }}>Clear</button>
            )}

            <div style={{ marginLeft: 'auto' }}>
              <button
                className="btn btn-primary"
                onClick={createDrafts}
                disabled={selectedCount === 0 || creating}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {creating
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</>
                  : `Create ${selectedCount > 0 ? selectedCount : ''} draft${selectedCount !== 1 ? 's' : ''}`
                }
              </button>
            </div>
          </div>

          {/* Result banner */}
          {result && (
            <div className="card" style={{
              padding: '1rem 1.25rem', marginBottom: '1.25rem',
              borderLeft: `3px solid ${result.created.length > 0 ? 'var(--emerald)' : 'var(--amber)'}`,
            }}>
              {result.created.length > 0 && (
                <p style={{ fontWeight: 700, color: 'var(--emerald)', marginBottom: result.skipped.length > 0 ? '0.5rem' : 0 }}>
                  ✓ {result.created.length} draft page{result.created.length !== 1 ? 's' : ''} created:{' '}
                  {result.created.map((s, i) => (
                    <span key={s}>
                      <a href={`/admin/curated`} style={{ color: 'var(--teal)', textDecoration: 'underline', fontSize: '0.875rem' }}>{s}</a>
                      {i < result.created.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              )}
              {result.skipped.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--amber)' }}>
                  Skipped: {result.skipped.map(s => `${s.title} (${s.reason})`).join(' · ')}
                </p>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <Rss size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: 600 }}>No articles found matching the filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map(article => {
                const isSelected = selected.has(article.url);
                const isExpanded = expanded.has(article.url);
                return (
                  <div
                    key={article.url}
                    className="card"
                    style={{
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      transition: 'border-color 0.15s',
                    }}
                    onClick={() => toggleSelect(article.url)}
                  >
                    <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                      {/* Checkbox */}
                      <div style={{ flexShrink: 0, marginTop: 2, color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                          {/* Tier badge */}
                          <span style={{
                            display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)',
                            fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em',
                            color: TIER_COLOR[article.sourceTier],
                            background: `${TIER_COLOR[article.sourceTier]}20`,
                          }}>
                            {TIER_LABEL[article.sourceTier]}
                          </span>

                          {/* Source name */}
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {article.sourceName}
                          </span>

                          {/* Score */}
                          <span style={{
                            marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700,
                            color: article.score >= 55 ? 'var(--emerald)' : article.score >= 40 ? 'var(--amber)' : 'var(--text-muted)',
                          }}>
                            Score {article.score}
                          </span>

                          {/* Date */}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(article.publishedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Title */}
                        <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.375rem', lineHeight: 1.4 }}>
                          {article.title}
                        </p>

                        {/* Preview */}
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          {isExpanded
                            ? article.contentText
                            : article.contentText.slice(0, 220) + (article.contentText.length > 220 ? '…' : '')}
                        </p>

                        {/* Footer row */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.625rem', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.73rem', fontWeight: 600,
                            color: article.isComplete ? 'var(--emerald)' : 'var(--amber)',
                          }}>
                            {article.isComplete ? `✓ Full article (${article.contentLength.toLocaleString()} chars)` : `⚠ Partial (${article.contentLength} chars)`}
                          </span>

                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.73rem', padding: '0.15rem 0.5rem', height: 'auto' }}
                            onClick={e => { e.stopPropagation(); toggleExpand(article.url); }}
                          >
                            {isExpanded ? <><ChevronUp size={11} /> Less</> : <><ChevronDown size={11} /> More</>}
                          </button>

                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.73rem', color: 'var(--teal)', marginLeft: 'auto' }}
                            onClick={e => e.stopPropagation()}
                          >
                            Read article <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Idle state */}
      {status === 'idle' && (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Rss size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 1.25rem' }} />
          <p style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '0.5rem' }}>Ready to fetch</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 380, margin: '0 auto 1.5rem' }}>
            Click <strong>Fetch latest articles</strong> to pull from 14 authoritative AI sources. Complete article text will be retrieved and all curated page fields auto-filled.
          </p>
          <button className="btn btn-primary" onClick={fetchArticles} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={15} /> Fetch latest articles
          </button>
        </div>
      )}
    </div>
  );
}
