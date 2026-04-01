import type { Metadata } from 'next';
import { TrendingUp, MousePointerClick, BookOpen, CheckCircle2, Bookmark, Eye } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Analytics — Admin',
  robots: { index: false, follow: false },
};

async function getDB() {
  return (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

interface EventCount { event_type: string; count: number }
interface TopCourse { course_id: string; title: string | null; slug: string | null; views: number }
interface RecentEvent { id: string; event_type: string; course_id: string | null; occurred_at: string }

export default async function AdminAnalyticsPage() {
  const db = await getDB();

  let eventCounts: EventCount[] = [];
  let topCourses: TopCourse[] = [];
  let recentEvents: RecentEvent[] = [];

  if (db) {
    try {
      const [counts, top, recent] = await Promise.all([
        db.prepare(
          `SELECT event_type, COUNT(*) AS count FROM course_events GROUP BY event_type ORDER BY count DESC`
        ).all<EventCount>(),
        db.prepare(
          `SELECT e.course_id, c.title, c.slug, COUNT(*) AS views
           FROM course_events e
           LEFT JOIN courses c ON c.id = e.course_id
           WHERE e.event_type = 'view'
           GROUP BY e.course_id ORDER BY views DESC LIMIT 10`
        ).all<TopCourse>(),
        db.prepare(
          `SELECT id, event_type, course_id, occurred_at FROM course_events ORDER BY occurred_at DESC LIMIT 20`
        ).all<RecentEvent>(),
      ]);
      eventCounts = counts.results;
      topCourses = top.results;
      recentEvents = recent.results;
    } catch { /* ignore */ }
  }

  const countMap = Object.fromEntries(eventCounts.map(e => [e.event_type, e.count]));

  const KPIs = [
    { icon: <Eye size={20} />, label: 'Course views', value: countMap.view ?? 0, color: 'var(--accent)' },
    { icon: <BookOpen size={20} />, label: 'Starts', value: countMap.start ?? 0, color: 'var(--teal)' },
    { icon: <Bookmark size={20} />, label: 'Saves', value: countMap.save ?? 0, color: 'var(--amber)' },
    { icon: <CheckCircle2 size={20} />, label: 'Completions', value: countMap.complete ?? 0, color: 'var(--emerald)' },
    { icon: <MousePointerClick size={20} />, label: 'Affiliate clicks', value: countMap.affiliate_click ?? 0, color: '#f59e0b' },
    { icon: <TrendingUp size={20} />, label: 'Chatbot clicks', value: countMap.chatbot_recommendation_click ?? 0, color: '#8b5cf6' },
  ];

  const eventIcon: Record<string, string> = {
    view: '👁', start: '▶️', save: '🔖', complete: '✅', affiliate_click: '🔗', share: '📤', chatbot_recommendation_click: '🤖',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Analytics</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>All-time event totals from course_events.</p>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {KPIs.map(k => (
          <div key={k.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{k.value.toLocaleString()}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Top courses */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9375rem' }}>
            Top courses by views
          </div>
          {topCourses.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <tbody>
                {topCourses.map((c, i) => (
                  <tr key={c.course_id} style={{ borderBottom: i < topCourses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.625rem 1.25rem', color: 'var(--text-muted)', fontWeight: 700, width: 32 }}>{i + 1}</td>
                    <td style={{ padding: '0.625rem 0', flex: 1 }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                        {c.title ?? c.course_id}
                      </p>
                      {c.slug && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.slug}</p>}
                    </td>
                    <td style={{ padding: '0.625rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                      {c.views.toLocaleString()} views
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent events */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9375rem' }}>
            Recent events
          </div>
          {recentEvents.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No events yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentEvents.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1.25rem', borderBottom: i < recentEvents.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '0.8125rem' }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{eventIcon[e.event_type] ?? '•'}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{e.event_type}</span>
                  <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {e.course_id ?? '—'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {new Date(e.occurred_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
