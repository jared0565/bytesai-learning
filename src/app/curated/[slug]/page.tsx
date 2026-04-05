import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, ExternalLink, Lightbulb, TrendingUp, AlertCircle, BookOpen } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import { getCuratedPageBySlug, getCourseBySlug, getDB} from '@/lib/db';
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
  return {
    title: page.meta_title ?? page.title,
    description: page.meta_description ?? page.summary ?? undefined,
    openGraph: {
      title: page.og_title ?? page.title,
      description: page.og_description ?? page.summary ?? undefined,
      images: page.og_image_url ? [page.og_image_url] : undefined,
      type: 'article',
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

  const [page, cookieStore] = await Promise.all([
    getCuratedPageBySlug(db, slug).catch(() => null),
    cookies(),
  ]);

  if (!page) notFound();

  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

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
              <p style={{ fontSize: '1.0625rem', color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
                {page.summary}
              </p>
            )}
            {page.last_verified_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <Calendar size={13} />
                Last verified {new Date(page.last_verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>

          {/* Content sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {page.why_it_matters && (
              <section className="card" style={{ }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lightbulb size={20} color="var(--accent)" /> Why it matters
                </h2>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  {page.why_it_matters}
                </p>
              </section>
            )}

            {page.what_changed && (
              <section className="card" style={{ }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} color="var(--teal)" /> What changed
                </h2>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  {page.what_changed}
                </p>
              </section>
            )}

            {/* Primary recommended course — embedded mid-article after "what changed" */}
            {primaryCourse && (
              <section style={{
                padding: '1.25rem 1.5rem',
                background: 'linear-gradient(135deg, rgba(79,110,247,0.06) 0%, rgba(20,184,166,0.04) 100%)',
                border: '1px solid rgba(79,110,247,0.15)',
                borderRadius: 'var(--radius-md)',
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <BookOpen size={13} /> Free course to get started
                </p>
                <div style={{ maxWidth: 380 }}>
                  <CourseCard course={primaryCourse} featured />
                </div>
              </section>
            )}

            {page.executive_implications && (
              <section className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={20} color="var(--accent)" /> Key implications
                </h2>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  {page.executive_implications}
                </p>
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
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            )}

            {/* Source references */}
            {sourceRefs.length > 0 && (
              <section className="card" style={{ }}>
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
