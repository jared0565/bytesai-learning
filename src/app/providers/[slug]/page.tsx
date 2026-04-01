import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Building2, BookOpen } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/ui/CourseCard';
import { getProviderBySlug, getCoursesByProvider } from '@/lib/db';
import { isValidSlug } from '@/lib/security';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getDB() {
  return (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDB();
  if (!db || !isValidSlug(slug)) return { title: 'Provider Not Found' };
  const provider = await getProviderBySlug(db, slug).catch(() => null);
  if (!provider) return { title: 'Provider Not Found' };
  return {
    title: `${provider.name} Free AI Courses — BytesAI Learning`,
    description: `Browse free AI courses from ${provider.name}. Curated and verified on BytesAI Learning.`,
    alternates: { canonical: `https://learn.bytesai.com/providers/${slug}` },
  };
}

export default async function ProviderDetailPage({ params }: PageProps) {
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

  const [provider, cookieStore] = await Promise.all([
    getProviderBySlug(db, slug).catch(() => null),
    cookies(),
  ]);

  if (!provider) notFound();

  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const courses = await getCoursesByProvider(db, provider.id, 50).catch(() => []);

  const isAlison = provider.slug === 'alison';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: provider.name,
    url: provider.website_url ?? undefined,
    sameAs: provider.website_url ?? undefined,
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
            <Link href="/providers" style={{ color: 'var(--text-muted)' }}>Providers</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{provider.name}</span>
          </div>
        </div>

        {/* Provider hero */}
        <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '3.5rem 0 2.5rem', color: 'white' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: isAlison ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={28} color={isAlison ? '#fbbf24' : '#94a3b8'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: 'white' }}>
                    {provider.name}
                  </h1>
                  {isAlison && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)', background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                      Affiliate Partner
                    </span>
                  )}
                </div>

                <p style={{ color: '#94a3b8', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                  {courses.length} course{courses.length !== 1 ? 's' : ''} available · Free to start
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {provider.website_url && (
                    <a
                      href={provider.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'white' }}
                    >
                      Visit {provider.name} <ExternalLink size={13} />
                    </a>
                  )}
                  <Link href={`/courses?provider=${provider.id}`} className="btn btn-outline btn-sm" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'white' }}>
                    <BookOpen size={13} /> Browse all courses
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Affiliate disclosure */}
        {provider.affiliate_enabled === 1 && provider.affiliate_disclosure && (
          <div style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '0.875rem 0' }}>
            <div className="container" style={{ fontSize: '0.8125rem', color: '#92400e' }}>
              <strong>Affiliate disclosure:</strong> {provider.affiliate_disclosure}
            </div>
          </div>
        )}

        {/* Courses grid */}
        <section className="section" style={{ background: 'var(--bg)', minHeight: '40vh' }}>
          <div className="container">
            {courses.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <BookOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No courses yet</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  No published courses from {provider.name} yet.
                </p>
                <Link href="/courses" className="btn btn-primary">Browse all courses</Link>
              </div>
            ) : (
              <div className="grid-4">
                {courses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Back link */}
        <div className="container" style={{ paddingBottom: '2.5rem' }}>
          <Link href="/providers" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <ArrowLeft size={15} /> All providers
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
