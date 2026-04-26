'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Loader2, ExternalLink, AlertCircle, Sparkles,
  Printer, Copy, CheckCircle2, Maximize2, Minimize2,
  Save, Link2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  why_it_matters: string | null;
  what_changed: string | null;
  executive_implications: string | null;
  primary_course_rationale: string | null;
  primary_course_slug: string | null;
  categories_json: string | null;
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

// ── Constants ─────────────────────────────────────────────────────────────────

const EDITORIAL_OPTIONS = ['draft', 'in_review', 'approved', 'rejected'] as const;
const PUBLISHED_OPTIONS = ['draft', 'published', 'archived'] as const;

const REWRITE_OPTIONS = [
  { key: 'clarity',  icon: '✨', label: 'Improve clarity & flow' },
  { key: 'concise',  icon: '✂️', label: 'Make more concise' },
  { key: 'engaging', icon: '🔥', label: 'Make more engaging' },
  { key: 'seo',      icon: '📈', label: 'SEO-optimise' },
  { key: 'grammar',  icon: '🔧', label: 'Fix grammar & tone' },
  { key: 'expand',   icon: '📝', label: 'Expand with detail' },
  { key: 'simplify', icon: '💬', label: 'Simplify language' },
] as const;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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

// ── SmartTextarea ─────────────────────────────────────────────────────────────
// Self-contained textarea with per-field AI rewrite + selection awareness

interface SmartTextareaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  articleTitle: string;
  required?: boolean;
  mono?: boolean;
}

