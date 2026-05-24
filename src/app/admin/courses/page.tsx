import { getDB } from '@/lib/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ExternalLink, PlusCircle } from 'lucide-react';
import CourseActions from './CourseActions';
import SortableHeader from './SortableHeader';
import EnrollRefresh from './EnrollRefresh';

export const metadata: Metadata = {
  title: 'Courses — Admin',
  robots: { index: false, follow: false },
};

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  level: string | null;
  published_status: string;
  is_alison: number;
  is_affiliate: number;
  featured_priority: number;
  enroll_count: number | null;
  snippet: string | null;
  provider_id: string | null;
  updated_at: string;
}

const SORTABLE_COLUMNS: Record<string, string> = {
  title: 'title',
  category: 'category',
  level: 'level',
  status: 'published_status',
  flags: 'featured_priority',
  updated: 'updated_at',
};

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const sortKey = sp.sort && SORTABLE_COLUMNS[sp.sort] ? sp.sort : null;
  const sortCol = sortKey ? SORTABLE_COLUMNS[sortKey] : 'updated_at';
  const sortDir = sp.dir === 'desc' ? 'DESC' : 'ASC';
  const orderBy = sortKey ? `${sortCol} ${sortDir}` : 'updated_at DESC';

  const db = await getDB();
  let courses: CourseRow[] = [];

  if (db) {
    try {
      const result = await db.prepare(
        `SELECT id, slug, title, category, level, published_status, is_alison, is_affiliate, featured_priority, enroll_count, snippet, provider_id, updated_at
         FROM courses ORDER BY ${orderBy} LIMIT 200`
      ).all<CourseRow>();
      courses = result.results;
    } catch { /* ignore */ }
  }

  const statusColor: Record<string, string> = {
    published: 'var(--emerald)',
    draft: 'var(--amber)',
    archived: 'var(--text-muted)',
  };

  const HEADERS: { label: string; column: string; width?: string }[] = [
    { label: 'Title',    column: 'title' },
    { label: 'Category', column: 'category', width: '110px' },
    { label: 'Level',    column: 'level',    width: '130px' },
    { label: 'Status',   column: 'status',   width: '90px'  },
    { label: 'Flags',    column: 'flags',    width: '90px'  },
    { label: 'Enrolled', column: '',         width: '80px'  },
    { label: 'Updated',  column: 'updated',  width: '95px'  },
    { label: '',         column: '',         width: '170px' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 1200 }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '0.25rem' }}>Courses</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {courses.length} course{courses.length !== 1 ? 's' : ''} in the catalog.
          </p>
        </div>
        <Link
          href="/admin/add-courses"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}
        >
          <PlusCircle size={15} /> Add courses
        </Link>
      </div>

      {/* Course table */}
      {courses.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <BookOpen size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No courses yet. Add one above.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {HEADERS.map(h => (
                  <SortableHeader key={h.label} column={h.column} label={h.label} width={h.width} />
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: i < courses.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                >
                  <td style={{ padding: '0.75rem 1rem', maxWidth: 280 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', fontFamily: 'monospace' }}>{c.slug}</p>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.category ?? '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.level ?? '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
                      color: statusColor[c.published_status] ?? 'var(--text-muted)',
                      background: `${statusColor[c.published_status] ?? 'var(--text-muted)'}18`,
                    }}>
                      {c.published_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'nowrap' }}>
                      {c.is_alison === 1 && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: 'var(--amber)' }}>Alison</span>
                      )}
                      {c.is_affiliate === 1 && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4, background: 'rgba(79,110,247,0.1)', color: 'var(--accent)' }}>Affiliate</span>
                      )}
                      {c.featured_priority > 0 && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)' }}>P{c.featured_priority}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {c.is_alison === 1
                      ? <EnrollRefresh slug={c.slug} initialCount={c.enroll_count ?? null} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                    {new Date(c.updated_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', width: '1%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Link
                        href={`/courses/${c.slug}`}
                        target="_blank"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 600 }}
                      >
                        View <ExternalLink size={12} />
                      </Link>
                      <CourseActions
                        courseId={c.id}
                        currentStatus={c.published_status}
                        title={c.title}
                        category={c.category}
                        level={c.level}
                        snippet={c.snippet}
                        providerId={c.provider_id}
                      />
                    </div>
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
