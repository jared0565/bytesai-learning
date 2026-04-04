import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, SlidersHorizontal, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard, { CourseCardSkeleton } from '@/components/ui/CourseCard';
import { searchCourses, getDB} from '@/lib/db';
import { CATEGORIES, LEVELS, ACCESS_MODELS } from '@/lib/ranking';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { isValidSlug } from '@/lib/security';

export const metadata: Metadata = {
  title: 'Browse AI Courses',
  description:
    'Search and filter 108+ free AI courses from top providers. Filter by level, category, format, and more.',
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    level?: string;
    format?: string;
    sort?: string;
    provider?: string;
    page?: string;
  }>;
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'featured', label: 'Featured first' },
  { value: 'newest', label: 'Newest' },
  { value: 'beginner', label: 'Beginner friendly' },
  { value: 'title', label: 'A – Z' },
];

export default async function CoursesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  // Safe param handling
  const q = typeof params.q === 'string' ? params.q.slice(0, 200) : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const level = typeof params.level === 'string' ? params.level : undefined;
  const sort = typeof params.sort === 'string' ? params.sort : 'popular';

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const db = await getDB();
  let courses: import('@/lib/db').Course[] = [];
  let total = 0;

  if (db) {
    try {
      const result = await searchCourses(db, { q, category, level, sort, limit, offset });
      courses = result.courses;
      total = result.total;
    } catch {
      // graceful degradation
    }
  }

  const totalPages = Math.ceil(total / limit);

  // Build query string helpers
  function buildUrl(overrides: Record<string, string | undefined>) {
    const base = { q, category, level, sort };
    const merged = { ...base, ...overrides };
    const clean = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined)) as Record<string, string>;
    const qs = new URLSearchParams(clean).toString();
    return `/courses${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        {/* Page header */}
        <div className="courses-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '3rem 0 2rem', color: 'white' }}>
          <div className="container">
            <h1 className="text-display" style={{ color: 'white', marginBottom: '0.5rem' }}>Browse AI courses</h1>
            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
              {total > 0 ? `${total} courses` : 'Loading courses…'} · all free to start
            </p>

            {/* Search bar */}
            <form method="GET" action="/courses" style={{ marginTop: '1.5rem', position: 'relative', maxWidth: 560, width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                id="course-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search courses, providers, topics…"
                className="input"
                style={{ paddingLeft: '2.75rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                maxLength={200}
                autoComplete="off"
              />
              {category && <input type="hidden" name="category" value={category} />}
              {level && <input type="hidden" name="level" value={level} />}
              {sort && sort !== 'popular' && <input type="hidden" name="sort" value={sort} />}
            </form>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
          <div className="layout-sidebar">

            {/* ── Sidebar filters ── */}
            <aside>
              <div className="card sidebar-sticky" style={{ padding: '1.25rem', position: 'sticky', top: '80px' }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <SlidersHorizontal size={15} /> Filters
                </p>

                {/* Sort */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="label" htmlFor="sort-select">Sort by</label>
                  <select
                    id="sort-select"
                    name="sort"
                    className="input"
                    style={{ fontSize: '0.875rem' }}
                    defaultValue={sort}
                    onChange={undefined}
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <p className="label">Category</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <Link href={buildUrl({ category: undefined })} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem', borderRadius: 6, background: !category ? 'var(--accent-soft)' : 'transparent', color: !category ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: !category ? 700 : 400 }}>
                      All categories
                    </Link>
                    {CATEGORIES.map(cat => (
                      <Link
                        key={cat.slug}
                        href={buildUrl({ category: cat.db })}
                        style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem', borderRadius: 6, background: category === cat.db ? 'var(--accent-soft)' : 'transparent', color: category === cat.db ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: category === cat.db ? 700 : 400 }}
                      >
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Level */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <p className="label">Level</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <Link href={buildUrl({ level: undefined })} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem', borderRadius: 6, background: !level ? 'var(--accent-soft)' : 'transparent', color: !level ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: !level ? 700 : 400 }}>
                      All levels
                    </Link>
                    {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                      <Link
                        key={l}
                        href={buildUrl({ level: l })}
                        style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem', borderRadius: 6, background: level === l ? 'var(--accent-soft)' : 'transparent', color: level === l ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: level === l ? 700 : 400 }}
                      >
                        {l}
                      </Link>
                    ))}
                  </div>
                </div>

                {(q || category || level) && (
                  <Link href="/courses" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    Clear filters
                  </Link>
                )}
              </div>
            </aside>

            {/* ── Course grid ── */}
            <div>
              {q && (
                <p style={{ marginBottom: '1.25rem', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                  Results for <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{q}&rdquo;</strong>
                  {total > 0 && <> · {total} found</>}
                </p>
              )}

              {courses.length === 0 && !db ? (
                <div className="grid-3">
                  {Array.from({ length: 9 }).map((_, i) => <CourseCardSkeleton key={i} />)}
                </div>
              ) : courses.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>🔍</p>
                  <p style={{ fontWeight: 600 }}>No courses found</p>
                  <p className="text-sm" style={{ marginTop: '0.5rem' }}>Try different keywords or clear the filters.</p>
                  <Link href="/courses" className="btn btn-primary btn-sm" style={{ marginTop: '1.25rem', display: 'inline-flex' }}>
                    Clear all filters
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid-3">
                    {courses.map(course => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
                      {page > 1 && (
                        <Link href={buildUrl({ page: String(page - 1) })} className="btn btn-outline btn-sm">
                          ← Previous
                        </Link>
                      )}
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                        <Link
                          key={p}
                          href={buildUrl({ page: String(p) })}
                          className="btn btn-sm"
                          style={{ background: p === page ? 'var(--accent)' : 'var(--bg-card)', color: p === page ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
                        >
                          {p}
                        </Link>
                      ))}
                      {page < totalPages && (
                        <Link href={buildUrl({ page: String(page + 1) })} className="btn btn-outline btn-sm">
                          Next →
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
