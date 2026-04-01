import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Clock, Bookmark, TrendingUp, ArrowRight, LayoutDashboard } from 'lucide-react';
import VerificationBanner from '@/components/VerificationBanner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getUserProgress, getTrendingCourses, getCoursesByIds } from '@/lib/db';
import type { Course, UserCourseProgress } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Your Dashboard',
  robots: { index: false, follow: false },
};

async function getDB() {
  return (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/auth/login?from=/dashboard');

  const db = await getDB();

  let progress: UserCourseProgress[] = [];
  let trending: Course[] = [];

  if (db) {
    [progress, trending] = await Promise.all([
      getUserProgress(db, session.userId).catch(() => []),
      getTrendingCourses(db, 4).catch(() => []),
    ]);
  }

  const inProgress = progress.filter(p => p.status === 'started');
  const saved = progress.filter(p => p.status === 'saved');
  const completed = progress.filter(p => p.status === 'completed');

  // Fetch course details for dashboard cards
  const neededIds = [
    ...inProgress.slice(0, 3).map(p => p.course_id),
    ...saved.slice(0, 4).map(p => p.course_id),
  ];
  const courseDetails = db && neededIds.length > 0
    ? await getCoursesByIds(db, neededIds).catch(() => [] as Course[])
    : [] as Course[];
  const courseMap = new Map(courseDetails.map(c => [c.id, c]));

  return (
    <>
      <Header userRole={session.role} displayName={session.displayName} />

      <main style={{ minHeight: 'calc(100dvh - 64px)', background: 'var(--bg)' }}>
        {/* Email verification banner */}
        {session.emailVerified === false && <VerificationBanner email={session.email} />}

        {/* Header bar */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '2.5rem 0 2rem', color: 'white' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <LayoutDashboard size={20} style={{ opacity: 0.7 }} />
              <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Dashboard</span>
            </div>
            <h1 className="text-heading" style={{ color: 'white' }}>
              Welcome back{session.displayName ? `, ${session.displayName.split(' ')[0]}` : ''} 👋
            </h1>
            <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.9375rem' }}>
              Here&apos;s where you left off.
            </p>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
            {[
              { icon: <Clock size={20} />, label: 'In Progress', value: inProgress.length, href: '/my-learning?filter=started', color: 'var(--accent)' },
              { icon: <Bookmark size={20} />, label: 'Saved', value: saved.length, href: '/saved', color: 'var(--amber)' },
              { icon: <TrendingUp size={20} />, label: 'Completed', value: completed.length, href: '/my-learning?filter=completed', color: 'var(--emerald)' },
            ].map(stat => (
              <Link key={stat.label} href={stat.href} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', textDecoration: 'none' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                  {stat.icon}
                </div>
                <div>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, color: stat.color }}>{stat.value}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{stat.label}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Continue Learning */}
          {inProgress.length > 0 && (
            <section style={{ marginBottom: '2.5rem' }}>
              <div className="section-header">
                <h2 className="section-header-title">Continue learning</h2>
                <Link href="/my-learning" className="section-viewall">All courses <ArrowRight size={14} /></Link>
              </div>
              <div className="grid-3">
                {inProgress.slice(0, 3).map(p => {
                  const course = courseMap.get(p.course_id);
                  return (
                    <div key={p.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <span className="badge badge-level">In Progress</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent)' }}>
                          {Math.round(p.progress_percent)}%
                        </span>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                        {course?.title ?? 'Course unavailable'}
                      </p>
                      {course?.category && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{course.category}</p>
                      )}
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.progress_percent}%`, background: 'linear-gradient(90deg, var(--accent), var(--teal))', borderRadius: 3, transition: 'width 0.5s' }} />
                      </div>
                      {course && (
                        <Link href={`/courses/${course.slug}`} className="btn btn-primary btn-sm" style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                          Continue <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Saved courses */}
          {saved.length > 0 && (
            <section style={{ marginBottom: '2.5rem' }}>
              <div className="section-header">
                <h2 className="section-header-title">Saved courses</h2>
                <Link href="/saved" className="section-viewall">See all <ArrowRight size={14} /></Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {saved.slice(0, 4).map(p => {
                  const course = courseMap.get(p.course_id);
                  return (
                    <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
                      <Bookmark size={16} color="var(--amber)" style={{ flexShrink: 0 }} />
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {course?.title ?? 'Course unavailable'}
                      </p>
                      {course && (
                        <Link href={`/courses/${course.slug}`} className="btn btn-outline btn-sm">View</Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recommended / Trending */}
          {trending.length > 0 && (
            <section>
              <div className="section-header">
                <h2 className="section-header-title">Recommended for you</h2>
                <Link href="/courses" className="section-viewall">Browse all <ArrowRight size={14} /></Link>
              </div>
              <div className="grid-4">
                {trending.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {progress.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem', marginBottom: '2.5rem' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚀</p>
              <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>Ready to start learning?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
                Browse the catalog and save or start any free course. Your progress will appear here.
              </p>
              <Link href="/courses" className="btn btn-primary">
                Browse AI courses <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
