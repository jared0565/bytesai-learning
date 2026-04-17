import { getDB } from '@/lib/db';
import type { Metadata } from 'next';
import { TrendingUp, MousePointerClick, BookOpen, CheckCircle2, Bookmark, Eye, Users, Globe, Timer, Map } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Analytics — Admin',
  robots: { index: false, follow: false },
};

interface EventCount { event_type: string; count: number }
interface TopCourse { course_id: string; title: string | null; slug: string | null; views: number }
interface RecentEvent { id: string; event_type: string; course_id: string | null; occurred_at: string }
interface VisitorStats { total_sessions: number; unique_visitors: number; avg_duration: number | null }
interface LocationRow { country: string | null; city: string | null; region: string | null; count: number }
interface TopPage { path: string; views: number }
interface CtaRow { cta_type: string; count: number }

function fmtDuration(s: number | null): string {
  if (!s) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default async function AdminAnalyticsPage() {
  const db = await getDB();

  let eventCounts: EventCount[] = [];
  let topCourses: TopCourse[] = [];
  let recentEvents: RecentEvent[] = [];

  // Visitor analytics — graceful fallback if migration not yet run
  let visitorStats: VisitorStats = { total_sessions: 0, unique_visitors: 0, avg_duration: null };
  let topCountries: LocationRow[] = [];
  let topCities: LocationRow[] = [];
  let topPages: TopPage[] = [];
  let ctaRows: CtaRow[] = [];

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

    try {
      const [stats, countries, cities, pages, ctas] = await Promise.all([
        db.prepare(
          `SELECT COUNT(*) AS total_sessions,
                  COUNT(DISTINCT visitor_id) AS unique_visitors,
                  AVG(duration_seconds) AS avg_duration
           FROM visitor_sessions`
        ).first<VisitorStats>(),
        db.prepare(
          `SELECT country, NULL AS city, NULL AS region, COUNT(*) AS count
           FROM visitor_sessions WHERE country IS NOT NULL
           GROUP BY country ORDER BY count DESC LIMIT 10`
        ).all<LocationRow>(),
        db.prepare(
          `SELECT city, region, country, COUNT(*) AS count
           FROM visitor_sessions WHERE city IS NOT NULL
           GROUP BY city, region, country ORDER BY count DESC LIMIT 10`
        ).all<LocationRow>(),
        db.prepare(
          `SELECT path, COUNT(*) AS views FROM page_views GROUP BY path ORDER BY views DESC LIMIT 15`
        ).all<TopPage>(),
        db.prepare(
          `SELECT cta_type, COUNT(*) AS count FROM cta_events GROUP BY cta_type ORDER BY count DESC`
        ).all<CtaRow>(),
      ]);
      if (stats) visitorStats = stats;
      topCountries = countries.results;
      topCities = cities.results;
      topPages = pages.results;
      ctaRows = ctas.results;
    } catch { /* visitor_analytics tables not yet created */ }
  }

  const countMap = Object.fromEntries(eventCounts.map(e => [e.event_type, e.count]));
  const ctaMap = Object.fromEntries(ctaRows.map(r => [r.cta_type, r.count]));

  const KPIs = [
    { icon: <Eye size={20} />, label: 'Course views', value: countMap.view ?? 0, color: 'var(--accent)' },
    { icon: <BookOpen size={20} />, label: 'Starts', value: countMap.start ?? 0, color: 'var(--teal)' },
    { icon: <Bookmark size={20} />, label: 'Saves', value: countMap.save ?? 0, color: 'var(--amber)' },
    { icon: <CheckCircle2 size={20} />, label: 'Completions', value: countMap.complete ?? 0, color: 'var(--emerald)' },
    { icon: <MousePointerClick size={20} />, label: 'Affiliate clicks', value: countMap.affiliate_click ?? 0, color: '#f59e0b' },
    { icon: <TrendingUp size={20} />, label: 'Chatbot clicks', value: countMap.chatbot_recommendation_click ?? 0, color: '#8b5cf6' },
  ];

  const visitorKPIs = [
    { icon: <Users size={20} />, label: 'Total sessions', value: visitorStats.total_sessions.toLocaleString(), color: 'var(--accent)' },
    { icon: <Globe size={20} />, label: 'Unique visitors', value: visitorStats.unique_visitors.toLocaleString(), color: 'var(--teal)' },
    { icon: <Timer size={20} />, label: 'Avg session duration', value: fmtDuration(visitorStats.avg_duration ? Math.round(visitorStats.avg_duration) : null), color: 'var(--amber)' },
    { icon: <MousePointerClick size={20} />, label: 'Sign-in clicks', value: (ctaMap.sign_in ?? 0).toLocaleString(), color: '#6366f1' },
    { icon: <TrendingUp size={20} />, label: 'Get started clicks', value: (ctaMap.get_started ?? 0).toLocaleString(), color: '#10b981' },
    { icon: <CheckCircle2 size={20} />, label: 'Accounts created', value: (ctaMap.create_account ?? 0).toLocaleString(), color: 'var(--emerald)' },
  ];

  const eventIcon: Record<string, string> = {
    view: '👁', start: '▶️', save: '🔖', complete: '✅', affiliate_click: '🔗', share: '📤', chatbot_recommendation_click: '🤖',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1100 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Analytics</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Course engagement + visitor behaviour.</p>
      </div>

      {/* Course engagement KPIs */}
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Course engagement</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {KPIs.map(k => (
          <div key={k.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Visitor KPIs */}
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Visitors &amp; CTA funnel</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {visitorKPIs.map(k => (
          <div key={k.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
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

      {/* Location + Top pages */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
        {/* Top countries */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Map size={16} /> Countries
          </div>
          {topCountries.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <tbody>
                {topCountries.map((r, i) => (
                  <tr key={r.country} style={{ borderBottom: i < topCountries.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.5rem 1.25rem', fontWeight: 600 }}>{r.country}</td>
                    <td style={{ padding: '0.5rem 1.25rem', textAlign: 'right', color: 'var(--text-muted)' }}>{r.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top cities */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={16} /> Cities
          </div>
          {topCities.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <tbody>
                {topCities.map((r, i) => (
                  <tr key={`${r.city}-${r.region}`} style={{ borderBottom: i < topCities.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.5rem 1.25rem' }}>
                      <p style={{ fontWeight: 600 }}>{r.city}</p>
                      {r.region && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.region}, {r.country}</p>}
                    </td>
                    <td style={{ padding: '0.5rem 1.25rem', textAlign: 'right', color: 'var(--text-muted)' }}>{r.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top pages */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9375rem' }}>
            Top pages
          </div>
          {topPages.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <tbody>
                {topPages.map((r, i) => (
                  <tr key={r.path} style={{ borderBottom: i < topPages.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.5rem 1.25rem', fontFamily: 'monospace', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{r.path}</td>
                    <td style={{ padding: '0.5rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{r.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
