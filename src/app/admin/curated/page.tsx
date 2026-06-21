'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FileText, ExternalLink, Plus, BookOpen, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import CuratedActions from './CuratedActions';
import NewCuratedPageModal from './NewCuratedPageModal';
import EditCuratedPageModal from './EditCuratedPageModal';

interface CuratedRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  why_it_matters: string | null;
  what_changed: string | null;
  executive_implications: string | null;
  meta_description: string | null;
  primary_course_slug: string | null;
  categories_json: string | null;
  editorial_review_status: string;
  published_status: string;
  view_count: number;
  last_viewed_at: string | null;
  referrer_counts_json: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

const REFERRER_LABELS: Record<string, string> = {
  twitter: 'X', linkedin: 'LinkedIn', facebook: 'FB', whatsapp: 'WA',
  reddit: 'Reddit', hackernews: 'HN', google: 'Google', bing: 'Bing',
  internal: 'Internal', other: 'Other', direct: 'Direct',
};

function getTopReferrers(json: string | null, topN = 3): { key: string; label: string; count: number }[] {
  if (!json) return [];
  try {
    const counts: Record<string, number> = JSON.parse(json);
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([key, count]) => ({ key, label: REFERRER_LABELS[key] ?? key, count }));
  } catch { return []; }
}

// ── Improvement tips (rule-based, instant) ────────────────────────────────────
interface Tip { level: 'error' | 'warn' | 'info'; text: string }

function getTips(p: CuratedRow): Tip[] {
  const tips: Tip[] = [];

  // ── Content errors (blocking) ────────────────────────────────────────────
  if (!p.why_it_matters) tips.push({ level: 'error', text: '"Why it matters" is empty — readers need this section most.' });
  if (!p.what_changed)   tips.push({ level: 'error', text: '"What changed" is empty — the key facts are missing.' });
  if (!p.executive_implications) tips.push({ level: 'error', text: '"Key implications" is empty — no actionable takeaway for readers.' });

  // ── SEO / monetisation warnings ──────────────────────────────────────────
  if (!p.primary_course_slug) tips.push({ level: 'warn', text: 'No course linked — add a primary course slug to monetise this article.' });
  if (!p.meta_description) tips.push({ level: 'warn', text: 'No meta description — add one to improve search ranking.' });
  if (p.summary && p.summary.length > 400) tips.push({ level: 'warn', text: 'Summary is too long — aim for 2–3 sentences max.' });
  if (p.meta_description && p.meta_description.length > 155) tips.push({ level: 'warn', text: `Meta description is ${p.meta_description.length} chars — trim to under 155.` });
  if (p.published_status === 'published' && p.editorial_review_status !== 'approved') {
    tips.push({ level: 'warn', text: 'Published but not approved — set editorial status to "approved".' });
  }

  // ── Status nudges ────────────────────────────────────────────────────────
  if (p.published_status === 'draft' && p.editorial_review_status === 'approved') {
    tips.push({ level: 'info', text: 'Approved but still draft — ready to publish!' });
  }

  // ── Growth tips (only for published articles) ────────────────────────────
  if (p.published_status === 'published') {
    if (p.view_count === 0) {
      tips.push({ level: 'info', text: 'No views yet — share to X and LinkedIn within the hour for fastest initial reach.' });
    } else if (p.view_count < 10) {
      tips.push({ level: 'info', text: `${p.view_count} view${p.view_count !== 1 ? 's' : ''} — submit to Hacker News (Show HN) or r/artificial to accelerate growth.` });
    }

    // Check if traffic is all from one source (no diversity)
    const referrers = getTopReferrers(p.referrer_counts_json, 5);
    const totalViews = referrers.reduce((s, r) => s + r.count, 0);
    if (totalViews > 5 && referrers.length === 1) {
      tips.push({ level: 'info', text: `All traffic from ${referrers[0].label} — cross-post to other platforms to diversify reach.` });
    }

    // No social traffic at all
    const socialKeys = ['twitter', 'linkedin', 'facebook', 'whatsapp', 'reddit', 'hackernews'];
    const hasSocial = referrers.some(r => socialKeys.includes(r.key));
    if (p.view_count >= 5 && !hasSocial) {
      tips.push({ level: 'info', text: 'No social traffic detected — use the Share button on the article to post platform-optimised copy.' });
    }
  }

  return tips;
}

const editorialColor: Record<string, string> = {
  draft: 'var(--text-muted)',
  in_review: 'var(--amber)',
  approved: 'var(--teal)',
  rejected: 'var(--rose)',
};

const publishedColor: Record<string, string> = {
  published: 'var(--emerald)',
  draft: 'var(--amber)',
  archived: 'var(--text-muted)',
};

