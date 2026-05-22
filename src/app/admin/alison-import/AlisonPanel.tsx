'use client';

import { useState } from 'react';
import { Search, Loader2, CheckSquare, Square, Download, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import type { AlisonCourseDetail } from '@/app/api/admin/alison-import/route';

const DB_CATEGORIES = [
  'AI Foundations',
  'LLMs / Generative AI',
  'Agents',
  'Data / ML',
  'Prompt Engineering',
  'Governance / Responsible AI',
  'Programming Foundations',
  'Books / Reading Sources',
  'Other Sources / Lectures',
];

interface SearchResult { slug: string; title: string }
interface DetailedCourse extends AlisonCourseDetail {
  selected: boolean;
  loading: boolean;
  dbCategory: string;
  publishedStatus: 'draft' | 'published';
  enrollCount: number | null;
}

export default function AlisonPanel() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [courses, setCourses] = useState<DetailedCourse[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: { slug: string; dbSlug: string }[]; skipped: { slug: string; reason: string }[] } | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    setCourses([]);
    setImportResult(null);

    try {
      const res = await fetch(`/api/admin/alison-import?query=${encodeURIComponent(query.trim())}`);
      const data: { results: SearchResult[]; error?: string } = await res.json();
      if (!res.ok) { setSearchError(data.error ?? 'Search failed.'); return; }
      setResults(data.results);
    } catch {
      setSearchError('Network error.');
    } finally {
      setSearching(false);
    }
  }

  async function handleUrlImport() {
    const raw = urlInput.trim();
    if (!raw) return;
    const match = raw.match(/alison\.com\/course\/([^/?#]+)/);
    const slug = match ? match[1] : raw.replace(/^\//, '');
    setUrlLoading(true);
    setSearchError(null);
    setImportResult(null);
    await fetchDetail(slug);
    setUrlInput('');
    setUrlLoading(false);
  }

  async function fetchDetail(slug: string) {
    setCourses(prev => {
      if (prev.find(c => c.slug === slug)) return prev;
      return [...prev, {
        slug, title: slug, description: null, outcomes: [], duration: null, level: null,
        coverImageUrl: null, officialLink: `https://alison.com/course/${slug}`,
        affiliateUrl: `https://alison.com/course/${slug}?utm_source=alison_user&utm_medium=affiliate&utm_campaign=27668723`,
        category: null, certType: null, enrollCount: null,
        selected: true, loading: true,
        dbCategory: 'AI Foundations', publishedStatus: 'draft',
      }];
    });

    try {
      const res = await fetch(`/api/admin/alison-import?slug=${encodeURIComponent(slug)}`);
      const data: { detail: AlisonCourseDetail; error?: string } = await res.json();
      if (!res.ok || !data.detail) throw new Error(data.error ?? 'Failed.');

      setCourses(prev => prev.map(c => c.slug === slug
        ? {
            ...data.detail,
            selected: true,
            loading: false,
            dbCategory: guessCategory(data.detail.category ?? data.detail.title),
            publishedStatus: 'draft' as const,
          }
        : c
      ));
    } catch {
      setCourses(prev => prev.map(c => c.slug === slug ? { ...c, loading: false, title: slug.replace(/-/g, ' ') } : c));
    }
  }

  function guessCategory(text: string): string {
    const t = text.toLowerCase();
    if (/agent|multi.?agent/.test(t)) return 'Agents';
    if (/prompt/.test(t)) return 'Prompt Engineering';
    if (/generat|llm|large language|gpt|chatgpt/.test(t)) return 'LLMs / Generative AI';
    if (/machine learning|deep learning|neural|data science/.test(t)) return 'Data / ML';
    if (/ethic|governance|responsible|bias|safety/.test(t)) return 'Governance / Responsible AI';
    if (/python|program|coding|software/.test(t)) return 'Programming Foundations';
    return 'AI Foundations';
  }

  function toggleSelect(slug: string) {
    setCourses(prev => prev.map(c => c.slug === slug ? { ...c, selected: !c.selected } : c));
  }

  function toggleAll() {
    const allSelected = courses.every(c => c.selected);
    setCourses(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  }

  function updateCourse(slug: string, field: keyof DetailedCourse, value: unknown) {
    setCourses(prev => prev.map(c => c.slug === slug ? { ...c, [field]: value } : c));
  }

  async function handleImport() {
    const toImport = courses.filter(c => c.selected && !c.loading);
    if (!toImport.length) return;
    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch('/api/admin/alison-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courses: toImport.map(c => ({
            slug: c.slug,
            title: c.title,
            description: c.description,
            outcomes: c.outcomes,
            duration: c.duration,
            level: c.level,
            coverImageUrl: c.coverImageUrl,
            officialLink: c.officialLink,
            affiliateUrl: c.affiliateUrl,
            category: c.category,
            certType: c.certType,
            dbCategory: c.dbCategory,
            publishedStatus: c.publishedStatus,
            enrollCount: c.enrollCount,
          })),
        }),
      });
      const data: { imported: { slug: string; dbSlug: string }[]; skipped: { slug: string; reason: string }[] } = await res.json();
      setImportResult(data);
      const importedSlugs = new Set(data.imported.map(i => i.slug));
      setCourses(prev => prev.filter(c => !importedSlugs.has(c.slug)));
    } catch {
      setSearchError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = courses.filter(c => c.selected && !c.loading).length;

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* URL paste */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Link2 size={13} /> Paste Alison URL or slug
            </label>
            <input
              type="text"
              className="input"
              placeholder="https://alison.com/course/introduction-to-ai  or  introduction-to-ai"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
            />
          </div>
          <button className="btn btn-accent" onClick={handleUrlImport} disabled={urlLoading || !urlInput.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {urlLoading
              ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Download size={15} />}
            Pull &amp; stage
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <label className="label">Search Alison</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. generative AI, machine learning, Python…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSearch} disabled={searching || !query.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {searching
              ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Search size={15} />}
            Search
          </button>
        </div>
        {searchError && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <AlertTriangle size={14} /> {searchError}
          </p>
        )}
      </div>

      {/* Import result */}
      {importResult && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
          background: importResult.imported.length ? 'rgba(16,185,129,0.08)' : '#fee2e2',
          border: `1px solid ${importResult.imported.length ? 'rgba(16,185,129,0.3)' : '#fca5a5'}`,
        }}>
          <p style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <CheckCircle2 size={16} color="var(--emerald)" />
            {importResult.imported.length} course{importResult.imported.length === 1 ? '' : 's'} imported as <em>draft</em>
          </p>
          {importResult.imported.map(i => (
            <p key={i.slug} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginLeft: '1.5rem' }}>
              ✓ {i.slug} → <code style={{ fontSize: '0.75rem' }}>{i.dbSlug}</code>
            </p>
          ))}
          {importResult.skipped.map(s => (
            <p key={s.slug} style={{ fontSize: '0.8125rem', color: 'var(--rose)', marginLeft: '1.5rem' }}>
              ✗ {s.slug}: {s.reason}
            </p>
          ))}
        </div>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.875rem' }}>
            {results.length} courses found for &ldquo;{query}&rdquo; — click to preview &amp; add:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {results.map(r => {
              const alreadyAdded = !!courses.find(c => c.slug === r.slug);
              return (
                <button
                  key={r.slug}
                  onClick={() => !alreadyAdded && fetchDetail(r.slug)}
                  disabled={alreadyAdded}
                  style={{
                    padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)',
                    border: `1.5px solid ${alreadyAdded ? 'var(--emerald)' : 'rgba(245,158,11,0.5)'}`,
                    background: alreadyAdded ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
                    color: alreadyAdded ? 'var(--emerald)' : 'var(--amber)',
                    fontSize: '0.8125rem', fontWeight: 600, cursor: alreadyAdded ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                  }}
                >
                  {alreadyAdded ? <CheckCircle2 size={13} /> : <Download size={13} />}
                  {r.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Staged courses */}
      {courses.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg)', fontWeight: 700, fontSize: '0.9375rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                {courses.every(c => c.selected) ? <CheckSquare size={18} color="var(--accent)" /> : <Square size={18} />}
              </button>
              {courses.length} staged · {selectedCount} selected
            </div>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              {importing
                ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                : <Download size={14} />}
              Import {selectedCount > 0 ? selectedCount : ''} selected
            </button>
          </div>

          {courses.map((c, i) => (
            <div key={c.slug} style={{
              borderBottom: i < courses.length - 1 ? '1px solid var(--border)' : 'none',
              padding: '1rem 1.25rem',
              display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: '0.875rem', alignItems: 'start',
              background: c.selected ? 'rgba(79,110,247,0.03)' : 'transparent',
            }}>
              <button
                onClick={() => !c.loading && toggleSelect(c.slug)}
                style={{ background: 'none', border: 'none', cursor: c.loading ? 'wait' : 'pointer', marginTop: 2, color: 'var(--text-muted)' }}
              >
                {c.loading
                  ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
                  : c.selected
                    ? <CheckSquare size={16} color="var(--accent)" />
                    : <Square size={16} />}
              </button>

              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{c.title}</span>
                  {c.certType && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: 'var(--amber)' }}>
                      {c.certType}
                    </span>
                  )}
                  {c.level && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 4, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {c.level}
                    </span>
                  )}
                  {c.duration && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ {c.duration}</span>
                  )}
                </div>

                {c.description && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem', maxWidth: 600 }}>
                    {c.description.slice(0, 200)}{c.description.length > 200 ? '…' : ''}
                  </p>
                )}

                {c.outcomes.length > 0 && (
                  <details style={{ marginBottom: '0.75rem' }}>
                    <summary style={{ fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', color: 'var(--accent)' }}>
                      {c.outcomes.length} learning outcomes
                    </summary>
                    <ul style={{ marginTop: '0.375rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {c.outcomes.map((o, oi) => (
                        <li key={oi} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{o}</li>
                      ))}
                    </ul>
                  </details>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="form-group" style={{ margin: 0, minWidth: 220 }}>
                    <label className="label" style={{ fontSize: '0.75rem' }}>Category in your catalog</label>
                    <select className="input" style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.8125rem' }}
                      value={c.dbCategory}
                      onChange={e => updateCourse(c.slug, 'dbCategory', e.target.value)}>
                      {DB_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label" style={{ fontSize: '0.75rem' }}>Publish as</label>
                    <select className="input" style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.8125rem' }}
                      value={c.publishedStatus}
                      onChange={e => updateCourse(c.slug, 'publishedStatus', e.target.value as 'draft' | 'published')}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                {c.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.coverImageUrl} alt={c.title}
                    style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                )}
                <a href={c.affiliateUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
                  <ExternalLink size={12} /> View on Alison
                </a>
                <button className="btn btn-ghost btn-sm" onClick={() => fetchDetail(c.slug)}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
