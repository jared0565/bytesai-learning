'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ExternalLink, Plus, BookOpen } from 'lucide-react';
import CuratedActions from './CuratedActions';
import NewCuratedPageModal from './NewCuratedPageModal';
import EditCuratedPageModal from './EditCuratedPageModal';

interface CuratedRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  primary_course_slug: string | null;
  editorial_review_status: string;
  published_status: string;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
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

  useEffect(() => {
    fetch('/api/admin/curated')
      .then(r => r.json())
      .then(d => { if (d.pages) setPages(d.pages); })
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(id: string, updates: Record<string, string | null>) {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } as CuratedRow : p));
  }

  function handleCreated(page: { id: string; slug: string; title: string }) {
    setShowNewModal(false);
    setPages(prev => [{
      id: page.id,
      slug: page.slug,
      title: page.title,
      summary: null,
      primary_course_slug: null,
      editorial_review_status: 'draft',
      published_status: 'draft',
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
          {pages.map(p => (
            <div
              key={p.id}
              className="card"
              style={{ padding: '1rem 1.25rem' }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* Left: title + summary + meta */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    {/* Editorial badge */}
                    <span style={{
                      display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.7rem', fontWeight: 700,
                      color: editorialColor[p.editorial_review_status] ?? 'var(--text-muted)',
                      background: `${editorialColor[p.editorial_review_status] ?? 'var(--text-muted)'}18`,
                    }}>
                      {p.editorial_review_status}
                    </span>
                    {/* Published badge */}
                    <span style={{
                      display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.7rem', fontWeight: 700,
                      color: publishedColor[p.published_status] ?? 'var(--text-muted)',
                      background: `${publishedColor[p.published_status] ?? 'var(--text-muted)'}18`,
                    }}>
                      {p.published_status}
                    </span>
                  </div>

                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.4, marginBottom: '0.25rem' }}>
                    {p.title}
                  </p>

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

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
          ))}
        </div>
      )}
    </div>
  );
}