export default function AdminCuratedPage() {
  const [pages, setPages] = useState<CuratedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Fill-rationale state ─────────────────────────────────────────────────────
  const [rationaleStats, setRationaleStats] = useState<{ missing: number } | null>(null);
  const [rationaleRunning, setRationaleRunning] = useState(false);
  const [rationaleDone, setRationaleDone] = useState(false);
  const [rationaleProcessed, setRationaleProcessed] = useState(0);
  const [rationaleFailed, setRationaleFailed] = useState(0);

  // ── Regenerate state ────────────────────────────────────────────────────────
  const [regenStats, setRegenStats] = useState<{ total: number; needsRegen: number } | null>(null);
  const [regenRunning, setRegenRunning] = useState(false);
  const [regenDone, setRegenDone] = useState(false);
  const [regenProcessed, setRegenProcessed] = useState(0);
  const [regenFailed, setRegenFailed] = useState(0);

  // ── Framework refresh state ─────────────────────────────────────────────────
  const [refreshStats, setRefreshStats] = useState<{ published: number; refreshable: number } | null>(null);
  const [refreshRunning, setRefreshRunning] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);
  const [refreshProcessed, setRefreshProcessed] = useState(0);
  const [refreshFailed, setRefreshFailed] = useState(0);

  useEffect(() => {
    fetch('/api/admin/curated')
      .then(r => r.json())
      .then(d => { if (d.pages) setPages(d.pages); })
      .finally(() => setLoading(false));
    // Load regen stats
    fetch('/api/admin/curated/regenerate')
      .then(r => r.json())
      .then(d => { if (d.total !== undefined) setRegenStats(d); })
      .catch(() => {});
    // Load rationale stats
    fetch('/api/admin/curated/fill-rationale')
      .then(r => r.json())
      .then(d => { if (d.missing !== undefined) setRationaleStats(d); })
      .catch(() => {});
    // Load framework refresh stats
    fetch('/api/admin/curated/refresh-framework')
      .then(r => r.json())
      .then(d => { if (d.published !== undefined) setRefreshStats(d); })
      .catch(() => {});
  }, []);

  // Run one batch of regeneration, loop until done
  const runRegen = useCallback(async () => {
    setRegenRunning(true);
    setRegenDone(false);
    setRegenProcessed(0);
    setRegenFailed(0);
    let remaining = regenStats?.needsRegen ?? 1;
    let processed = 0;
    let failed = 0;

    while (remaining > 0) {
      try {
        const res = await fetch('/api/admin/curated/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) break;
        processed += data.processed ?? 0;
        failed += data.failed ?? 0;
        remaining = data.remaining ?? 0;
        setRegenProcessed(processed);
        setRegenFailed(failed);
        if (data.processed === 0) break; // nothing left to process
      } catch {
        break;
      }
    }

    setRegenRunning(false);
    setRegenDone(true);
    // Refresh stats
    fetch('/api/admin/curated/regenerate').then(r => r.json()).then(d => { if (d.total !== undefined) setRegenStats(d); });
    // Refresh page list
    fetch('/api/admin/curated').then(r => r.json()).then(d => { if (d.pages) setPages(d.pages); });
  }, [regenStats]);

  const runFillRationale = useCallback(async () => {
    setRationaleRunning(true);
    setRationaleDone(false);
    setRationaleProcessed(0);
    setRationaleFailed(0);
    let remaining = rationaleStats?.missing ?? 1;
    let processed = 0;
    let failed = 0;

    while (remaining > 0) {
      try {
        const res = await fetch('/api/admin/curated/fill-rationale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) break;
        processed += data.processed ?? 0;
        failed += data.failed ?? 0;
        remaining = data.remaining ?? 0;
        setRationaleProcessed(processed);
        setRationaleFailed(failed);
        if (data.processed === 0) break;
      } catch {
        break;
      }
    }

    setRationaleRunning(false);
    setRationaleDone(true);
    fetch('/api/admin/curated/fill-rationale').then(r => r.json()).then(d => { if (d.missing !== undefined) setRationaleStats(d); });
  }, [rationaleStats]);

  function handleUpdate(id: string, updates: Record<string, string | null>) {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } as CuratedRow : p));
  }

  // Run one batch of framework refresh, loop until done
  const runFrameworkRefresh = useCallback(async () => {
    setRefreshRunning(true);
    setRefreshDone(false);
    setRefreshProcessed(0);
    setRefreshFailed(0);
    let remaining = refreshStats?.published ?? 1;
    let processed = 0;
    let failed = 0;
    const seenIds = new Set<string>();
    let iterations = 0;
    const maxIterations = 50; // safety net against infinite loops

    while (remaining > 0 && iterations < maxIterations) {
      iterations++;
      try {
        const res = await fetch('/api/admin/curated/refresh-framework', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) break;

        const batchIds: string[] = data.ids ?? [];
        const duplicateCount = batchIds.filter(id => seenIds.has(id)).length;
        batchIds.forEach(id => seenIds.add(id));

        processed += data.processed ?? 0;
        failed += data.failed ?? 0;
        remaining = data.remaining ?? 0;
        setRefreshProcessed(processed);
        setRefreshFailed(failed);

        // Stop if no progress, or if we see duplicates (cycle detected)
        if (data.processed === 0 && data.failed === 0) break;
        if (duplicateCount > 0 && data.processed === duplicateCount) break;
      } catch {
        break;
      }
    }

    setRefreshRunning(false);
    setRefreshDone(true);
    fetch('/api/admin/curated/refresh-framework')
      .then(r => r.json())
      .then(d => { if (d.published !== undefined) setRefreshStats(d); });
    fetch('/api/admin/curated')
      .then(r => r.json())
      .then(d => { if (d.pages) setPages(d.pages); });
  }, [refreshStats]);

  function handleCreated(page: { id: string; slug: string; title: string }) {
    setShowNewModal(false);
    setPages(prev => [{
      id: page.id,
      slug: page.slug,
      title: page.title,
      summary: null,
      why_it_matters: null,
      what_changed: null,
      executive_implications: null,
      meta_description: null,
      primary_course_slug: null,
      categories_json: null,
      editorial_review_status: 'draft',
      published_status: 'draft',
      view_count: 0,
      last_viewed_at: null,
      referrer_counts_json: null,
      last_verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, ...prev]);
  }

  function handleSaved(id: string, updates: Record<string, string | null>) {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } as CuratedRow : p));
    setEditingId(null);
  }

  function handleDeleted(id: string) {
    setPages(prev => prev.filter(p => p.id !== id));
  }

  const publishedCount = pages.filter(p => p.published_status === 'published').length;
  const draftCount = pages.filter(p => p.published_status === 'draft').length;

  return (
    <div style={{ padding: '2rem', maxWidth: 1200 }}>
      {showNewModal && (
        <NewCuratedPageModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}
      {editingId && (
        <EditCuratedPageModal
          pageId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Curated Pages</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {pages.length} total
            </p>
            {publishedCount > 0 && (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--emerald)', background: 'rgba(16,185,129,0.1)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                {publishedCount} published
              </span>
            )}
            {draftCount > 0 && (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                {draftCount} draft
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowNewModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Plus size={14} /> New article
          </button>
          <Link
            href="/curated"
            target="_blank"
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            View public page <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* ── Regenerate panel — shown when articles have missing fields ── */}
      {regenStats && regenStats.needsRegen > 0 && !regenDone && (
        <div style={{
          marginBottom: '1.25rem', padding: '1rem 1.25rem',
          background: 'rgba(79,110,247,0.06)', border: '1px solid rgba(79,110,247,0.2)',
          borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem',
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Sparkles size={15} color="var(--accent)" />
              {regenStats.needsRegen} article{regenStats.needsRegen !== 1 ? 's' : ''} need{regenStats.needsRegen === 1 ? 's' : ''} AI restructuring
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              These articles have empty fields (Why it matters, What changed, Key implications). Click to re-fetch each source and use AI to properly fill all fields.
            </p>
            {regenRunning && (
              <p style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Processed {regenProcessed} so far{regenFailed > 0 ? ` · ${regenFailed} failed` : ''} — working through the batch…
              </p>
            )}
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={runRegen}
            disabled={regenRunning}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
          >
            {regenRunning
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Regenerating…</>
              : <><Sparkles size={13} /> Regenerate all</>}
          </button>
        </div>
      )}

      {/* Success banner after regen */}
      {regenDone && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.875rem 1.25rem',
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'center',
        }}>
          <CheckCircle2 size={16} color="var(--emerald)" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--emerald)' }}>
              Regeneration complete — {regenProcessed} article{regenProcessed !== 1 ? 's' : ''} restructured
              {regenFailed > 0 && <span style={{ color: 'var(--amber)', fontWeight: 400, marginLeft: '0.5rem' }}>({regenFailed} failed — open each to check source content)</span>}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
              All fields are now populated. Review each article using the Edit button before publishing.
            </p>
          </div>
          {regenStats && regenStats.needsRegen > 0 && (
            <button className="btn btn-outline btn-sm" onClick={runRegen} style={{ flexShrink: 0, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={12} /> {regenStats.needsRegen} remaining
            </button>
          )}
        </div>
      )}

      {/* ── Framework refresh panel — for all published articles ── */}
      {refreshStats && refreshStats.published > 0 && !refreshDone && (
        <div style={{
          marginBottom: '1.25rem', padding: '1rem 1.25rem',
          background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem',
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Sparkles size={15} color="#7c3aed" />
              Apply Executive Briefing Standard to {refreshStats.published} published article{refreshStats.published !== 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Re-fetches each primary source and rewrites content to the framework: TL;DR bullets, quantified claims, risk + opportunity framing, and time-boxed actions. Review after running.
            </p>
            {refreshRunning && (
              <p style={{ fontSize: '0.78rem', color: '#7c3aed', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Processed {refreshProcessed} so far{refreshFailed > 0 ? ` · ${refreshFailed} failed` : ''} — working through the batch…
              </p>
            )}
          </div>
          <button
            className="btn btn-sm"
            onClick={runFrameworkRefresh}
            disabled={refreshRunning}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap', background: '#7c3aed', color: '#fff', border: 'none' }}
          >
            {refreshRunning
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Refreshing…</>
              : <><Sparkles size={13} /> Apply framework</>}
          </button>
        </div>
      )}

      {refreshDone && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.875rem 1.25rem',
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'center',
        }}>
          <CheckCircle2 size={16} color="var(--emerald)" style={{ flexShrink: 0 }} />
          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--emerald)' }}>
            Framework refresh complete — {refreshProcessed} article{refreshProcessed !== 1 ? 's' : ''} updated
            {refreshFailed > 0 && <span style={{ color: 'var(--amber)', fontWeight: 400, marginLeft: '0.5rem' }}>({refreshFailed} failed — open each to check source content)</span>}
          </p>
        </div>
      )}

      {/* ── Fill rationale panel ── */}
      {rationaleStats && rationaleStats.missing > 0 && !rationaleDone && (
        <div style={{
          marginBottom: '1.25rem', padding: '1rem 1.25rem',
          background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)',
          borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem',
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <BookOpen size={15} color="var(--teal)" />
              {rationaleStats.missing} article{rationaleStats.missing !== 1 ? 's' : ''} missing a course rationale
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              These articles have a linked course but no editorial rationale paragraph. Click to generate one for each using AI.
            </p>
            {rationaleRunning && (
              <p style={{ fontSize: '0.78rem', color: 'var(--teal)', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Generated {rationaleProcessed} so far{rationaleFailed > 0 ? ` · ${rationaleFailed} failed` : ''} — working through the batch…
              </p>
            )}
          </div>
          <button
            className="btn btn-sm"
            onClick={runFillRationale}
            disabled={rationaleRunning}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap', background: 'var(--teal)', color: '#fff', border: 'none' }}
          >
            {rationaleRunning
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><BookOpen size={13} /> Fill all rationales</>}
          </button>
        </div>
      )}

      {rationaleDone && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.875rem 1.25rem',
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'center',
        }}>
          <CheckCircle2 size={16} color="var(--emerald)" style={{ flexShrink: 0 }} />
          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--emerald)' }}>
            Rationale generation complete — {rationaleProcessed} article{rationaleProcessed !== 1 ? 's' : ''} updated
            {rationaleFailed > 0 && <span style={{ color: 'var(--amber)', fontWeight: 400, marginLeft: '0.5rem' }}>({rationaleFailed} failed — check course slug is valid)</span>}
          </p>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
        </div>
      ) : pages.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <FileText size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No curated pages yet</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 360, margin: '0 auto 1.5rem' }}>
            Use <strong>New article</strong> to write one manually, or head to
            the <strong>Trend Engine</strong> to generate articles from RSS or Alison courses.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <Plus size={14} /> New article
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {pages.map(p => {
            const tips = getTips(p);
            const errorTips = tips.filter(t => t.level === 'error');
            const warnTips = tips.filter(t => t.level === 'warn');
            const infoTips = tips.filter(t => t.level === 'info');
            const topTip = errorTips[0] ?? warnTips[0] ?? infoTips[0] ?? null;

            return (
            <div
              key={p.id}
              className="card"
              style={{ padding: '1rem 1.25rem' }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* Left: title + summary + meta + analytics + tip */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  {/* Status badges */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.7rem', fontWeight: 700,
                      color: editorialColor[p.editorial_review_status] ?? 'var(--text-muted)',
                      background: `${editorialColor[p.editorial_review_status] ?? 'var(--text-muted)'}18`,
                    }}>
                      {p.editorial_review_status}
                    </span>
                    <span style={{
                      display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.7rem', fontWeight: 700,
                      color: publishedColor[p.published_status] ?? 'var(--text-muted)',
                      background: `${publishedColor[p.published_status] ?? 'var(--text-muted)'}18`,
                    }}>
                      {p.published_status}
                    </span>
                    {/* View count badge */}
                    {p.published_status === 'published' && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                        fontSize: '0.7rem', fontWeight: 700,
                        color: p.view_count > 0 ? 'var(--accent)' : 'var(--text-muted)',
                        background: p.view_count > 0 ? 'rgba(79,110,247,0.1)' : 'var(--bg)',
                        border: '1px solid var(--border)',
                      }}>
                        👁 {p.view_count.toLocaleString()} view{p.view_count !== 1 ? 's' : ''}
                        {p.last_viewed_at && (
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                            · last {new Date(p.last_viewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </span>
                    )}
                    {/* Top referrer sources */}
                    {p.published_status === 'published' && p.view_count > 0 && (() => {
                      const refs = getTopReferrers(p.referrer_counts_json, 3);
                      if (!refs.length) return null;
                      return (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                          fontSize: '0.7rem', fontWeight: 600,
                          color: 'var(--text-muted)', background: 'var(--bg)',
                          border: '1px solid var(--border)',
                        }}>
                          🔗 {refs.map(r => `${r.label} ${r.count}`).join(' · ')}
                        </span>
                      );
                    })()}
                    {/* Tips indicator */}
                    {tips.length > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                        padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                        fontSize: '0.7rem', fontWeight: 700,
                        color: errorTips.length > 0 ? 'var(--rose)' : warnTips.length > 0 ? 'var(--amber)' : 'var(--teal)',
                        background: errorTips.length > 0 ? 'rgba(239,68,68,0.1)' : warnTips.length > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(20,184,166,0.1)',
                      }}>
                        {errorTips.length > 0 ? '⚠' : warnTips.length > 0 ? '💡' : '✓'} {tips.length} tip{tips.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.4, marginBottom: '0.25rem' }}>
                    {p.title}
                  </p>

                  {/* Category tags */}
                  {p.categories_json && (() => {
                    try {
                      const cats: string[] = JSON.parse(p.categories_json);
                      if (!cats.length) return null;
                      return (
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                          {cats.map(cat => (
                            <span key={cat} style={{
                              fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.45rem',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(79,110,247,0.08)', color: 'var(--accent)',
                              border: '1px solid rgba(79,110,247,0.2)',
                            }}>{cat}</span>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })()}

                  {p.summary && (
                    <p style={{
                      fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      marginBottom: '0.375rem',
                    }}>
                      {p.summary}
                    </p>
                  )}

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: topTip ? '0.5rem' : 0 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      /curated/{p.slug}
                    </span>
                    {p.primary_course_slug && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <BookOpen size={10} /> {p.primary_course_slug}
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Updated {new Date(p.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Top improvement tip */}
                  {topTip && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'flex-start', gap: '0.375rem',
                      padding: '0.375rem 0.625rem',
                      background: topTip.level === 'error' ? 'rgba(239,68,68,0.06)'
                        : topTip.level === 'warn' ? 'rgba(245,158,11,0.06)'
                        : 'rgba(20,184,166,0.06)',
                      border: `1px solid ${topTip.level === 'error' ? 'rgba(239,68,68,0.2)'
                        : topTip.level === 'warn' ? 'rgba(245,158,11,0.2)'
                        : 'rgba(20,184,166,0.2)'}`,
                      borderRadius: 'var(--radius)',
                      maxWidth: '100%',
                    }}>
                      <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }}
                        color={topTip.level === 'error' ? 'var(--rose)' : topTip.level === 'warn' ? 'var(--amber)' : 'var(--teal)'} />
                      <p style={{
                        fontSize: '0.72rem', lineHeight: 1.5,
                        color: topTip.level === 'error' ? 'var(--rose)' : topTip.level === 'warn' ? 'var(--amber)' : 'var(--teal)',
                      }}>
                        {topTip.text}
                        {tips.length > 1 && (
                          <span style={{ opacity: 0.7, marginLeft: '0.25rem' }}>
                            (+{tips.length - 1} more — click Edit)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: actions */}
                <div style={{ flexShrink: 0 }}>
                  <CuratedActions
                    pageId={p.id}
                    slug={p.slug}
                    editorialStatus={p.editorial_review_status}
                    publishedStatus={p.published_status}
                    onUpdate={handleUpdate}
                    onEdit={id => setEditingId(id)}
                    onDelete={handleDeleted}
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
