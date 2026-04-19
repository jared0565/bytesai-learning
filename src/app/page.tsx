import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, BookOpen, ShieldCheck, TrendingUp, Lightbulb } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard, { CourseCardSkeleton } from '@/components/ui/CourseCard';
import AuthButton from '@/components/ui/AuthButton';
import SharePanel from '@/components/ui/SharePanel';
import { getDB, getRecentPublishedCuratedPages } from '@/lib/db';
import { CATEGORIES } from '@/lib/ranking';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'BytesAI Learning — Free AI Courses, Curated',
  description:
    'Discover the best free AI courses from Microsoft, Google, Anthropic, NVIDIA, and DeepLearning.AI. Curated, verified, and free to start today.',
};

// Attempt to get DB from the runtime environment

/** Interleave non-Alison and Alison courses so each 4-card row has 2 of each.
 *  Pattern: [non, alison, non, alison, non, alison, …]
 *  If one pool runs short, remaining slots are filled from the other.
 */
function interleaveCourses(
  nonAlison: import('@/lib/db').Course[],
  alison: import('@/lib/db').Course[],
): import('@/lib/db').Course[] {
  const result: import('@/lib/db').Course[] = [];
  const maxLen = Math.max(nonAlison.length, alison.length);
  for (let i = 0; i < maxLen; i++) {
    if (nonAlison[i]) result.push(nonAlison[i]);
    if (alison[i])    result.push(alison[i]);
  }
  return result;
}

async function getHomeData() {
  const db = await getDB();
  if (!db) return { featured: [], trending: [], insights: [], courseCount: 0, providerCount: 0 };
  try {
    const [
      featuredNonAlison,
      featuredAlison,
      trendingNonAlison,
      trendingAlison,
      counts,
      insights,
    ] = await Promise.all([
      // Featured — non-Alison: by featured_priority then popularity
      db.prepare(
        `SELECT * FROM courses WHERE published_status = 'published' AND is_alison = 0
         ORDER BY featured_priority DESC, popularity_score DESC LIMIT 4`
      ).all<import('@/lib/db').Course>(),
      // Featured — Alison: by featured_priority
      db.prepare(
        `SELECT * FROM courses WHERE published_status = 'published' AND is_alison = 1
         ORDER BY featured_priority DESC, popularity_score DESC LIMIT 4`
      ).all<import('@/lib/db').Course>(),
      // Trending — non-Alison
      db.prepare(
        `SELECT * FROM courses WHERE published_status = 'published' AND is_alison = 0
         ORDER BY (recent_views_30d * 0.45 + unique_learners_30d * 0.30 + starts_30d * 0.15 + completion_rate * 0.10) DESC
         LIMIT 4`
      ).all<import('@/lib/db').Course>(),
      // Trending — Alison
      db.prepare(
        `SELECT * FROM courses WHERE published_status = 'published' AND is_alison = 1
         ORDER BY (recent_views_30d * 0.45 + unique_learners_30d * 0.30 + starts_30d * 0.15 + completion_rate * 0.10) DESC
         LIMIT 4`
      ).all<import('@/lib/db').Course>(),
      db.prepare(
        `SELECT
          (SELECT COUNT(*) FROM courses WHERE published_status = 'published') as courses,
          (SELECT COUNT(DISTINCT provider_id) FROM courses WHERE published_status = 'published' AND provider_id IS NOT NULL) as providers`
      ).first<{ courses: number; providers: number }>(),
      getRecentPublishedCuratedPages(db, 3),
    ]);

    return {
      featured: interleaveCourses(featuredNonAlison.results, featuredAlison.results),
      trending: interleaveCourses(trendingNonAlison.results, trendingAlison.results),
      insights,
      courseCount: counts?.courses ?? 0,
      providerCount: counts?.providers ?? 0,
    };
  } catch {
    return { featured: [], trending: [], insights: [], courseCount: 0, providerCount: 0 };
  }
}

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? await verifySession(token) : null;
}

const FEATURES = [
  { icon: <Zap size={20} />, title: 'Verified free', desc: 'Every course is checked before it goes live. No paywalls hidden behind "free" labels.' },
  { icon: <ShieldCheck size={20} />, title: 'Trusted sources', desc: 'Courses from Microsoft, Google, Anthropic, NVIDIA, Stanford, and more.' },
  { icon: <TrendingUp size={20} />, title: 'Always current', desc: 'Catalog updated as the AI landscape evolves — not a static list from 2022.' },
];

