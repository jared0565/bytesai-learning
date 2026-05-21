import { getDB } from '@/lib/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProviderLogo from '@/components/ui/ProviderLogo';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'AI Course Providers',
  description: 'Browse free AI courses by provider. Learn from Microsoft, Google, Anthropic, NVIDIA, Stanford, and more top institutions and tech companies.',
};

export default async function ProvidersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const db = await getDB();
  let providers: (import('@/lib/db').Provider & { course_count: number })[] = [];

  if (db) {
    try {
      const result = await db.prepare(
        `SELECT p.*, COUNT(c.id) as course_count
         FROM providers p
         LEFT JOIN courses c ON c.provider_id = p.id AND c.published_status = 'published'
         GROUP BY p.id
         ORDER BY course_count DESC, p.name ASC
         LIMIT 100`
      ).all<import('@/lib/db').Provider & { course_count: number }>();
      providers = result.results;
    } catch {
      // Ignore
    }
  }

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        {/* Header */}
        <section className="courses-header" style={{ background: 'var(--bg-alt)', padding: '3rem 0 2rem', color: 'var(--text-primary)' }}>
          <div className="container-sm" style={{ textAlign: 'center' }}>
            <h1 className="text-display" style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Learn from the best
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Browse our curated collection of free AI courses from top technology companies, universities, and platforms.
            </p>
          </div>
        </section>

        <section className="section" style={{ minHeight: '50vh', background: 'var(--bg)' }}>
          <div className="container">
            {providers.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <Building2 size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No providers found</h2>
                <p style={{ color: 'var(--text-secondary)' }}>We couldn't load the list of providers at this time.</p>
              </div>
            ) : (
              <div className="grid-4">
                {providers.map(p => (
                  <ProviderCard key={p.id} provider={p} courseCount={p.course_count} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function ProviderCard({ provider, courseCount }: { provider: import('@/lib/db').Provider; courseCount: number }) {
  const isAlison = provider.slug === 'alison';

  return (
    <Link href={`/providers/${provider.slug}`} className="card" style={{
      display: 'flex', flexDirection: 'column', padding: '1.25rem',
      textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
      border: isAlison ? '1px solid var(--amber)' : undefined,
      background: isAlison ? 'rgba(245, 158, 11, 0.03)' : undefined
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <ProviderLogo slug={provider.slug} name={provider.name} logoUrl={provider.logo_url} websiteUrl={provider.website_url} size={40} />
        {isAlison && <span className="badge badge-alison text-xs">Partner</span>}
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
        {provider.name}
      </h3>

      {provider.affiliate_enabled === 1 && provider.affiliate_disclosure && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {provider.affiliate_disclosure}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.875rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          <BookOpen size={13} />
          {courseCount} {courseCount === 1 ? 'course' : 'courses'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600 }}>
          View <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
