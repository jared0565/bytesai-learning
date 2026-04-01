import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, BookOpen, ShieldCheck, TrendingUp } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard, { CourseCardSkeleton } from '@/components/ui/CourseCard';
import { getFeaturedCourses, getTrendingCourses } from '@/lib/db';
import { CATEGORIES } from '@/lib/ranking';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'BytesAI Learning — Free AI Courses, Curated',
  description:
    'Discover the best free AI courses from Microsoft, Google, Anthropic, NVIDIA, and DeepLearning.AI. Curated, verified, and free to start today.',
};

// Attempt to get DB from the runtime environment
async function getDB() {
  // In Cloudflare Workers context, DB is on globalThis
  const db = (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined;
  return db ?? null;
}

async function getHomeData() {
  const db = await getDB();
  if (!db) return { alison: [], dynamic: [], trending: [] };
  try {
    const [featured, trending] = await Promise.all([
      getFeaturedCourses(db),
      getTrendingCourses(db, 8),
    ]);
    return { ...featured, trending };
  } catch {
    return { alison: [], dynamic: [], trending: [] };
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
  const [session, { alison, dynamic, trending }] = await Promise.all([
    getSession(),
    getHomeData(),
  ]);

  const featuredCourses = [
    ...(alison ?? []).slice(0, 2),
    ...(dynamic ?? []).slice(0, 2),
  ];

  const hasFeatured = featuredCourses.length > 0;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)', padding: '0.375rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: '#e0e7ff', marginBottom: '1.5rem' }}>
                <Sparkles size={13} />
                108 courses · 28 providers · 100% free to start
              </div>
              <h1 className="text-hero" style={{ color: 'white', marginBottom: '1.25rem' }}>
                The best free AI courses,{' '}
                <span className="gradient-text">curated for you</span>
              </h1>
              <p style={{ fontSize: '1.125rem', color: '#cbd5e1', lineHeight: 1.75, maxWidth: 540, marginBottom: '2rem' }}>
                Stop hunting across 20 tabs. We curate and verify the best free AI learning from
                Microsoft, Anthropic, Google, NVIDIA, DeepLearning.AI, and more — in one place.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
                <Link href="/courses" className="btn btn-primary btn-lg">
                  Browse all courses <ArrowRight size={18} />
                </Link>
                {!session && (
                  <Link href="/auth/register" className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
                    Create free account
                  </Link>
                )}
              </div>

              {/* Alison CTA */}
              <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fde68a' }}>🏆 Free to learn, optional paid certificates</p>
                  <p style={{ fontSize: '0.8125rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                    Enrol on Alison — free to study, certificate is optional.{' '}
                    <span style={{ color: '#fef3c7', fontStyle: 'italic', fontSize: '0.75rem' }}>Affiliate link.</span>
                  </p>
                </div>
                <a
                  href="https://alison.com/?utm_source=alison_user&utm_medium=affiliate&utm_campaign=27668723"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-accent btn-sm"
                  id="hero-alison-cta"
                >
                  Browse Alison Courses <ArrowRight size={14} />
                </a>
              </div>
            </div>

            {/* Floating feature pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {FEATURES.map(f => (
                <div key={f.title} className="card card-glass" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white' }}>
                    {f.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: 'white', fontSize: '0.9375rem' }}>{f.title}</p>
                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem', lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Above the Fold ───────────────────────────── */}
        <section className="section-sm" style={{ background: 'var(--bg)' }}>
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
                  <CourseCard key={course.id} course={course} featured={i < 2} />
                ))}
              </div>
            ) : (
              <div className="grid-4">
                {Array.from({ length: 4 }).map((_, i) => <CourseCardSkeleton key={i} />)}
              </div>
            )}
            <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'var(--amber-soft)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: '#92400e' }} className="dark-hide">
              💡 <strong>Affiliate note:</strong> The first two cards above link to Alison courses. We may earn a commission if you purchase a certificate — the course itself is free.
            </div>
          </div>
        </section>

        {/* ── Trending ──────────────────────────────────────────── */}
        <section className="section" style={{ background: 'var(--bg-card)' }}>
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
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="grid-4">
                {Array.from({ length: 8 }).map((_, i) => <CourseCardSkeleton key={i} />)}
              </div>
            )}
          </div>
        </section>

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

        {/* ── Sign-up CTA ───────────────────────────────────────── */}
        {!session && (
          <section className="section" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white' }}>
            <div className="container" style={{ textAlign: 'center', maxWidth: 640 }}>
              <h2 className="text-display" style={{ color: 'white', marginBottom: '1rem' }}>
                Track your progress, save courses
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '1.0625rem', marginBottom: '2rem', lineHeight: 1.7 }}>
                Create a free account to save courses, track what you've started, and get personalised recommendations.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/auth/register" className="btn btn-primary btn-lg">
                  Get started free <ArrowRight size={18} />
                </Link>
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
