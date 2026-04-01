'use client';

export const runtime = 'edge';



import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ExternalLink, Plus } from 'lucide-react';
import CuratedActions from './CuratedActions';
import NewCuratedPageModal from './NewCuratedPageModal';

interface CuratedRow {
  id: string;
  slug: string;
  title: string;
  editorial_review_status: string;
  published_status: string;
  last_verified_at: string | null;
  created_at: string;
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
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch('/api/admin/curated')
      .then(r => r.json())
      .then(d => { if (d.pages) setPages(d.pages); })
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(id: string, updates: Record<string, string>) {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  function handleCreated(page: { id: string; slug: string; title: string }) {
    setShowModal(false);
    setPages(prev => [{
      id: page.id,
      slug: page.slug,
      title: page.title,
      editorial_review_status: 'draft',
      published_status: 'draft',
      last_verified_at: null,
      created_at: new Date().toISOString(),
    }, ...prev]);
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      {showModal && <NewCuratedPageModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Curated Pages</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {pages.length} page{pages.length !== 1 ? 's' : ''} · Manage editorial review and publish status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <Plus size={14} /> New page
          </button>
          <Link href="/curated" target="_blank" className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 360, margin: '0 auto' }}>
            Use the <strong>New page</strong> button above to create your first curated insight.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['Title', 'Editorial status', 'Publish status', 'Last verified', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < pages.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '0.75rem 1rem', maxWidth: 260 }}>
                    <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.125rem' }}>{p.slug}</p>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: editorialColor[p.editorial_review_status] ?? 'var(--text-muted)',
                      background: `${editorialColor[p.editorial_review_status] ?? 'var(--text-muted)'}18`,
                    }}>
                      {p.editorial_review_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: publishedColor[p.published_status] ?? 'var(--text-muted)',
                      background: `${publishedColor[p.published_status] ?? 'var(--text-muted)'}18`,
                    }}>
                      {p.published_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                    {p.last_verified_at ? new Date(p.last_verified_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <CuratedActions
                      pageId={p.id}
                      editorialStatus={p.editorial_review_status}
                      publishedStatus={p.published_status}
                      onUpdate={handleUpdate}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
