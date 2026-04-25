import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, ExternalLink, Lightbulb, TrendingUp, AlertCircle, BookOpen, Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import CourseSpecTable from '@/components/ui/CourseSpecTable';
import MarkdownContent from '@/components/ui/MarkdownContent';
import CuratedViewTracker from '@/components/ui/CuratedViewTracker';
import CuratedSharePanel from '@/components/ui/CuratedSharePanel';
import ArticleHelpfulness from '@/components/ui/ArticleHelpfulness';
import { getCuratedPageBySlug, getCuratedPageBySlugAnyStatus, getCourseBySlug, getDB } from '@/lib/db';
import { isValidSlug } from '@/lib/security';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDB();
  if (!db || !isValidSlug(slug)) return { title: 'Insight Not Found' };
  const page = await getCuratedPageBySlug(db, slug).catch(() => null);
  if (!page) return { title: 'Insight Not Found' };

  const ogImageUrl = page.og_image_url ?? `/api/og?slug=${slug}&type=article`;

  return {
    title: page.meta_title ?? page.title,
    description: page.meta_description ?? page.summary ?? undefined,
    openGraph: {
      title: page.og_title ?? page.title,
      description: page.og_description ?? page.summary ?? undefined,
      images: [{ url: ogImageUrl, width: 1200, height: 1200 }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.og_title ?? page.title,
      description: page.og_description ?? page.summary ?? undefined,
      images: [ogImageUrl],
    },
    alternates: { canonical: `https://learn.bytesai.uk/curated/${slug}` },
  };
}

