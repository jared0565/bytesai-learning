import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Lightbulb } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard, { CourseCardSkeleton } from '@/components/ui/CourseCard';
import AuthButton from '@/components/ui/AuthButton';
import { getDB, getRecentPublishedCuratedPages, distributeCourses } from '@/lib/db';
import { CATEGORIES } from '@/lib/ranking';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'BytesAI Learning — Free AI Courses, Curated',
  description:
    'Discover the best free AI courses from Microsoft, Google, Anthropic, NVIDIA, and DeepLearning.AI. Curated, verified, and free to start today.',
};

async function getHomeData() {
  const db = await getDB();
  if (!db) return { featured: [], trending: [], insights: [] };
  try {
    const [
      featuredNonAlison,
      featuredAlison,
      trendingNonAlison,
      trendingAlison,
      insights,
    ] = await Promise.all([
      db.prepare(
        `SELECT * FROM courses WHERE published_status = 'published' AND is_alison = 0
         ORDER BY featured_priority DESC, popularity_score DESC LIMIT 4`
      ).all<import('@/lib/db').Course>(),
      db.prepare(
        `SELECT * FROM courses WHERE published_status = 'published' AND is_alison = 1
         ORDER BY featured_priority DESC, popularity_score DESC LIMIT 4`
      ).all<import('@/lib/db').Course>(),
      db.prepare(
        `SELECT * FROM courses WHERE published_status = 'published' AND is_alison = 0
         ORDER BY (recent_views_30d * 0.45 + unique_learners_30d * 0.30 + starts_30d * 0.15 + completion_rate * 0.10) DESC
         LIMIT 4`
      ).all<import('@/lib/db').Course>(),
      db.prepare(
        `SELECT * FROM courses WHERE published_status = 'published' AND is_alison = 1
         ORDER BY (recent_views_30d * 0.45 + unique_learners_30d * 0.30 + starts_30d * 0.15 + completion_rate * 0.10) DESC
         LIMIT 4`
      ).all<import('@/lib/db').Course>(),
      getRecentPublishedCuratedPages(db, 3),
    ]);

    return {
      featured: distributeCourses([...featuredNonAlison.results, ...featuredAlison.results]),
      trending: distributeCourses([...trendingNonAlison.results, ...trendingAlison.results]),
      insights,
    };
  } catch {
    return { featured: [], trending: [], insights: [] };
  }
}

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? await verifySession(token) : null;
}

export default async function HomePage() {
  const [session, { featured: featuredCourses, trending, insights }] = await Promise.all([
    getSession(),
    getHomeData(),
  ]);

  const hasFeatured = featuredCourses.length > 0;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        {/* Hero */}
        <section id="hero" className="hero">
          <div className="container" style={{ maxWidth: 700 }}>
            <h1 className="text-hero" style={{ marginBottom: '1.25rem' }}>
              The best free AI courses, curated for you.
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 540, marginBottom: '2rem' }}>
              Stop hunting across 20 tabs. We curate and verify the best free AI learning from
              Microsoft, Anthropic, Google, NVIDIA, DeepLearning.AI, and more, in one place.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
              <Link href="/courses" className="btn btn-primary btn-lg">
                Explore free courses <ArrowRight size={18} />
              </Link>
              {!session && (
                <AuthButton className="btn btn-outline btn-lg">
                  Save progress, it&apos;s free
                </AuthButton>
              )}
            </div>
          </div>
        </section>

        {/* Featured Above the Fold */}
        <section id="featured" className="section-sm" style={{ background: 'var(--bg-alt)' }}>
          <div className="container">
            <div className="section-header">
              <h2 className="section-header-title">Featured this week</h2>
              <Link href="/courses?sort=featured" className="section-viewall">
                See all <ArrowRight size={14} />
              </Link>
            </div>
            {hasFeatured ? (
              <div className="grid-4">
                {featuredCourses.map((course, i) => (
                  <CourseCard key={course.id} course={course} featured={i < 2} isGuest={!session} />
                ))}
              </div>
            ) : (
              <div className="grid-4">
                {Array.from({ length: 4 }).map((_, i) => <CourseCardSkeleton key={i} />)}
              </div>
            )}
            <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'var(--amber-soft)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--amber)' }}>
              <strong>Affiliate note:</strong> Some cards above link to Alison courses (marked with an Alison badge). We may earn a commission if you purchase a certificate; the course itself is always free.
            </div>
          </div>
        </section>

        {/* Trending */}
        <section id="trending" className="section">
          <div className="container">
            <div className="section-header">
              <div>
                <h2 className="section-header-title">Trending courses</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Ordered by learner activity in the last 30 days</p>
              </div>
              <Link href="/courses?sort=popular" className="section-viewall">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {trending.length > 0 ? (
              <div className="grid-4">
                {trending.map(course => (
                  <CourseCard key={course.id} course={course} isGuest={!session} />
                ))}
              </div>
            ) : (
              <div className="grid-4">
                {Array.from({ length: 8 }).map((_, i) => <CourseCardSkeleton key={i} />)}
              </div>
            )}
          </div>
        </section>

        {/* AI Insights */}
        {insights.length > 0 && (
          <section className="section-sm" style={{ background: 'var(--bg-alt)' }}>
            <div className="container">
              <div className="section-header">
                <div>
                  <h2 className="section-header-title">AI Insights</h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    What&apos;s changing in AI, why it matters and which courses to take
                  </p>
                </div>
                <Link href="/curated" className="section-viewall">
                  All insights <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid-3">
                {insights.map(insight => (
                  <Link
                    key={insight.id}
                    href={`/curated/${insight.slug}`}
                    className="card"
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textDecoration: 'none', padding: '1.25rem' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: 'var(--accent-soft)',
                      border: '1px solid oklch(0.52 0.20 265 / 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Lightbulb size={17} color="var(--accent)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                        {insight.title}
                      </p>
                      {insight.summary && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {insight.summary}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', marginTop: 'auto' }}>
                      Read insight <ArrowRight size={12} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Category Grid */}
        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-header-title">Browse by topic</h2>
              <Link href="/categories" className="section-viewall">All categories <ArrowRight size={14} /></Link>
            </div>
            <div className="grid-3">
              {CATEGORIES.map(cat => (
                <Link
                  key={cat.slug}
                  href={`/courses?category=${encodeURIComponent(cat.db)}`}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', textDecoration: 'none' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{cat.label}</p>
                  </div>
                  <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Sign-up CTA */}
        {!session && (
          <section className="section" style={{ background: 'var(--accent-soft)' }}>
            <div className="container-sm" style={{ textAlign: 'center' }}>
              <h2 className="text-display" style={{ marginBottom: '1rem' }}>
                Track your progress, save courses
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', marginBottom: '2rem', lineHeight: 1.7 }}>
                Create a free account to save courses, track what you&apos;ve started, and get personalised recommendations.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <AuthButton className="btn btn-primary btn-lg">
                  Get started free <ArrowRight size={18} />
                </AuthButton>
                <Link href="/courses" className="btn btn-outline btn-lg">
                  Browse without signing in
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
