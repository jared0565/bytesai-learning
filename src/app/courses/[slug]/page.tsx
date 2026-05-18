import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, BookOpen, ArrowLeft, CheckCircle2, Info, Calendar, Bookmark, Lock, UserPlus, LogIn, MonitorPlay, Lightbulb } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import { getCourseBySlug, getRelatedCourses, getProviderBySlug, getUserProgress, getCuratedPagesForCourse, getDB, distributeCourses } from '@/lib/db';
import { isValidSlug } from '@/lib/security';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import CourseSidebarActions from './CourseSidebarActions';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDB();
  if (!db || !isValidSlug(slug)) return { title: 'Course Not Found' };
  const course = await getCourseBySlug(db, slug).catch(() => null);
  if (!course) return { title: 'Course Not Found' };
  const ogImage = course.og_image_url ?? `/api/og?slug=${slug}&type=course`;
  return {
    title: course.meta_title ?? course.title,
    description: course.meta_description ?? course.snippet ?? undefined,
    openGraph: {
      title: course.og_title ?? course.title,
      description: course.og_description ?? course.snippet ?? undefined,
      images: [{ url: ogImage, width: 1200, height: 630, alt: course.title }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: course.og_title ?? course.title,
      description: course.og_description ?? course.snippet ?? undefined,
      images: [ogImage],
    },
    alternates: { canonical: course.canonical_url ?? `/courses/${slug}` },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;

  if (!isValidSlug(slug)) notFound();

  const db = await getDB();
  if (!db) {
    return (
      <>
        <Header />
        <main className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Database not available. Please try again.</p>
        </main>
        <Footer />
      </>
    );
  }

  const [course, cookieStore] = await Promise.all([
    getCourseBySlug(db, slug).catch(() => null),
    cookies(),
  ]);

  if (!course) notFound();

  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const [related, provider, userProgress, relatedInsights] = await Promise.all([
    getRelatedCourses(db, course.id, course.category ?? '', 4).catch(() => []),
    course.provider_id ? getProviderBySlug(db, course.provider_id.replace('prov-', '')).catch(() => null) : null,
    session ? getUserProgress(db, session.userId).catch(() => []) : Promise.resolve([]),
    getCuratedPagesForCourse(db, course.slug).catch(() => []),
  ]);

  const userProgressRecord = userProgress.find(p => p.course_id === course.id);
  const initialStatus = (userProgressRecord?.status ?? null) as 'saved' | 'started' | 'completed' | null;
  const initialProgress = userProgressRecord?.progress_percent ?? 0;

  const isAlison = course.is_alison === 1;
  const isAffiliate = course.is_affiliate === 1;
  const destination = course.affiliate_url ?? course.destination_url ?? course.official_link ?? '#';

  const quickFacts = course.quick_facts_json
    ? JSON.parse(course.quick_facts_json) as Record<string, string>
    : {
        Provider: provider?.name ?? course.provider_id ?? '—',
        Format: course.format_type ?? '—',
        Level: course.level ?? '—',
        Access: course.access_model ?? '—',
        Certificate: course.certification_type ?? 'None',
        'Last verified': course.last_verified_at ?? '—',
      };

  const outcomes: string[] = course.learning_outcomes_json
    ? JSON.parse(course.learning_outcomes_json)
    : [];

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.snippet ?? undefined,
    provider: {
      '@type': 'Organization',
      name: provider?.name ?? 'Unknown',
      sameAs: provider?.website_url ?? undefined,
    },
    url: `https://learn.bytesai.uk/courses/${course.slug}`,
    isAccessibleForFree: true,
    educationalLevel: course.level ?? undefined,
    inLanguage: 'en',
  };

  // ── Membership gate: non-Alison courses require sign-in ──
  const requiresAuth = !isAlison && !session;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main>
        {/* Breadcrumb */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0.875rem 0' }}>
          <div className="container breadcrumb">
            <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <span>/</span>
            <Link href="/courses" style={{ color: 'var(--text-muted)' }}>Courses</Link>
            {course.category && (
              <>
                <span>/</span>
                <Link href={`/courses?category=${encodeURIComponent(course.category)}`} style={{ color: 'var(--text-muted)' }}>
                  {course.category}
                </Link>
              </>
            )}
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, maxWidth: 240 }} className="truncate">{course.title}</span>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
          <div className="layout-detail">

            {/* ── Main content ── */}
            <div>
              {/* Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {course.level && <span className="badge badge-level">{course.level}</span>}
                <span className="badge badge-free">Free to start</span>
                {isAlison && <span className="badge badge-alison">Alison</span>}
                {isAffiliate && <span className="badge badge-affiliate">Affiliate</span>}
                {course.certification_type && course.certification_type !== 'none' && (
                  <span className="badge badge-cert">{course.certification_type}</span>
                )}
                {course.content_type !== 'course' && (
                  <span className="badge badge-level">{course.content_type}</span>
                )}
              </div>

              <h1 className="text-heading" style={{ marginBottom: '1rem', fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
                {course.title}
              </h1>

              {provider && (
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  by <strong style={{ color: 'var(--text-primary)' }}>{provider.name}</strong>
                </p>
              )}

              {/* ── Membership gate notice ── */}
              {requiresAuth ? (
                <>
                  {/* Snippet teaser — visible to everyone */}
                  {course.snippet && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.625rem' }}>About this course</h2>
                      <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>{course.snippet}</p>
                    </div>
                  )}

                  {/* Gate card */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(79,110,247,0.08), rgba(14,165,233,0.06))',
                    border: '1px solid rgba(79,110,247,0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Decorative lock icon */}
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent), var(--teal))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 1.25rem',
                      boxShadow: '0 8px 24px rgba(79,110,247,0.25)',
                    }}>
                      <Lock size={28} color="white" />
                    </div>

                    <h2 style={{ fontSize: 'clamp(1.125rem, 3vw, 1.375rem)', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                      Create a free account to access this course
                    </h2>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 1.5rem' }}>
                      Join BytesAI Learning to unlock full course details, track your progress, and get personalised recommendations. It&apos;s 100% free — no credit card needed.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      <Link
                        href={`/auth/register?from=/courses/${course.slug}`}
                        className="btn btn-primary btn-lg"
                        style={{ minWidth: 200, justifyContent: 'center' }}
                      >
                        <UserPlus size={18} /> Sign up free
                      </Link>
                      <Link
                        href={`/auth/login?from=/courses/${course.slug}`}
                        className="btn btn-outline btn-lg"
                        style={{ minWidth: 200, justifyContent: 'center' }}
                      >
                        <LogIn size={18} /> Log in
                      </Link>
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      Already a member? <Link href={`/auth/login?from=/courses/${course.slug}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link> to continue learning.
                    </p>
                  </div>

                  {/* Blurred preview of what's behind the gate */}
                  <div style={{
                    marginTop: '1.75rem',
                    position: 'relative',
                    overflow: 'hidden',
                    maxHeight: 200,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}>
                    <div style={{ filter: 'blur(6px)', opacity: 0.4 }}>
                      {outcomes.length > 0 && (
                        <div style={{ marginBottom: '1.75rem' }}>
                          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.875rem' }}>What you&apos;ll learn</h2>
                          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {outcomes.slice(0, 3).map((o, i) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                                <CheckCircle2 size={16} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 3 }} />
                                {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="quick-facts">
                        {Object.entries(quickFacts).slice(0, 4).map(([label, value]) => (
                          <div key={label} className="quick-fact">
                            <span className="quick-fact-label">{label}</span>
                            <span className="quick-fact-value">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Fade-out gradient overlay */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
                      background: 'linear-gradient(transparent, var(--bg))',
                      pointerEvents: 'none',
                    }} />
                  </div>
                </>
              ) : (
                <>
                  {/* ── Full content (members + Alison courses) ── */}

                  {/* Quick facts */}
                  <div className="quick-facts" style={{ marginBottom: '1.75rem' }}>
                    {Object.entries(quickFacts).map(([label, value]) => (
                      <div key={label} className="quick-fact">
                        <span className="quick-fact-label">{label}</span>
                        <span className="quick-fact-value">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Affiliate disclosure */}
                  {isAffiliate && (
                    <div className="affiliate-disclosure" style={{ marginBottom: '1.75rem' }}>
                      <strong>Affiliate disclosure:</strong>{' '}
                      {course.disclosure_label ?? provider?.affiliate_disclosure ?? 'This link is an affiliate link. We may earn a commission if you purchase a certificate or diploma. The course content is free.'}
                    </div>
                  )}

                  {/* Snippet / Summary */}
                  {course.snippet && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.625rem' }}>About this course</h2>
                      <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>{course.snippet}</p>
                    </div>
                  )}

                  {/* Long description */}
                  {course.long_description && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>{course.long_description}</p>
                    </div>
                  )}

                  {/* Learning outcomes */}
                  {outcomes.length > 0 && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.875rem' }}>What you&apos;ll learn</h2>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {outcomes.map((o, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                            <CheckCircle2 size={16} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 3 }} />
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Who it's for */}
                  {course.who_its_for && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.625rem' }}>Who this is for</h2>
                      <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>{course.who_its_for}</p>
                    </div>
                  )}

                  {/* What to take next */}
                  {course.what_to_take_next && (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.625rem' }}>What to take next</h2>
                      <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>{course.what_to_take_next}</p>
                    </div>
                  )}

                  {/* Source link + last verified */}
                  <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <Calendar size={14} />
                      Last verified: {course.last_verified_at ?? 'Recently'}
                    </div>
                    <a
                      href={destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600 }}
                    >
                      <BookOpen size={14} /> Official source <ExternalLink size={12} />
                    </a>
                  </div>
                </>
              )}
            </div>

            {/* ── Sidebar ── */}
            <aside className="detail-sidebar">
              <div className="card" style={{ padding: '1.5rem' }}>
                {/* Cover */}
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', aspectRatio: '16/9', background: isAlison ? 'linear-gradient(135deg, #f59e0b22, #fb923c22)' : 'linear-gradient(135deg, var(--accent-soft), var(--teal-soft))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {course.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.cover_image_url} alt={course.cover_image_alt ?? course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <BookOpen size={40} color="var(--text-muted)" />
                  )}
                </div>

                {requiresAuth ? (
                  <>
                    {/* Gated sidebar — sign up CTA */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--emerald)', marginBottom: '0.25rem' }}>Free</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Free account required to access</p>
                    </div>

                    <Link
                      href={`/auth/register?from=/courses/${course.slug}`}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', marginBottom: '0.75rem', fontSize: '1rem' }}
                    >
                      <UserPlus size={16} /> Sign up to access
                    </Link>

                    <Link
                      href={`/auth/login?from=/courses/${course.slug}`}
                      className="btn btn-outline"
                      style={{ width: '100%', justifyContent: 'center', display: 'flex' }}
                    >
                      <LogIn size={16} /> Log in
                    </Link>

                    <div style={{
                      marginTop: '1rem', padding: '0.875rem',
                      background: 'rgba(79,110,247,0.06)', borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(79,110,247,0.12)',
                    }}>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, textAlign: 'center' }}>
                        <Lock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
                        Sign up takes 30 seconds. No credit card. Track your progress and save courses.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Full sidebar — members + Alison */}

                    {/* Price note */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--emerald)', marginBottom: '0.25rem' }}>Free</p>
                      {course.certification_type && course.certification_type !== 'none' && (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{course.certification_type} — optional paid</p>
                      )}
                    </div>

                    {/* Primary CTA */}
                    <a
                      id="course-start-cta"
                      href={destination}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', marginBottom: isAlison ? '0.875rem' : '0.5rem', fontSize: '1rem' }}
                    >
                      Start learning <ExternalLink size={16} />
                    </a>

                    {/* Study mode — non-Alison courses only */}
                    {!isAlison && (
                      <Link
                        href={`/learn/${course.slug}`}
                        className="btn btn-outline"
                        style={{
                          width: '100%', justifyContent: 'center',
                          marginBottom: '0.875rem', display: 'flex',
                          alignItems: 'center', gap: '0.375rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        <MonitorPlay size={15} /> Study in BytesAI
                      </Link>
                    )}

                    {/* Save + Share */}
                    {session ? (
                      <CourseSidebarActions
                        courseId={course.id}
                        courseSlug={course.slug}
                        courseTitle={course.title}
                        initialStatus={initialStatus}
                        initialProgress={initialProgress}
                      />
                    ) : (
                      <>
                        <Link href={`/auth/register?from=/courses/${course.slug}`} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                          <Bookmark size={16} /> Sign in to save
                        </Link>
                        <CourseSidebarActions
                          courseId={course.id}
                          courseSlug={course.slug}
                          courseTitle={course.title}
                          initialStatus={null}
                          initialProgress={0}
                          shareOnly
                        />
                      </>
                    )}

                    {isAffiliate && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.875rem', textAlign: 'center', lineHeight: 1.5 }}>
                        <Info size={11} style={{ display: 'inline', marginRight: 3 }} />
                        Affiliate link — we may earn a commission on certificate purchases. Free to learn.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Provider card */}
              {provider && (
                <div className="card" style={{ padding: '1rem 1.25rem', marginTop: '1rem' }}>
                  <p className="text-sm" style={{ fontWeight: 700, marginBottom: '0.5rem' }}>About {provider.name}</p>
                  {isAlison && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.75rem' }}>
                      <span className="badge badge-free" style={{ width: 'fit-content' }}>Free to learn</span>
                      <span className="badge badge-cert" style={{ width: 'fit-content' }}>Optional paid certificate</span>
                    </div>
                  )}
                  <Link href={`/providers/${provider.slug}`} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}>
                    View all {provider.name} courses <ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} />
                  </Link>
                </div>
              )}
            </aside>
          </div>

          {/* Related courses */}
          {related.length > 0 && (
            <section style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <div className="section-header">
                <h2 className="section-header-title">Related courses</h2>
                <Link href={`/courses?category=${encodeURIComponent(course.category ?? '')}`} className="section-viewall">
                  See all <ExternalLink size={13} />
                </Link>
              </div>
              <div className="grid-4">
                {distributeCourses(related).map(c => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}

          {/* Related insights */}
          {relatedInsights.length > 0 && (
            <section style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <h2 className="section-header-title" style={{ marginBottom: '1rem' }}>
                <Lightbulb size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: '-3px', color: 'var(--accent)' }} />
                Related AI insights
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {relatedInsights.map(insight => (
                  <Link
                    key={insight.id}
                    href={`/curated/${insight.slug}`}
                    className="card"
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '1rem',
                      textDecoration: 'none', padding: '1rem 1.25rem',
                      borderLeft: '3px solid var(--accent)',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(79,110,247,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Lightbulb size={15} color="var(--accent)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {insight.title}
                      </p>
                      {insight.summary && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {insight.summary}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', flexShrink: 0, alignSelf: 'center' }}>
                      Read →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
