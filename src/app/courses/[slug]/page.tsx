import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, BookOpen, ArrowLeft, CheckCircle2, Info, Calendar } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import { getCourseBySlug, getRelatedCourses, getProviderBySlug, getUserProgress } from '@/lib/db';
import { isValidSlug } from '@/lib/security';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import CourseSidebarActions from './CourseSidebarActions';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getDB() {
  return (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDB();
  if (!db || !isValidSlug(slug)) return { title: 'Course Not Found' };
  const course = await getCourseBySlug(db, slug).catch(() => null);
  if (!course) return { title: 'Course Not Found' };
  return {
    title: course.meta_title ?? course.title,
    description: course.meta_description ?? course.snippet ?? undefined,
    openGraph: {
      title: course.og_title ?? course.title,
      description: course.og_description ?? course.snippet ?? undefined,
      images: course.og_image_url ? [course.og_image_url] : undefined,
      type: 'article',
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

  const [related, provider, userProgress] = await Promise.all([
    getRelatedCourses(db, course.id, course.category ?? '', 4).catch(() => []),
    course.provider_id ? getProviderBySlug(db, course.provider_id.replace('prov-', '')).catch(() => null) : null,
    session ? getUserProgress(db, session.userId).catch(() => []) : Promise.resolve([]),
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
    url: `https://learn.bytesai.com/courses/${course.slug}`,
    isAccessibleForFree: true,
    educationalLevel: course.level ?? undefined,
    inLanguage: 'en',
  };

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main>
        {/* Breadcrumb */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0.875rem 0' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
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

        <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '3rem', alignItems: 'start' }}>

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
                  href={course.official_link ?? course.destination_url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600 }}
                >
                  <BookOpen size={14} /> Official source <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* ── Sidebar ── */}
            <aside style={{ position: 'sticky', top: '80px' }}>
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
                  style={{ width: '100%', justifyContent: 'center', marginBottom: '0.875rem', fontSize: '1rem' }}
                >
                  Start learning <ExternalLink size={16} />
                </a>

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
            <section style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
              <div className="section-header">
                <h2 className="section-header-title">Related courses</h2>
                <Link href={`/courses?category=${encodeURIComponent(course.category ?? '')}`} className="section-viewall">
                  See all <ExternalLink size={13} />
                </Link>
              </div>
              <div className="grid-4">
                {related.map(c => (
                  <CourseCard key={c.id} course={c} />
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