function SmartTextarea({
  label, value, onChange, rows = 4, placeholder, hint,
  articleTitle, required, mono,
}: SmartTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteType, setRewriteType] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  function handleSelect() {
    const el = ref.current;
    if (!el) return;
    if (el.selectionStart !== el.selectionEnd) {
      setSelection({ start: el.selectionStart, end: el.selectionEnd });
    } else {
      setSelection(null);
    }
  }

  async function rewrite(instruction: string) {
    const el = ref.current;
    if (!el) return;
    const targetText = selection
      ? value.slice(selection.start, selection.end)
      : value;
    if (!targetText.trim()) return;

    setRewriteType(instruction);
    setRewriting(true);
    setDropOpen(false);

    // Save undo snapshot
    setHistory(h => [...h.slice(-9), value]);

    try {
      const res = await fetch('/api/admin/article-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: targetText, instruction, context: articleTitle }),
      });
      const data = await res.json();
      if (data.rewritten) {
        if (selection) {
          onChange(value.slice(0, selection.start) + data.rewritten + value.slice(selection.end));
        } else {
          onChange(data.rewritten);
        }
        setSelection(null);
      }
    } finally {
      setRewriting(false);
      setRewriteType('');
    }
  }

  function undoRewrite() {
    if (history.length === 0) return;
    onChange(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  const selLen = selection ? selection.end - selection.start : 0;
  const wc = wordCount(value);

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)',
  };
  const hintStyle: React.CSSProperties = {
    fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block',
  };

  return (
    <div style={{ marginBottom: '1.125rem' }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem', gap: '0.5rem' }}>
        <label style={labelStyle}>{label}{required && <span style={{ color: 'var(--rose)', marginLeft: 2 }}>*</span>}</label>

        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexShrink: 0 }}>
          {/* Selection / word count chip */}
          {selLen > 0 ? (
            <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600, background: 'rgba(79,110,247,0.1)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)' }}>
              {selLen} chars selected
            </span>
          ) : (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {wc} {wc === 1 ? 'word' : 'words'}
            </span>
          )}

          {/* Undo after rewrite */}
          {history.length > 0 && (
            <button
              type="button"
              onClick={undoRewrite}
              title="Undo last AI rewrite"
              className="btn btn-outline btn-sm"
              style={{ padding: '0.15rem 0.4rem', height: 'auto', fontSize: '0.7rem' }}
            >
              ↩ Undo
            </button>
          )}

          {/* AI Rewrite dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setDropOpen(v => !v)}
              disabled={rewriting}
              className="btn btn-outline btn-sm"
              style={{ padding: '0.15rem 0.5rem', height: 'auto', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent)', borderColor: 'rgba(79,110,247,0.35)' }}
            >
              {rewriting
                ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> {REWRITE_OPTIONS.find(o => o.key === rewriteType)?.label ?? 'Rewriting…'}</>
                : <><Sparkles size={11} />{selLen > 0 ? 'Rewrite selection' : 'AI Rewrite'}</>
              }
            </button>

            {dropOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '0.3rem',
                zIndex: 200, minWidth: 200,
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              }}>
                {selLen > 0 && (
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '0.2rem 0.5rem 0.4rem', borderBottom: '1px solid var(--border)', marginBottom: '0.25rem' }}>
                    Rewriting {selLen} selected characters
                  </p>
                )}
                {REWRITE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => rewrite(opt.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      width: '100%', textAlign: 'left',
                      padding: '0.45rem 0.625rem', fontSize: '0.8rem',
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,110,247,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ width: 18, textAlign: 'center' }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <textarea
        ref={ref}
        className="input"
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        onSelect={handleSelect}
        onMouseUp={handleSelect}
        onKeyUp={handleSelect}
        placeholder={placeholder}
        style={{
          resize: 'vertical', width: '100%',
          fontFamily: mono ? 'monospace' : undefined,
          fontSize: mono ? '0.875rem' : undefined,
          opacity: rewriting ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
      />
      {hint && <span style={hintStyle}>{hint}</span>}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function EditCuratedPageModal({ pageId, onClose, onSaved }: Props) {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [whyItMatters, setWhyItMatters] = useState('');
  const [whatChanged, setWhatChanged] = useState('');
  const [executiveImplications, setExecutiveImplications] = useState('');
  const [primaryCourseRationale, setPrimaryCourseRationale] = useState('');
  const [primaryCourse, setPrimaryCourse] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [relatedSlugs, setRelatedSlugs] = useState<string[]>([]);
  const [relatedInput, setRelatedInput] = useState('');
  const [courseInput, setCourseInput] = useState('');
  const [linkedCourseTitle, setLinkedCourseTitle] = useState<string | null>(null);
  const [showResolveInput, setShowResolveInput] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<{ title: string; imported: boolean } | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ alisonSlug: string; title: string; alisonUrl: string; dbSlug: string | null; category: string }>>([]);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [editorialStatus, setEditorialStatus] = useState('draft');
  const [publishedStatus, setPublishedStatus] = useState('draft');

  // Load
  useEffect(() => {
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
        setPrimaryCourseRationale(p.primary_course_rationale ?? '');
        setPrimaryCourse(p.primary_course_slug ?? '');
        setEditorialStatus(p.editorial_review_status ?? 'draft');
        setPublishedStatus(p.published_status ?? 'draft');
        setMetaTitle(p.meta_title ?? '');
        setMetaDescription(p.meta_description ?? '');
        const relSlugs: string[] = p.related_course_slugs_json
          ? JSON.parse(p.related_course_slugs_json) : [];
        setRelatedSlugs(relSlugs);
        const cats: string[] = p.categories_json ? JSON.parse(p.categories_json) : [];
        setCategories(cats);
      })
      .catch(() => setLoadError('Failed to load article.'))
      .finally(() => setLoading(false));
  }, [pageId]);

  // Auto slug only if untouched & page had no slug
  useEffect(() => {
    if (!slugEdited && page && !page.slug) setSlug(toSlug(title));
  }, [title, slugEdited, page]);

  // ── Toolbar actions ─────────────────────────────────────────────────────────

  const totalWords = wordCount([summary, whyItMatters, whatChanged, executiveImplications].join(' '));

  function copyArticle() {
    const parts = [
      `# ${title}`,
      summary && `\n${summary}`,
      whyItMatters && `\n## Why it matters\n${whyItMatters}`,
      whatChanged && `\n## What changed\n${whatChanged}`,
      primaryCourse && `\n[Free course: ${primaryCourse}]`,
      executiveImplications && `\n## Key implications\n${executiveImplications}`,
      metaDescription && `\n---\nMeta: ${metaDescription}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(parts).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function printArticle() {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 680px; margin: 48px auto; color: #1a1a1a; line-height: 1.85; font-size: 16px; }
  h1 { font-size: 1.85rem; line-height: 1.25; margin-bottom: 0.5rem; }
  h2 { font-size: 1.15rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.6rem; color: #333; }
  p { margin-bottom: 1.1rem; }
  .summary { font-size: 1.05rem; color: #444; border-left: 3px solid #4f6ef7; padding-left: 1rem; margin-bottom: 2rem; }
  .course-box { border: 1px solid #e5e7eb; padding: 0.875rem 1.125rem; border-radius: 8px; margin: 2rem 0; background: #f9fafb; font-size: 0.9rem; }
  .course-box strong { display: block; margin-bottom: 0.25rem; color: #4f6ef7; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta-box { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.8rem; color: #9ca3af; }
  @media print { body { margin: 0; } }
</style></head><body>
  <h1>${title}</h1>
  ${summary ? `<p class="summary">${summary}</p>` : ''}
  ${whyItMatters ? `<h2>Why it matters</h2><p>${whyItMatters}</p>` : ''}
  ${whatChanged ? `<h2>What changed</h2><p>${whatChanged}</p>` : ''}
  ${primaryCourse ? `<div class="course-box"><strong>Free course</strong>${primaryCourse}</div>` : ''}
  ${executiveImplications ? `<h2>Key implications</h2><p>${executiveImplications}</p>` : ''}
  <div class="meta-box">
    <p>Slug: /curated/${slug} · Status: ${publishedStatus} · Editorial: ${editorialStatus}</p>
    ${metaDescription ? `<p>Meta: ${metaDescription}</p>` : ''}
    <p>Printed from BytesAI Learning Admin · ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}</p>
  </div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaveError('');
    setSaveSuccess(false);
    if (!title.trim() || !slug.trim()) { setSaveError('Title and slug are required.'); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/curated?id=${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), slug: slug.trim(),
          summary: summary.trim() || null,
          why_it_matters: whyItMatters.trim() || null,
          what_changed: whatChanged.trim() || null,
          executive_implications: executiveImplications.trim() || null,
          primary_course_rationale: primaryCourseRationale.trim() || null,
          primary_course_slug: primaryCourse.trim() || null,
          categories_json: categories.length ? JSON.stringify(categories) : null,
          related_course_slugs: relatedSlugs,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          editorial_review_status: editorialStatus,
          published_status: publishedStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? 'Save failed.'); return; }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onSaved(pageId, {
        title: title.trim(), slug: slug.trim(),
        summary: summary.trim() || null,
        editorial_review_status: editorialStatus,
        published_status: publishedStatus,
        primary_course_slug: primaryCourse.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  }, [pageId, title, slug, summary, whyItMatters, whatChanged, executiveImplications, primaryCourseRationale, primaryCourse, relatedSlugs, metaTitle, metaDescription, editorialStatus, publishedStatus, onSaved]);

  // Ctrl/Cmd+S to save
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleSave]);

  // ── Course URL resolver ──────────────────────────────────────────────────────
  const handleResolve = useCallback(async () => {
    if (!courseInput.trim()) return;
    setResolving(true);
    setResolveError(null);
    setResolveResult(null);
    try {
      const res = await fetch('/api/admin/course-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: courseInput.trim() }),
      });
      let data: Record<string, unknown>;
      try { data = await res.json(); } catch {
        setResolveError(`Server error (${res.status}) — please try again.`);
        return;
      }
      if (!res.ok || data.error) {
        setResolveError((data.error as string) ?? 'Failed to resolve course.');
        return;
      }
      setPrimaryCourse(data.slug as string);
      setLinkedCourseTitle(data.title as string);
      setResolveResult({ title: data.title as string, imported: data.imported as boolean });
      if (!primaryCourseRationale.trim() && data.snippet) {
        setPrimaryCourseRationale(data.snippet as string);
      }
      setCourseInput('');
      setShowResolveInput(false);
    } catch {
      setResolveError('Network error — could not reach the server.');
    } finally {
      setResolving(false);
    }
  }, [courseInput, primaryCourseRationale]);

  // ── AI course suggestions ────────────────────────────────────────────────────
  const handleSuggest = useCallback(async () => {
    if (!title.trim()) return;
    setSuggesting(true);
    setSuggestError(null);
    setSuggestions([]);
    setSuggestedCategories([]);
    try {
      const res = await fetch('/api/admin/curated/suggest-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), summary, whyItMatters }),
      });
      let data: Record<string, unknown>;
      try { data = await res.json(); } catch {
        setSuggestError(`Server error (${res.status}) — please try again.`);
        return;
      }
      if (!res.ok || data.error) { setSuggestError((data.error as string) ?? 'Failed to fetch suggestions.'); return; }
      if (Array.isArray(data.categories) && data.categories.length) setSuggestedCategories(data.categories as string[]);
      const suggestions = data.suggestions as Array<{ alisonSlug: string; title: string; alisonUrl: string; dbSlug: string | null; category: string }>;
      if (!suggestions?.length) { setSuggestError('No matching courses found on Alison for this topic.'); return; }
      setSuggestions(suggestions);
    } catch {
      setSuggestError('Network error — could not reach the server.');
    } finally {
      setSuggesting(false);
    }
  }, [title, summary, whyItMatters]);

  const handleUseSuggestion = useCallback(async (alisonUrl: string) => {
    setResolving(true);
    setResolveError(null);
    setResolveResult(null);
    setSuggestions([]);
    try {
      const res = await fetch('/api/admin/course-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: alisonUrl }),
      });
      let data: Record<string, unknown>;
      try { data = await res.json(); } catch {
        setResolveError(`Server error (${res.status}) — please try again.`);
        return;
      }
      if (!res.ok || data.error) { setResolveError((data.error as string) ?? 'Failed to link course.'); return; }
      setPrimaryCourse(data.slug as string);
      setLinkedCourseTitle(data.title as string);
      setResolveResult({ title: data.title as string, imported: data.imported as boolean });
      if (!primaryCourseRationale.trim() && data.snippet) {
        setPrimaryCourseRationale(data.snippet as string);
      }
      setSuggestions([]);
      setSuggestedCategories([]);
    } catch {
      setResolveError('Network error — could not reach the server.');
    } finally {
      setResolving(false);
    }
  }, [primaryCourseRationale]);

  const handleClearCourse = useCallback(() => {
    setPrimaryCourse('');
    setLinkedCourseTitle(null);
    setResolveResult(null);
    setResolveError(null);
    setSuggestions([]);
    setSuggestedCategories([]);
    setShowResolveInput(false);
    setCourseInput('');
  }, []);

  const handleAddRelatedSlug = useCallback((val: string) => {
    const s = val.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!s) return;
    setRelatedSlugs(prev => prev.includes(s) ? prev : [...prev, s]);
    setRelatedInput('');
  }, []);

  const handleRemoveRelatedSlug = useCallback((s: string) => {
    setRelatedSlugs(prev => prev.filter(x => x !== s));
  }, []);

  // ── Styles ──────────────────────────────────────────────────────────────────

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--text-muted)',
    marginBottom: '0.875rem', display: 'block',
  };
  const divider: React.CSSProperties = {
    borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', paddingBottom: '0.125rem',
  };
  const inputSm: React.CSSProperties = {
    fontSize: '0.875rem', fontFamily: 'monospace',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: fullscreen ? 'var(--bg)' : 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: fullscreen ? 'stretch' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: fullscreen ? 0 : '1rem',
      }}
      onClick={e => { if (!fullscreen && e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: fullscreen ? '100%' : 740,
          maxHeight: fullscreen ? '100%' : '95vh',
          height: fullscreen ? '100%' : undefined,
          borderRadius: fullscreen ? 0 : undefined,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* ── Sticky toolbar ───────────────────────────────────────────── */}
        <div style={{
          padding: '0.625rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
          flexShrink: 0,
        }}>
          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={saveSuccess ? 'btn btn-sm' : 'btn btn-primary btn-sm'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: saveSuccess ? 'var(--emerald)' : undefined,
              fontSize: '0.8rem',
            }}
          >
            {saving
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
              : saveSuccess
                ? <><CheckCircle2 size={13} /> Saved</>
                : <><Save size={13} /> Save</>}
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Copy */}
          <button
            type="button"
            onClick={copyArticle}
            title="Copy full article as plain text"
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
          >
            {copied ? <><CheckCircle2 size={13} color="var(--emerald)" /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={printArticle}
            title="Print article"
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
          >
            <Printer size={13} /> Print
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

          {/* Word count */}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {totalWords.toLocaleString()} words
          </span>

          {/* Shortcut hint */}
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '0.125rem' }}>
            · <kbd style={{ fontFamily: 'monospace', fontSize: '0.67rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '0 3px' }}>Ctrl+S</kbd> to save
          </span>

          {/* Right side: preview link, fullscreen, close */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {page && (
              <a
                href={`/curated/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}
              >
                Preview <ExternalLink size={11} />
              </a>
            )}
            <button
              type="button"
              onClick={() => setFullscreen(v => !v)}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="btn btn-outline btn-sm"
              style={{ padding: '0.25rem 0.45rem', height: 'auto' }}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem 1.5rem 2rem' }}>

          {/* Load states */}
          {loading && (
            <div style={{ padding: '4rem 0', textAlign: 'center' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading article…</p>
            </div>
          )}
          {loadError && !loading && (
            <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem' }}>
              <AlertCircle size={15} color="var(--rose)" />
              <p style={{ fontSize: '0.875rem', color: 'var(--rose)' }}>{loadError}</p>
            </div>
          )}

          {!loading && !loadError && (
            <>
              {/* Save error */}
              {saveError && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--rose)', borderRadius: 'var(--radius)', padding: '0.625rem 0.875rem', fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={14} /> {saveError}
                </div>
              )}

              {/* ── Status ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.875rem 1rem', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Editorial status</label>
                  <select className="input" value={editorialStatus} onChange={e => setEditorialStatus(e.target.value)} style={{ fontSize: '0.875rem' }}>
                    {EDITORIAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Publish status</label>
                  <select className="input" value={publishedStatus} onChange={e => setPublishedStatus(e.target.value)} style={{ fontSize: '0.875rem' }}>
                    {PUBLISHED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Article meta ── */}
              <span style={sectionLabel}>Article</span>

              <div style={{ marginBottom: '1.125rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Title <span style={{ color: 'var(--rose)' }}>*</span>
                </label>
                <input
                  className="input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Why Generative AI Is Reshaping Content Creation"
                />
              </div>

              <div style={{ marginBottom: '1.125rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Slug <span style={{ color: 'var(--rose)' }}>*</span>
                </label>
                <input
                  className="input"
                  value={slug}
                  onChange={e => {
                    setSlugEdited(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));
                  }}
                  style={inputSm}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  learn.bytesai.uk/curated/<strong>{slug || '…'}</strong>
                </span>
              </div>

              <div style={divider} />

              {/* ── Content fields (AI-enabled) ── */}
              <span style={sectionLabel}>Content</span>

              <SmartTextarea
                label="Summary"
                value={summary}
                onChange={setSummary}
                rows={3}
                placeholder="A 1–2 sentence hook that explains why this topic matters right now."
                articleTitle={title}
              />

              <SmartTextarea
                label="Why it matters"
                value={whyItMatters}
                onChange={setWhyItMatters}
                rows={5}
                placeholder="3–5 sentences on real-world significance. Naturally mention the free course here."
                articleTitle={title}
              />

              <SmartTextarea
                label="What changed"
                value={whatChanged}
                onChange={setWhatChanged}
                rows={5}
                placeholder="3–5 sentences on current developments and recent breakthroughs."
                articleTitle={title}
              />

              <SmartTextarea
                label="Key implications"
                value={executiveImplications}
                onChange={setExecutiveImplications}
                rows={5}
                placeholder="3–5 sentences on practical takeaways for learners and organisations."
                articleTitle={title}
              />

              <div style={divider} />

              {/* ── Categories ── */}
              <span style={sectionLabel}>Categories</span>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {categories.map(cat => (
                    <span key={cat} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(79,110,247,0.08)', color: 'var(--accent)',
                      border: '1px solid rgba(79,110,247,0.2)',
                      cursor: 'pointer',
                    }}
                      onClick={() => setCategories(prev => prev.filter(c => c !== cat))}
                      title="Click to remove"
                    >
                      {cat} <X size={10} />
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['AI Governance','AI Safety','Foundation Models','AI Tooling','AI Workflow','Ethics & Bias','Regulation & Compliance','Technical Implementation','Research & Models','AI in Business'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { if (!categories.includes(cat)) setCategories(prev => [...prev, cat]); }}
                      disabled={categories.includes(cat)}
                      style={{
                        fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border)', background: categories.includes(cat) ? 'var(--border)' : 'var(--bg)',
                        color: categories.includes(cat) ? 'var(--text-muted)' : 'var(--text-secondary)',
                        cursor: categories.includes(cat) ? 'default' : 'pointer',
                      }}
                    >{cat}</button>
                  ))}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                  Click to add · Click a tag to remove. AI assigns these automatically on generation.
                </span>
              </div>

              <div style={divider} />

              {/* ── Course linking ── */}
              <span style={sectionLabel}>Course links</span>

              {/* Primary course — unified card */}
              <div style={{ marginBottom: '1.125rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>

                {/* Linked state chip */}
                {primaryCourse && (
                  <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(34,197,94,0.05)', borderBottom: showResolveInput ? '1px solid var(--border)' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <CheckCircle2 size={13} color="var(--green, #22c55e)" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {linkedCourseTitle && (
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {linkedCourseTitle}
                          </span>
                        )}
                        <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{primaryCourse}</code>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                        <a
                          href={`/learn/${primaryCourse}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center' }}
                          title="Preview course page"
                        >
                          <ExternalLink size={11} />
                        </a>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => { setShowResolveInput(v => !v); setResolveError(null); }}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                        >
                          {showResolveInput ? 'Cancel' : 'Change'}
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={handleClearCourse}
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem', color: 'var(--rose)', borderColor: 'rgba(239,68,68,0.3)' }}
                          title="Remove linked course"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resolve input — always shown when no course, or when Change is open */}
                {(!primaryCourse || showResolveInput) && (
                  <div style={{ padding: '0.75rem 0.875rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <Link2 size={12} /> {primaryCourse ? 'Link a different course' : 'Link a course'}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        className="input"
                        value={courseInput}
                        onChange={e => { setCourseInput(e.target.value); setResolveError(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleResolve(); } }}
                        placeholder="Alison URL, keyword (e.g. AI Governance), or slug"
                        style={{ ...inputSm, flex: 1 }}
                        disabled={resolving}
                        autoFocus={showResolveInput}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleResolve}
                        disabled={resolving || !courseInput.trim()}
                        style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        {resolving
                          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          : 'Resolve & link'}
                      </button>
                    </div>
                    {resolveError && (
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start', marginTop: '0.45rem' }}>
                        <AlertCircle size={12} color="var(--rose)" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--rose)' }}>{resolveError}</span>
                      </div>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                      Paste an Alison URL, type a keyword, or enter a slug directly — course is imported if not already in the DB.
                    </span>
                  </div>
                )}

                {/* AI suggestions strip */}
                <div style={{ padding: '0.625rem 0.875rem', borderTop: '1px solid var(--border)', background: 'var(--bg-subtle, var(--bg))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={handleSuggest}
                      disabled={suggesting || resolving || !title.trim()}
                      style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      {suggesting
                        ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Searching…</>
                        : <><Sparkles size={12} /> Suggest from article</>
                      }
                    </button>
                    {suggestedCategories.map(c => (
                      <span key={c} style={{ fontSize: '0.67rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 99, background: 'rgba(99,102,241,0.08)', color: 'var(--accent, #6366f1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                  {suggestError && (
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start', marginTop: '0.45rem' }}>
                      <AlertCircle size={12} color="var(--rose)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: '0.72rem', color: 'var(--rose)' }}>{suggestError}</span>
                    </div>
                  )}
                  {!suggesting && suggestions.length === 0 && !suggestError && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                      Classifies the article by topic, then searches Alison for matching courses.
                    </span>
                  )}
                  {suggestions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                      {suggestions.map(s => (
                        <div key={s.alisonSlug} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.4rem 0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginTop: '0.1rem' }}>
                              <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{s.category}</span>
                              {s.dbSlug && <span style={{ fontSize: '0.67rem', color: 'var(--green, #22c55e)', fontWeight: 600 }}>· In DB</span>}
                            </div>
                          </div>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleUseSuggestion(s.alisonUrl)}
                            disabled={resolving}
                            style={{ flexShrink: 0, fontSize: '0.75rem' }}
                          >
                            {resolving ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 'Use'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <SmartTextarea
                label="Course rationale"
                value={primaryCourseRationale}
                onChange={setPrimaryCourseRationale}
                rows={4}
                placeholder="Editorial paragraph: who this course is for, what they'll learn, what it doesn't cover, and why it's the right starting point."
                hint="Displayed as prose above the course key-facts table. Keep it editorial, not promotional."
                articleTitle={title}
              />

              {/* Related courses — chip tag input */}
              <div style={{ marginBottom: '1.125rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Related course slugs
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', minHeight: 38, alignItems: 'center', cursor: 'text' }}
                  onClick={e => { if (e.target === e.currentTarget) (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus(); }}
                >
                  {relatedSlugs.map(s => (
                    <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontFamily: 'monospace', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius)', background: 'var(--bg-subtle, rgba(0,0,0,0.05))', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveRelatedSlug(s)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'inline-flex', lineHeight: 1 }}
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={relatedInput}
                    onChange={e => setRelatedInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddRelatedSlug(relatedInput); }
                      if (e.key === 'Backspace' && !relatedInput && relatedSlugs.length > 0) {
                        handleRemoveRelatedSlug(relatedSlugs[relatedSlugs.length - 1]);
                      }
                    }}
                    onBlur={() => { if (relatedInput.trim()) handleAddRelatedSlug(relatedInput); }}
                    placeholder={relatedSlugs.length === 0 ? 'Type a slug and press Enter…' : ''}
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.78rem', fontFamily: 'monospace', flex: 1, minWidth: 80, padding: '0.1rem 0.2rem' }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Press <kbd style={{ fontFamily: 'monospace', fontSize: '0.67rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3, padding: '0 3px' }}>Enter</kbd> or comma to add · Backspace removes last · Shown as a course grid after the article
                </span>
              </div>

              <div style={divider} />

              {/* ── SEO ── */}
              <span style={sectionLabel}>SEO</span>

              <div style={{ marginBottom: '1.125rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Meta title</label>
                <input
                  className="input"
                  value={metaTitle}
                  onChange={e => setMetaTitle(e.target.value)}
                  placeholder="Overrides article title in search results (under 60 chars)"
                />
                <span style={{ fontSize: '0.72rem', color: metaTitle.length > 60 ? 'var(--rose)' : 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  {metaTitle.length}/60 chars
                </span>
              </div>

              <SmartTextarea
                label="Meta description"
                value={metaDescription}
                onChange={setMetaDescription}
                rows={2}
                placeholder="SEO description shown in search results (under 155 chars)"
                hint={`${metaDescription.length}/155 chars`}
                articleTitle={title}
              />
            </>
          )}
        </div>

        {/* ── Footer save bar ──────────────────────────────────────────── */}
        {!loading && !loadError && (
          <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexShrink: 0, background: 'var(--bg-card)' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              {saving
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                : saveSuccess
                  ? <><CheckCircle2 size={14} /> Saved</>
                  : <><Save size={14} /> Save changes</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
