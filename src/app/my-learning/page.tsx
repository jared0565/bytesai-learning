import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, AlertCircle, ArrowRight, Clock, Star, LayoutList } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getUserProgress, getCourseById, getDB, distributeWithAlisonLimit } from '@/lib/db';

export const metadata: Metadata = {
  title: 'My Learning — BytesAI Learning',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function MyLearningPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/auth/login?from=/my-learning');

  const db = await getDB();
  let progressRecords: import('@/lib/db').UserCourseProgress[] = [];
  let courses: (import('@/lib/db').Course | null)[] = [];

  if (db) {
    try {
      progressRecords = await getUserProgress(db, session.userId);
      // Filter out saved (those go to /saved), keep started and completed
      const activeProgress = progressRecords.filter(p => p.status === 'started' || p.status === 'completed');
      
      // Fetch details for these courses
      courses = await Promise.all(
        activeProgress.map(p => getCourseById(db, p.course_id).catch(() => null))
      );
    } catch {
      // Ignore
    }
  }

  const activeProgress = progressRecords.filter(p => p.status === 'started' || p.status === 'completed');
  const validCourses = courses.filter(Boolean) as import('@/lib/db').Course[];

  const started = activeProgress.filter(p => p.status === 'started');
  const completed = activeProgress.filter(p => p.status === 'completed');

  const filter = params.filter === 'completed' ? 'completed' : 'started';
  const displayItems = filter === 'completed' ? completed : started;

  const courseMap = new Map(validCourses.map(c => [c.id, c]));
  const orderedItems = distributeWithAlisonLimit(
    displayItems.filter(p => courseMap.has(p.course_id)),
    p => courseMap.get(p.course_id)?.is_alison === 1
  );

  return (
    <>
      <Header userRole={session.role} displayName={session.displayName} />

      <main style={{ minHeight: 'calc(100dvh - 64px)', background: 'var(--bg)' }}>
        {/* Header bar */}
        <div style={{ background: 'var(--bg-alt)', padding: '2.5rem 0 2rem', color: 'var(--text-primary)' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <BookOpen size={20} style={{ opacity: 0.7 }} />
              <Link href="/dashboard" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</Link>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>/</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>My Learning</span>
            </div>
            <h1 className="text-display" style={{ color: 'var(--text-primary)' }}>
              My Learning
            </h1>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
            <Link href="/my-learning?filter=started" style={{ 
              padding: '0.75rem 0', fontWeight: 600, borderBottom: filter === 'started' ? '2px solid var(--accent)' : '2px solid transparent',
              color: filter === 'started' ? 'var(--text-primary)' : 'var(--text-muted)'
            }}>
              In Progress ({started.length})
            </Link>
            <Link href="/my-learning?filter=completed" style={{ 
              padding: '0.75rem 0', fontWeight: 600, borderBottom: filter === 'completed' ? '2px solid var(--accent)' : '2px solid transparent',
              color: filter === 'completed' ? 'var(--text-primary)' : 'var(--text-muted)'
            }}>
              Completed ({completed.length})
            </Link>
          </div>

          {!db && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '2rem', fontSize: '0.875rem', color: '#991b1b' }}>
              <AlertCircle size={16} />
              Database not available.
            </div>
          )}

          {/* List */}
          {displayItems.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <LayoutList size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {filter === 'started' ? "You aren't taking any courses right now" : "You haven't completed any courses yet"}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
                {filter === 'started' 
                  ? "Browse the catalog and hit 'Start course' to track your learning here." 
                  : "Finish an active course to see your completions and claims tracking here."}
              </p>
              <Link href="/courses" className="btn btn-primary">
                Browse courses <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid-3">
              {orderedItems.map(p => {
                const course = validCourses.find(c => c.id === p.course_id);
                if (!course) return null;
                return (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <CourseCard course={course} />
                    
                    {/* Progress tracking bar */}
                    <div className="card" style={{ marginTop: '-4px', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none', padding: '1rem 1.25rem', background: 'var(--bg-card)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {filter === 'completed' ? 'Completed' : 'Progress'}
                        </span>
                        <span style={{ fontWeight: 700, color: filter === 'completed' ? 'var(--emerald)' : 'var(--accent)' }}>
                          {filter === 'completed' ? '100%' : `${Math.round(p.progress_percent)}%`}
                        </span>
                      </div>
                      
                      {filter === 'started' && (
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.progress_percent}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s' }} />
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: filter === 'started' ? '1rem' : '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Clock size={12} /> Last active {new Date(p.last_opened_at || p.updated_at).toLocaleDateString()}
                        </span>
                        
                        {filter === 'completed' && course.certification_type && course.certification_type !== 'none' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--amber)' }}>
                            <Star size={12} fill="currentColor" /> Claim Certificate
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
