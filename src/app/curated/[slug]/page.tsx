import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, ExternalLink, BookOpen, Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseSpecTable from '@/components/ui/CourseSpecTable';
import MarkdownContent from '@/components/ui/MarkdownContent';
import CuratedViewTracker from '@/components/ui/CuratedViewTracker';
import CuratedSharePanel from '@/components/ui/CuratedSharePanel';
import ArticleHelpfulness from '@/components/ui/ArticleHelpfulness';
import { getCuratedPageBySlug, getCuratedPageBySlugAnyStatus, getCourseBySlug, getDB } from '@/lib/db';
import { isValidSlug } from '@/lib/security';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { articleSocialImageUrl, SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH, socialMetaDescription } from '@/lib/social-meta';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDB();
  if (!db || !isValidSlug(slug)) return { title: 'Insight Not Found' };
  const page = await getCuratedPageBySlug(db, slug).catch(() => null);
  if (!page) return { title: 'Insight Not Found' };

  const ogImageUrl = articleSocialImageUrl(slug, page.social_share_copy_generated_at ?? page.updated_at);
  const pageDescription = socialMetaDescription(page.meta_description ?? page.summary ?? page.why_it_matters);
  const socialDescription = socialMetaDescription(page.og_description ?? page.meta_description ?? page.summary ?? page.why_it_matters);

  return {
    title: page.meta_title ?? page.title,
    description: pageDescription,
    openGraph: {
      title: page.og_title ?? page.title,
      description: socialDescription,
      url: `https://learn.bytesai.uk/curated/${slug}`,
      siteName: 'BytesAI Learning',
      images: [{ url: ogImageUrl, width: SOCIAL_IMAGE_WIDTH, height: SOCIAL_IMAGE_HEIGHT, alt: page.og_image_alt ?? page.title }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.og_title ?? page.title,
      description: socialDescription,
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

  const categories: string[] = page.categories_json
    ? JSON.parse(page.categories_json)
    : [];

  const [primaryCourse, ...relatedCourses] = await Promise.all([
    page.primary_course_slug ? getCourseBySlug(db, page.primary_course_slug).catch(() => null) : Promise.resolve(null),
    ...relatedSlugs.map(s => getCourseBySlug(db, s).catch(() => null)),
  ]);

  const validRelated = relatedCourses.filter(Boolean) as import('@/lib/db').Course[];
  const structuredDataImageUrl = articleSocialImageUrl(page.slug, page.social_share_copy_generated_at ?? page.updated_at);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.summary ?? undefined,
    url: `https://learn.bytesai.uk/curated/${page.slug}`,
    image: structuredDataImageUrl,
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

        <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>

          {/* Editorial header */}
          <header style={{ marginBottom: '2.5rem', maxWidth: 720 }}>
            <h1 className="text-display" style={{ marginBottom: '1.25rem', fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>
              {page.title}
            </h1>
            {page.lead && (
              <p style={{
                fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                marginBottom: '1.25rem',
              }}>
                {page.lead}
              </p>
            )}
            {page.summary && (
              <div className="article-lead">
                <MarkdownContent variant="default">{page.summary}</MarkdownContent>
              </div>
            )}
            <div className="article-byline" style={{ flexWrap: 'wrap', gap: '0.5rem 0.75rem' }}>
              {page.last_verified_at && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Calendar size={13} />
                  Verified {new Date(page.last_verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {/* Read time estimate */}
              {(() => {
                const wordCount = [
                  page.summary, page.why_it_matters, page.what_changed, page.executive_implications,
                  page.primary_course_rationale,
                ].filter(Boolean).join(' ').trim().split(/\s+/).filter(Boolean).length;
                const minutes = Math.max(1, Math.ceil(wordCount / 200));
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {minutes} min read
                  </span>
                );
              })()}
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
              <span className="hide-mobile">
                <CuratedSharePanel slug={page.slug} title={page.title} />
              </span>
            </div>
            {/* Category pills */}
            {categories.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.875rem' }}>
                {categories.map(cat => (
                  <Link
                    key={cat}
                    href={`/categories/${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(79,110,247,0.08)', color: 'var(--accent)',
                      border: '1px solid rgba(79,110,247,0.2)',
                      textDecoration: 'none',
                    }}
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* Main two-column layout */}
          <div className="article-layout">

            {/* Article column */}
            <article>
              <div className="article-prose">
                {page.why_it_matters && (
                  <section>
                    <h2>Why this matters right now</h2>
                    <MarkdownContent variant="article">{page.why_it_matters}</MarkdownContent>
                  </section>
                )}

                {page.what_changed && (
                  <section>
                    <h2>How this technology has evolved</h2>
                    <MarkdownContent variant="article">{page.what_changed}</MarkdownContent>
                  </section>
                )}

                {/* Primary recommended course — inline aside */}
                {primaryCourse && (
                  <aside className="article-aside">
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent)', marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      <BookOpen size={13} /> Recommended starting point
                    </p>
                    <CourseSpecTable course={primaryCourse} rationale={page.primary_course_rationale ?? undefined} />
                  </aside>
                )}

                {page.executive_implications && (
                  <section>
                    <h2>What this means for your roadmap</h2>
                    <MarkdownContent variant="article">{page.executive_implications}</MarkdownContent>
                  </section>
                )}
              </div>

              {/* Related courses — simple linked list */}
              {validRelated.length > 0 && (
                <section style={{ marginTop: '3rem', maxWidth: 720 }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    Related courses
                  </h2>
                  <ol className="article-related-list">
                    {validRelated.map(course => (
                      <li key={course.id}>
                        <Link href={`/courses/${course.slug}`}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{course.title}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {course.provider_id?.replace(/^prov-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            {course.level && ` · ${course.level}`}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Sources — numbered endnotes */}
              {sourceRefs.length > 0 && (
                <section style={{ marginTop: '3rem', maxWidth: 720 }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    Sources
                  </h2>
                  <ol className="article-footnotes">
                    {sourceRefs.map((ref, i) => (
                      <li key={i}>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          {ref.title}
                          <ExternalLink size={12} />
                        </a>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Article helpfulness */}
              <div style={{ marginTop: '3rem', maxWidth: 720 }}>
                <ArticleHelpfulness slug={page.slug} pageUrl={`https://learn.bytesai.uk/curated/${page.slug}`} />
              </div>

              {/* AI disclosure footnote */}
              {page.ai_generated === 1 && (
                <p style={{
                  fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6,
                  marginTop: '1.5rem', padding: '0.75rem 1rem',
                  background: 'rgba(139,92,246,0.04)',
                  border: '1px solid rgba(139,92,246,0.12)',
                  borderRadius: 'var(--radius-sm)',
                  maxWidth: 720,
                }}>
                  <Sparkles size={11} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: '-1px', color: '#8b5cf6' }} />
                  <strong style={{ color: '#8b5cf6' }}>AI-assisted content:</strong>{' '}
                  This article, <em>{page.title}</em>, was drafted using AI assistance
                  {page.generated_model ? ` (${page.generated_model})` : ''}
                  {page.generated_at ? ` on ${new Date(page.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''} and reviewed by the BytesAI editorial team before publication.
                  Verified sources:
                  {sourceRefs.length > 0
                    ? sourceRefs.map((ref, i) => (
                        <span key={ref.url}>
                          {' '}
                          <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6', fontWeight: 600 }}>{ref.title}</a>
                          {i < sourceRefs.length - 1 ? ',' : '.'}
                        </span>
                      ))
                    : ' none recorded.'}
                  {' '}<a href="/about" style={{ color: '#8b5cf6', fontWeight: 600 }}>Learn about our editorial process</a>.
                </p>
              )}

              {/* Bottom share nudge — topic-specific */}
              <section style={{
                marginTop: '2rem', maxWidth: 720,
                padding: '1.25rem 1.5rem',
                background: 'rgba(79,110,247,0.04)',
                border: '1px solid rgba(79,110,247,0.12)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    {(() => {
                      const topic = categories[0] ?? '';
                      const prompts: Record<string, string> = {
                        'AI Governance': 'Know a compliance team wrestling with AI risk frameworks?',
                        'AI Safety': 'Know a researcher or engineer working on alignment?',
                        'Foundation Models': 'Know a builder choosing between foundation models right now?',
                        'AI Tooling': 'Know a dev evaluating AI tools for their stack?',
                        'AI Workflow': 'Know a team redesigning workflows around AI agents?',
                        'Ethics & Bias': 'Know someone auditing AI for fairness and representation?',
                        'Regulation & Compliance': 'Know a legal team tracking AI regulation?',
                        'Technical Implementation': 'Know an engineer shipping AI features to production?',
                        'Research & Models': 'Know a researcher keeping up with the latest papers?',
                        'AI in Business': 'Know a leader making AI investment decisions?',
                      };
                      return prompts[topic] || 'Know someone who needs to see this?';
                    })()}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Forward this briefing — AI generates platform-optimised copy for you.
                  </p>
                </div>
                <CuratedSharePanel slug={page.slug} title={page.title} />
              </section>

              {/* Back link */}
              <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', maxWidth: 720 }}>
                <Link href="/curated" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <ArrowLeft size={15} /> Back to all insights
                </Link>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="article-sidebar">
              <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <CuratedSharePanel slug={page.slug} title={page.title} />
                {page.last_verified_at && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem', margin: 0 }}>
                    <Calendar size={13} />
                    Verified {new Date(page.last_verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {page.ai_generated === 1 && (
                  <p style={{
                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0,
                  }}>
                    <Sparkles size={10} /> AI-assisted
                  </p>
                )}
              </div>

              {sourceRefs.length > 0 && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Sources
                  </p>
                  <ol className="article-footnotes" style={{ margin: 0 }}>
                    {sourceRefs.slice(0, 5).map((ref, i) => (
                      <li key={i}>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          {ref.title}
                          <ExternalLink size={12} />
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </aside>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