export default async function CuratedDetailPage({ params }: PageProps) {
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

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  // Admins can preview any status; public only sees published
  const isAdmin = session?.role === 'admin';
  const page = isAdmin
    ? await getCuratedPageBySlugAnyStatus(db, slug).catch(() => null)
    : await getCuratedPageBySlug(db, slug).catch(() => null);

  if (!page) notFound();

  // Fetch primary course and related courses in parallel
  const relatedSlugs: string[] = page.related_course_slugs_json
    ? JSON.parse(page.related_course_slugs_json)
    : [];

  const sourceRefs: { title: string; url: string }[] = page.source_references_json
    ? JSON.parse(page.source_references_json)
    : [];

  const [primaryCourse, ...relatedCourses] = await Promise.all([
    page.primary_course_slug ? getCourseBySlug(db, page.primary_course_slug).catch(() => null) : Promise.resolve(null),
    ...relatedSlugs.map(s => getCourseBySlug(db, s).catch(() => null)),
  ]);

  const validRelated = relatedCourses.filter(Boolean) as import('@/lib/db').Course[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.summary ?? undefined,
    url: `https://learn.bytesai.uk/curated/${page.slug}`,
    image: page.og_image_url ?? `https://learn.bytesai.uk/api/og?slug=${slug}&type=article`,
    dateModified: page.last_verified_at ?? page.updated_at,
    datePublished: page.created_at,
    publisher: {
      '@type': 'Organization',
      name: 'BytesAI Learning',
      url: 'https://learn.bytesai.uk',
    },
  };

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main>
        <CuratedViewTracker slug={page.slug} />

        {/* Admin preview banner — shown when page is not yet published */}
        {isAdmin && page.published_status !== 'published' && (
          <div style={{
            background: 'linear-gradient(135deg, #78350f, #92400e)',
            borderBottom: '1px solid #b45309',
            padding: '0.625rem 0',
          }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fcd34d' }}>
                👁 Admin Preview
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#fde68a' }}>
                This page is <strong style={{ color: 'white' }}>{page.published_status}</strong> and not visible to the public.
              </span>
              <Link
                href="/admin/curated"
                style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fcd34d', textDecoration: 'underline', marginLeft: 'auto' }}
              >
                ← Back to admin
              </Link>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0.875rem 0' }}>
          <div className="container breadcrumb">
            <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <span>/</span>
            <Link href="/curated" style={{ color: 'var(--text-muted)' }}>Insights</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, maxWidth: 300 }} className="truncate">{page.title}</span>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem', maxWidth: 900 }}>

          {/* Header */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 className="text-heading" style={{ marginBottom: '1rem', fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
              {page.title}
            </h1>
            {page.summary && (
              <div style={{
                padding: '0.875rem 1.125rem',
                background: 'rgba(79,110,247,0.04)',
                border: '1px solid rgba(79,110,247,0.14)',
                borderLeft: '3px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
              }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent)', marginBottom: '0.375rem' }}>
                  TL;DR
                </p>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  {page.summary}
                </p>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {page.last_verified_at && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <Calendar size={13} />
                  Last verified {new Date(page.last_verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
              {/* AI-generated disclosure badge */}
              {page.ai_generated === 1 && (
                <span
                  title={page.generated_model ? `Generated with AI (${page.generated_model})` : 'Generated with AI assistance'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em', padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
                    border: '1px solid rgba(139,92,246,0.2)',
                    cursor: 'default',
                  }}
                >
                  <Sparkles size={10} /> AI-assisted
                </span>
              )}
              {/* Share button — sits next to the date */}
              <CuratedSharePanel slug={page.slug} title={page.title} />
            </div>
          </div>

          {/* Content sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {page.why_it_matters && (
              <section className="card">
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lightbulb size={20} color="var(--accent)" /> Why this matters right now
                </h2>
                <MarkdownContent>{page.why_it_matters}</MarkdownContent>
              </section>
            )}

            {page.what_changed && (
              <section className="card">
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} color="var(--teal)" /> How this technology has evolved
                </h2>
                <MarkdownContent>{page.what_changed}</MarkdownContent>
              </section>
            )}

            {/* Primary recommended course — structured spec table for AI retrieval */}
            {primaryCourse && (
              <section style={{
                padding: '1.25rem 1.5rem',
                background: 'linear-gradient(135deg, rgba(79,110,247,0.06) 0%, rgba(20,184,166,0.04) 100%)',
                border: '1px solid rgba(79,110,247,0.15)',
                borderRadius: 'var(--radius-md)',
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <BookOpen size={13} /> Recommended course
                </p>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.875rem' }}>
                  Recommended starting point
                </h3>
                <CourseSpecTable course={primaryCourse} rationale={page.primary_course_rationale ?? undefined} />
              </section>
            )}

            {page.executive_implications && (
              <section className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={20} color="var(--accent)" /> What this means for your roadmap
                </h2>
                <MarkdownContent>{page.executive_implications}</MarkdownContent>
              </section>
            )}

            {/* Related courses */}
            {validRelated.length > 0 && (
              <section>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem' }}>
                  Related courses
                </h2>
                <div className="grid-4">
                  {validRelated.map(course => (
                    <CourseCard key={course.id} course={course} isGuest={!session} />
                  ))}
                </div>
              </section>
            )}

            {/* Source references */}
            {sourceRefs.length > 0 && (
              <section className="card">
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem' }}>
                  Sources
                </h2>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', listStyle: 'none', padding: 0 }}>
                  {sourceRefs.map((ref, i) => (
                    <li key={i}>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 500 }}
                      >
                        <ExternalLink size={13} />
                        {ref.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Article helpfulness — Layer 1: visible after scrolling to bottom */}
            <ArticleHelpfulness slug={page.slug} pageUrl={`https://learn.bytesai.uk/curated/${page.slug}`} />

            {/* AI disclosure footnote — shown on AI-generated articles */}
            {page.ai_generated === 1 && (
              <p style={{
                fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6,
                padding: '0.75rem 1rem',
                background: 'rgba(139,92,246,0.04)',
                border: '1px solid rgba(139,92,246,0.12)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <Sparkles size={11} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: '-1px', color: '#8b5cf6' }} />
                <strong style={{ color: '#8b5cf6' }}>AI-assisted content:</strong>{' '}
                This article was drafted using AI assistance
                {page.generated_model ? ` (${page.generated_model})` : ''}
                {page.generated_at ? ` on ${new Date(page.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''} and reviewed by the BytesAI editorial team before publication.
                Source references are listed above.{' '}
                <a href="/about" style={{ color: '#8b5cf6', fontWeight: 600 }}>Learn about our editorial process</a>.
              </p>
            )}

            {/* Bottom share nudge */}
            <section style={{
              padding: '1.25rem 1.5rem',
              background: 'rgba(79,110,247,0.04)',
              border: '1px solid rgba(79,110,247,0.12)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  Found this useful?
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Share it with your team — AI generates platform-optimised copy for you.
                </p>
              </div>
              <CuratedSharePanel slug={page.slug} title={page.title} />
            </section>

          </div>

          {/* Back link */}
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <Link href="/curated" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              <ArrowLeft size={15} /> Back to all insights
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
