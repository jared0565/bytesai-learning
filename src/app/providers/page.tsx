import { getDB } from '@/lib/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Search, ArrowRight, ExternalLink } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
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
  let providers: import('@/lib/db').Provider[] = [];

  if (db) {
    try {
      const result = await db.prepare(
        'SELECT * FROM providers ORDER BY name ASC LIMIT 100'
      ).all<import('@/lib/db').Provider>();
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
        <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '4rem 0 3rem', color: 'white' }}>
          <div className="container" style={{ textAlign: 'center', maxWidth: 800 }}>
            <h1 className="text-display" style={{ color: 'white', marginBottom: '1rem' }}>
              Learn from the best
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: '1.125rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Browse our curated collection of free AI courses from top technology companies, universities, and platforms.
            </p>
          </div>
        </section>

        <section className="section" style={{ minHeight: '50vh', background: 'var(--bg)' }}>
          <div className="container">
            {providers.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Building2 size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No providers found</h2>
                <p style={{ color: 'var(--text-secondary)' }}>We couldn't load the list of providers at this time.</p>
              </div>
            ) : (
              <div className="grid-4">
                {providers.map(p => (
                  <ProviderCard key={p.id} provider={p} />
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

function ProviderCard({ provider }: { provider: import('@/lib/db').Provider }) {
  const isAlison = provider.slug === 'alison';
  
  return (
    <Link href={`/providers/${provider.slug}`} className="card" style={{
      display: 'flex', flexDirection: 'column', padding: '1.25rem',
      textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
      border: isAlison ? '1px solid var(--amber)' : undefined,
      background: isAlison ? 'rgba(245, 158, 11, 0.03)' : undefined
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ 
          width: 40, height: 40, 
          borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Building2 size={20} color="var(--text-muted)" />
        </div>
        {isAlison && <span className="badge badge-alison text-xs">Partner</span>}
      </div>
      
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
        {provider.name}
      </h3>
      
      {provider.affiliate_enabled === 1 && provider.affiliate_disclosure && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {provider.affiliate_disclosure}
        </p>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600, marginTop: 'auto', paddingTop: '1rem' }}>
        View courses <ArrowRight size={14} />
      </div>
    </Link>
  );
}
