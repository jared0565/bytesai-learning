import { getDB } from '@/lib/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Users, MousePointerClick, TrendingUp, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  robots: { index: false, follow: false },
};

async function getStats(db: import('@/lib/db').D1Database | null) {
  if (!db) return { totalUsers: 0, totalCourses: 0, totalEvents: 0, alisonClicks: 0 };
  try {
    const [users, courses, events, alisonClicks] = await db.batch<{ count: number }>([
      db.prepare("SELECT COUNT(*) AS count FROM users"),
      db.prepare("SELECT COUNT(*) AS count FROM courses WHERE published_status = 'published'"),
      db.prepare("SELECT COUNT(*) AS count FROM course_events WHERE event_type = 'view'"),
      db.prepare("SELECT COUNT(*) AS count FROM course_events WHERE event_type = 'affiliate_click'"),
    ]);
    return {
      totalUsers: users.results[0]?.count ?? 0,
      totalCourses: courses.results[0]?.count ?? 0,
      totalEvents: events.results[0]?.count ?? 0,
      alisonClicks: alisonClicks.results[0]?.count ?? 0,
    };
  } catch { return { totalUsers: 0, totalCourses: 0, totalEvents: 0, alisonClicks: 0 }; }
}

async function getRecentAuditLogs(db: import('@/lib/db').D1Database | null) {
  if (!db) return [];
  try {
    const result = await db.prepare(
      'SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 10'
    ).all<{ id: string; admin_user_id: string; action_type: string; entity_type: string; entity_id?: string; created_at: string }>();
    return result.results;
  } catch { return []; }
}

export default async function AdminDashboardPage() {
  const db = await getDB();
  const [stats, logs] = await Promise.all([
    getStats(db),
    getRecentAuditLogs(db),
  ]);

  const KPI_CARDS = [
    { icon: <Users size={22} />, label: 'Total users', value: stats.totalUsers, color: 'var(--accent)', href: '/admin/users' },
    { icon: <BookOpen size={22} />, label: 'Published courses', value: stats.totalCourses, color: 'var(--teal)', href: '/admin/courses' },
    { icon: <TrendingUp size={22} />, label: 'Course views', value: stats.totalEvents, color: 'var(--emerald)', href: '/admin/analytics' },
    { icon: <MousePointerClick size={22} />, label: 'Affiliate clicks', value: stats.alisonClicks, color: 'var(--amber)', href: '/admin/analytics' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 1200 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Admin Overview</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Platform health and activity summary.</p>
      </div>

      {!db && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#991b1b' }}>
          <AlertCircle size={16} />
          D1 database binding not available — running in local dev mode without live data.
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {KPI_CARDS.map(card => (
          <Link key={card.label} href={card.href} style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', transition: 'box-shadow 0.2s',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>
              {card.icon}
            </div>
            <div>
              <p style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>{card.value.toLocaleString()}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { href: '/admin/featured', label: 'Manage featured homepage slots', icon: '⭐' },
              { href: '/admin/courses', label: 'Add or edit courses', icon: '📚' },
              { href: '/admin/curated', label: 'Review curated page drafts', icon: '📄' },
              { href: '/admin/chatbot-rules', label: 'Update chatbot routing rules', icon: '🤖' },
            ].map(action => (
              <Link key={action.href} href={action.href} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.875rem',
                borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', fontWeight: 500,
                color: 'var(--text-primary)', textDecoration: 'none', transition: 'background 0.15s',
              }}>
                <span style={{ fontSize: '1rem' }}>{action.icon}</span>
                {action.label}
                <ArrowRight size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Audit log */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Recent admin actions</h2>
          {logs.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>No admin actions yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {logs.map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', paddingBottom: '0.625rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{log.action_type} {log.entity_type}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
