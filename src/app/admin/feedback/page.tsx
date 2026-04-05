'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, Trash2, CheckCheck, Clock, ThumbsUp, ThumbsDown, Minus, RefreshCw } from 'lucide-react';

interface FeedbackRow {
  id: string;
  type: string;
  slug: string | null;
  page_url: string | null;
  sentiment: string | null;
  message: string | null;
  email: string | null;
  user_id: string | null;
  reviewed: number;
  created_at: string;
}

const SENTIMENT_META: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  positive: { icon: <ThumbsUp size={12} />, label: 'Positive', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)' },
  neutral:  { icon: <Minus size={12} />,    label: 'Neutral',  color: 'var(--amber)',   bg: 'rgba(245,158,11,0.1)' },
  negative: { icon: <ThumbsDown size={12} />, label: 'Negative', color: 'var(--rose)',  bg: 'rgba(239,68,68,0.1)'  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminFeedbackPage() {
  const [rows, setRows]           = useState<FeedbackRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [unread, setUnread]       = useState(0);
  const [filterType, setFilterType]       = useState('');
  const [filterSentiment, setFilterSentiment] = useState('');
  const [filterReviewed, setFilterReviewed]   = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType)      params.set('type', filterType);
    if (filterSentiment) params.set('sentiment', filterSentiment);
    if (filterReviewed)  params.set('reviewed', filterReviewed);

    try {
      const res = await fetch(`/api/admin/feedback?${params}`);
      const data = await res.json();
      if (data.feedback) setRows(data.feedback);
      if (data.unread !== undefined) setUnread(data.unread);
    } catch { /* silent */ }
    setLoading(false);
  }, [filterType, filterSentiment, filterReviewed]);

  useEffect(() => { load(); }, [load]);

  async function toggleReviewed(row: FeedbackRow) {
    const next = !row.reviewed;
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, reviewed: next ? 1 : 0 } : r));
    await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, reviewed: next }),
    });
    if (next) setUnread(u => Math.max(0, u - 1));
    else setUnread(u => u + 1);
  }

  async function handleDelete(id: string) {
    if (deletingId !== id) { setDeletingId(id); return; }
    setRows(prev => prev.filter(r => r.id !== id));
    setDeletingId(null);
    await fetch(`/api/admin/feedback?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  const filterBtn = (active: boolean) => ({
    padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'rgba(79,110,247,0.1)' : 'var(--bg)',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            Feedback
            {unread > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--accent)', color: 'white' }}>
                {unread} new
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {rows.length} submission{rows.length !== 1 ? 's' : ''} · 4-layer spam protection active
          </p>
        </div>
        <button onClick={load} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Type:</span>
        {[['', 'All'], ['general', 'General'], ['article', 'Article']].map(([val, label]) => (
          <button key={val} onClick={() => setFilterType(val)} style={filterBtn(filterType === val)}>{label}</button>
        ))}
        <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 0.25rem' }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Sentiment:</span>
        {[['', 'All'], ['positive', '😊'], ['neutral', '😐'], ['negative', '😞']].map(([val, label]) => (
          <button key={val} onClick={() => setFilterSentiment(val)} style={filterBtn(filterSentiment === val)}>{label}</button>
        ))}
        <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 0.25rem' }} />
        {[['', 'All'], ['0', 'Unreviewed'], ['1', 'Reviewed']].map(([val, label]) => (
          <button key={val} onClick={() => setFilterReviewed(val)} style={filterBtn(filterReviewed === val)}>{label}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No feedback yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            The feedback tab appears on public pages after 15 seconds. Article feedback appears at the bottom of curated articles.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rows.map(row => {
            const sm = row.sentiment ? SENTIMENT_META[row.sentiment] : null;
            const isUnreviewed = !row.reviewed;
            return (
              <div
                key={row.id}
                className="card"
                style={{
                  padding: '0.875rem 1.125rem',
                  borderLeft: isUnreviewed ? '3px solid var(--accent)' : '3px solid transparent',
                  opacity: row.reviewed ? 0.72 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                  {/* Left: badges + content */}
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.375rem' }}>
                      {/* Sentiment */}
                      {sm && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                          fontSize: '0.7rem', fontWeight: 700,
                          color: sm.color, background: sm.bg,
                        }}>
                          {sm.icon} {sm.label}
                        </span>
                      )}
                      {/* Type */}
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                        fontSize: '0.7rem', fontWeight: 700,
                        color: row.type === 'article' ? 'var(--teal)' : 'var(--text-muted)',
                        background: row.type === 'article' ? 'rgba(20,184,166,0.1)' : 'var(--bg)',
                        border: '1px solid var(--border)',
                      }}>
                        {row.type === 'article' ? '📄 Article' : '🌐 General'}
                      </span>
                      {/* Verified user */}
                      {row.user_id && (
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                          fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)',
                          background: 'rgba(79,110,247,0.1)',
                        }}>
                          ✓ Verified user
                        </span>
                      )}
                      {/* New badge */}
                      {isUnreviewed && (
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
                          fontSize: '0.7rem', fontWeight: 800, color: 'white', background: 'var(--accent)',
                        }}>
                          NEW
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    {row.message && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '0.375rem' }}>
                        &ldquo;{row.message}&rdquo;
                      </p>
                    )}

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {row.email && <span>✉ {row.email}</span>}
                      {!row.email && !row.user_id && <span>👤 Anonymous</span>}
                      {row.slug && (
                        <Link
                          href={`/curated/${row.slug}`}
                          target="_blank"
                          style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          /curated/{row.slug} <ExternalLink size={10} />
                        </Link>
                      )}
                      {!row.slug && row.page_url && (
                        <span style={{ fontFamily: 'monospace', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.page_url.replace('https://learn.bytesai.uk', '')}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock size={10} /> {timeAgo(row.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                    <button
                      onClick={() => toggleReviewed(row)}
                      title={row.reviewed ? 'Mark as unreviewed' : 'Mark as reviewed'}
                      className="btn btn-outline btn-sm"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        color: row.reviewed ? 'var(--emerald)' : 'var(--text-muted)',
                        borderColor: row.reviewed ? 'var(--emerald)' : 'var(--border)',
                      }}
                    >
                      <CheckCheck size={13} />
                      {row.reviewed ? 'Reviewed' : 'Mark read'}
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      title={deletingId === row.id ? 'Click again to confirm' : 'Delete'}
                      className="btn btn-outline btn-sm"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        color: deletingId === row.id ? 'var(--rose)' : 'var(--text-muted)',
                        borderColor: deletingId === row.id ? 'var(--rose)' : 'var(--border)',
                      }}
                    >
                      <Trash2 size={13} />
                      {deletingId === row.id ? 'Confirm' : ''}
                    </button>
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
