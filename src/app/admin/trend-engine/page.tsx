'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ExternalLink, Loader2, CheckSquare, Square,
  ChevronDown, ChevronUp, Rss, Sparkles, Clock, CheckCircle2,
  AlertCircle, Settings2, Zap,
} from 'lucide-react';
import type { ParsedArticle } from '@/lib/rss-parser';

const TIER_LABEL: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3' };
const TIER_COLOR: Record<number, string> = {
  1: '#4f6ef7',
  2: '#0ea5e9',
  3: '#6b7280',
};

const FREQ_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  twice_daily: '2× Daily',
  daily: 'Daily',
  paused: 'Pause auto-posting',
};

type TrendStatus = 'idle' | 'fetching' | 'loaded' | 'error';
type GenStatus = 'idle' | 'generating' | 'done' | 'error';

interface CreateResult {
  created: string[];
  skipped: Array<{ title: string; reason: string }>;
}

interface GenResult {
  slug: string;
  title: string;
  courseTitle: string;
}

export default function TrendEnginePage() {
  // ── Article Generator state ─────────────────────────────────────────────────
  const [genMode, setGenMode] = useState<'manual' | 'auto'>('manual');
  const [genFreq, setGenFreq] = useState<string>('daily');
  const [autoApprove, setAutoApprove] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [genResult, setGenResult] = useState<GenResult & { published?: boolean } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // ── Trend Engine state ──────────────────────────────────────────────────────
  const [status, setStatus] = useState<TrendStatus>('idle');
  const [articles, setArticles] = useState<ParsedArticle[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [filterTier, setFilterTier] = useState<'all' | '1' | '2'>('all');

  // ── Load article gen settings on mount ─────────────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/article-gen');
      if (!res.ok) return;
      const data = await res.json();
      setGenMode(data.mode ?? 'manual');
      setGenFreq(data.frequency ?? 'daily');
      setAutoApprove(data.autoApprove ?? false);
      setLastRun(data.lastRun ?? null);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // ── Save mode + frequency settings ─────────────────────────────────────────
  async function saveSettings() {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_gen_mode: genMode, article_gen_frequency: genFreq, article_gen_auto_approve: String(autoApprove) }),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } finally {
      setSavingSettings(false);
    }
  }

  // ── Generate one article now ────────────────────────────────────────────────
  async function generateNow() {
    setGenStatus('generating');
    setGenResult(null);
    setGenError(null);
    try {
      const res = await fetch('/api/admin/article-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? 'Generation failed.');
        setGenStatus('error');
      } else {
        setGenResult({ slug: data.slug, title: data.title, courseTitle: data.courseTitle, published: data.published });
        setLastRun(new Date().toISOString());
        setGenStatus('done');
      }
    } catch {
      setGenError('Network error — please try again.');
      setGenStatus('error');
    }
  }

  // ── Trend Engine functions ──────────────────────────────────────────────────
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

  function selectAll() { setSelected(new Set(filtered.map(a => a.url))); }
  function clearAll() { setSelected(new Set()); }

  const filtered = articles.filter(a =>
    filterTier === 'all' ? true : String(a.sourceTier) === filterTier
  );
  const selectedCount = filtered.filter(a => selected.has(a.url)).length;

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>

      {/* ═══════════════════════════════════════════════════════════════════════
          ARTICLE GENERATOR
      ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={22} color="var(--accent)" />
              Article Generator
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 540 }}>
              Automatically generates human-readable AI articles from free Alison courses using web research and AI writing. Each article embeds the course card naturally mid-article.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Mode toggle */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Settings2 size={13} /> Generation Mode
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['manual', 'auto'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setGenMode(m)}
                  className={genMode === m ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                  style={{ textTransform: 'capitalize', minWidth: 90 }}
                >
                  {m === 'manual' ? 'Manual' : <><Zap size={13} /> Auto</>}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {genMode === 'manual'
                ? 'You trigger article generation manually using the button below.'
                : 'Articles are generated automatically on the schedule below. You can still trigger manually at any time.'}
            </p>
          </div>

          {/* Frequency (auto only) */}
          {genMode === 'auto' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Clock size={13} /> Frequency
              </p>
              <select
                className="input"
                value={genFreq}
                onChange={e => setGenFreq(e.target.value)}
                style={{ maxWidth: 220, fontSize: '0.875rem', height: 'auto', padding: '0.4rem 0.75rem' }}
              >
                {Object.entries(FREQ_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Auto-generated articles are saved as drafts and require editorial review before publishing.
              </p>
              <div style={{
                marginTop: '0.75rem', padding: '0.625rem 0.875rem',
                background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
              }}>
                <AlertCircle size={13} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--amber)', lineHeight: 1.5 }}>
                  <strong>Cron trigger not yet active.</strong> The frequency preference is saved, but automatic scheduling requires a Cloudflare Cron Trigger in <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.15)', padding: '0 3px', borderRadius: 3 }}>wrangler.toml</code>. Until then, use <em>Generate article now</em> to run manually.
                </p>
              </div>
            </div>
          )}

          {/* Auto-approve toggle */}
          <div style={{
            marginBottom: '1.25rem', padding: '0.875rem 1rem',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.2rem' }}>
                  Auto-approve editorial review
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {autoApprove
                    ? 'Articles skip the editorial queue and are marked approved. Publishing is still manual.'
                    : 'Articles are saved as drafts pending your editorial review before publishing.'}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={autoApprove}
                onClick={() => setAutoApprove(v => !v)}
                style={{
                  flexShrink: 0,
                  width: 44, height: 24,
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  background: autoApprove ? 'var(--accent)' : 'var(--border)',
                  transition: 'background 0.2s',
                  padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 3, left: autoApprove ? 23 : 3,
                  width: 18, height: 18,
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }} />
              </button>
            </div>
            <div style={{
              marginTop: '0.625rem', padding: '0.4rem 0.75rem',
              background: 'rgba(0,0,0,0.04)', borderRadius: 'var(--radius)',
              display: 'flex', gap: '0.375rem', alignItems: 'flex-start',
            }}>
              <AlertCircle size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Articles are never published automatically. Publishing always requires a manual action.
              </p>
            </div>
          </div>

          {/* Last run info */}
          {lastRun && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Clock size={12} />
              Last generated: {new Date(lastRun).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}

          {/* Save + Generate row */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {settingsLoaded && (
              <button
                className="btn btn-outline btn-sm"
                onClick={saveSettings}
                disabled={savingSettings}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {savingSettings
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : settingsSaved
                    ? <><CheckCircle2 size={13} color="var(--emerald)" /> Saved</>
                    : 'Save settings'}
              </button>
            )}

            <div style={{ height: 24, width: 1, background: 'var(--border)' }} />

            <button
              className="btn btn-primary"
              onClick={generateNow}
              disabled={genStatus === 'generating'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {genStatus === 'generating'
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating article…</>
                : <><Sparkles size={14} /> Generate article now</>}
            </button>

            {genStatus === 'generating' && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Searching the web and writing — this takes 15–40 seconds…
              </p>
            )}
          </div>

          {/* Generation result */}
          {genStatus === 'done' && genResult && (
            <div style={{
              marginTop: '1rem', padding: '0.875rem 1rem',
              background: genResult.published ? 'rgba(79,110,247,0.06)' : 'rgba(16,185,129,0.06)',
              border: `1px solid ${genResult.published ? 'rgba(79,110,247,0.2)' : 'rgba(16,185,129,0.25)'}`,
              borderRadius: 'var(--radius-md)',
            }}>
              <p style={{ fontWeight: 700, color: genResult.published ? 'var(--accent)' : 'var(--emerald)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <CheckCircle2 size={16} />
                {genResult.published ? 'Article published live' : 'Article saved as draft'}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <strong>{genResult.title}</strong>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Based on Alison course: <em>{genResult.courseTitle}</em>
                {genResult.published
                  ? ' · Now visible on the public site.'
                  : ' · Review and publish from Curated Pages.'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!genResult.published && (
                  <a href="/admin/curated" className="btn btn-outline btn-sm" style={{ fontSize: '0.78rem' }}>
                    Review in Curated Pages →
                  </a>
                )}
                <a
                  href={`/curated/${genResult.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {genResult.published ? 'View live article' : 'Preview draft'} <ExternalLink size={11} />
                </a>
                <button className="btn btn-outline btn-sm" onClick={generateNow} style={{ fontSize: '0.78rem' }}>
                  Generate another
                </button>
              </div>
            </div>
          )}

          {genStatus === 'error' && genError && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            }}>
              <AlertCircle size={15} color="var(--rose)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--rose)', fontWeight: 600 }}>{genError}</p>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={generateNow}
                  style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TREND ENGINE (RSS-based)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Rss size={18} color="var(--teal)" />
              Trend Engine
            </h2>
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
                        <div style={{ flexShrink: 0, marginTop: 2, color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                            <span style={{
                              display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)',
                              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em',
                              color: TIER_COLOR[article.sourceTier],
                              background: `${TIER_COLOR[article.sourceTier]}20`,
                            }}>
                              {TIER_LABEL[article.sourceTier]}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {article.sourceName}
                            </span>
                            <span style={{
                              marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700,
                              color: article.score >= 55 ? 'var(--emerald)' : article.score >= 40 ? 'var(--amber)' : 'var(--text-muted)',
                            }}>
                              Score {article.score}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.375rem', lineHeight: 1.4 }}>
                            {article.title}
                          </p>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {isExpanded
                              ? article.contentText
                              : article.contentText.slice(0, 220) + (article.contentText.length > 220 ? '…' : '')}
                          </p>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.625rem', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '0.73rem', fontWeight: 600,
                              color: article.isComplete ? 'var(--emerald)' : 'var(--amber)',
                            }}>
                              {article.isComplete
                                ? `✓ Full article (${article.contentLength.toLocaleString()} chars)`
                                : `⚠ Partial (${article.contentLength} chars)`}
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
    </div>
  );
}