export default async function HomePage() {
  const [session, { featured: featuredCourses, trending, insights, courseCount, providerCount }] = await Promise.all([
    getSession(),
    getHomeData(),
  ]);

  const hasFeatured = featuredCourses.length > 0;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section id="hero" className="hero">
          <div className="container hero-grid">
            <div>
              {/* Share buttons — labeled for clarity */}
              <div className="hero-share-row">
                <span className="hero-share-label">Share this resource:</span>
                <SharePanel
                  url="https://learn.bytesai.uk"
                  title="BytesAI Learning"
                  description="100+ free AI courses from Google, Microsoft, Anthropic & NVIDIA — curated, verified, no paywalls. Genuinely worth your time."
                  compact
                  labeled
                />
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)', padding: '0.375rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: '#e0e7ff', marginBottom: '1.5rem' }}>
                <Sparkles size={13} />
                {courseCount > 0 ? courseCount : '100'}+ courses · {providerCount > 0 ? providerCount : '28'} providers · 100% free to start
              </div>
              <h1 className="text-hero" style={{ color: 'white', marginBottom: '1.25rem' }}>
                The best <span className="gradient-text">free</span> AI courses,{' '}
                curated for you.
              </h1>
              <p className="hero-subtitle" style={{ fontSize: '1.125rem', color: '#cbd5e1', lineHeight: 1.75, maxWidth: 540, marginBottom: '2rem' }}>
                Stop hunting across 20 tabs. We curate and verify the best free AI learning from
                Microsoft, Anthropic, Google, NVIDIA, DeepLearning.AI, and more — in one place.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
                <Link href="/courses" className="btn btn-primary btn-lg">
                  Explore free courses <ArrowRight size={18} />
                </Link>
                {!session && (
                  <AuthButton className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
                    Save progress — it&apos;s free
                  </AuthButton>
                )}
              </div>

            </div>

            {/* Right column — feature pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {FEATURES.map(f => (
                <div key={f.title} className="card card-glass" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white' }}>
                    {f.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: 'white', fontSize: '0.875rem' }}>{f.title}</p>
                    <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.2rem', lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </div>
              ))}

              {/* Course preview strip — shows 2 featured courses as a concrete product preview */}
              {featuredCourses.slice(0, 2).map(course => (
                <a
                  key={course.id}
                  href={course.destination_url ?? course.affiliate_url ?? course.official_link ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-glass"
                  style={{ padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', textDecoration: 'none' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: 'white', fontSize: '0.8125rem', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {course.title}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      {course.provider_id ?? course.author_or_source}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(52,211,153,0.18)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 'var(--radius-full)', padding: '0.2rem 0.5rem', flexShrink: 0 }}>
                    FREE
                  </span>
                </a>
              ))}

              {featuredCourses.length > 0 && (
                <Link href="/courses" style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.25rem' }}>
                  See all {courseCount > 0 ? courseCount : '100'}+ free courses <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── Featured Above the Fold ───────────────────────────── */}
        <section id="featured" className="section-sm" style={{ background: 'var(--bg)' }}>
          <div className="container">
            <div className="section-header">
              <h2 className="section-header-title">⭐ Featured this week</h2>
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
            <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'var(--amber-soft)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: '#92400e' }} className="dark-hide">
              💡 <strong>Affiliate note:</strong> Some cards above link to Alison courses (marked with an Alison badge). We may earn a commission if you purchase a certificate — the course itself is always free.
            </div>
          </div>
        </section>

        {/* ── Trending ──────────────────────────────────────────── */}
        <section id="trending" className="section" style={{ background: 'var(--bg-card)' }}>
          <div className="container">
            <div className="section-header">
              <div>
                <h2 className="section-header-title">🔥 Trending courses</h2>
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

        {/* ── Alison promo ──────────────────────────────────────── */}
        <section className="section-sm" style={{ background: 'var(--bg-card)' }}>
          <div className="container">
            <a
              href="https://alison.com/?utm_source=alison_user&utm_medium=affiliate&utm_campaign=27668723"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.08))', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '1.4rem' }}>🏆</span>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 800, color: '#fde68a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Want a certificate to show for it?
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#fef3c7', lineHeight: 1.5 }}>
                    Alison offers 100+ free AI &amp; tech courses — free to learn, optional paid certificate. Affiliate link.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.9375rem', fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>
                  Browse Alison <ArrowRight size={16} />
                </div>
              </div>
            </a>
          </div>
        </section>

        {/* ── AI Insights ───────────────────────────────────────── */}
        {insights.length > 0 && (
          <section className="section-sm" style={{ background: 'var(--bg)' }}>
            <div className="container">
              <div className="section-header">
                <div>
                  <h2 className="section-header-title">💡 AI Insights</h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    What&apos;s changing in AI — why it matters &amp; which courses to take
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
                      background: 'linear-gradient(135deg, rgba(79,110,247,0.15), rgba(20,184,166,0.1))',
                      border: '1px solid rgba(79,110,247,0.2)',
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

        {/* ── Category Grid ─────────────────────────────────────── */}
        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-header-title">📚 Browse by topic</h2>
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

        {/* ── Viral / Share CTA ──────────────────────────────────── */}
        <section className="section-sm" style={{ background: 'var(--bg)' }}>
          <div className="container-sm" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚀</p>
            <h2 className="text-display" style={{ marginBottom: '0.5rem' }}>Know someone learning AI?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              Help a friend, colleague, or student discover 100+ free AI courses. Share BytesAI Learning — it only takes a second.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SharePanel
                url="https://learn.bytesai.uk"
                title="BytesAI Learning"
                description="100+ free AI courses from Google, Microsoft, Anthropic & NVIDIA — curated, verified, no paywalls. Genuinely worth your time."
                compact
              />
            </div>
          </div>
        </section>

        {/* ── Sign-up CTA ───────────────────────────────────────── */}
        {!session && (
          <section className="section" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white' }}>
            <div className="container-sm" style={{ textAlign: 'center' }}>
              <h2 className="text-display" style={{ color: 'white', marginBottom: '1rem' }}>
                Track your progress, save courses
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: 'clamp(0.9375rem, 2.5vw, 1.0625rem)', marginBottom: '2rem', lineHeight: 1.7 }}>
                Create a free account to save courses, track what you&apos;ve started, and get personalised recommendations.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <AuthButton className="btn btn-primary btn-lg">
                  Get started free <ArrowRight size={18} />
                </AuthButton>
                <Link href="/courses" className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
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
