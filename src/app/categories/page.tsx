import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Search, ArrowRight, LayoutGrid } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CATEGORIES } from '@/lib/ranking';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'AI Course Categories',
  description: 'Browse free AI courses by category. Find learning paths in Generative AI, Prompt Engineering, Machine Learning, and AI Agents.',
};

export default async function CategoriesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        {/* Header */}
        <section className="courses-header" style={{ background: 'var(--bg-alt)', padding: '3rem 0 2rem', color: 'var(--text-primary)' }}>
          <div className="container-sm" style={{ textAlign: 'center' }}>
            <h1 className="text-display" style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Explore AI Topics
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)', lineHeight: 1.6, marginBottom: '2rem' }}>
              We&apos;ve hand-picked the best free courses and grouped them by topic,
              from beginner fundamentals to advanced multi-agent systems.
            </p>
          </div>
        </section>

        <section className="section" style={{ minHeight: '50vh', background: 'var(--bg)' }}>
          <div className="container">
            <div className="grid-3">
              {CATEGORIES.map(cat => (
                <Link key={cat.db} href={`/categories/${cat.slug}`} className="card" style={{
                  display: 'flex', flexDirection: 'column', padding: '1.5rem',
                  textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ 
                      width: 48, height: 48, borderRadius: 12, 
                      background: 'linear-gradient(135deg, var(--accent-soft), var(--teal-soft))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <LayoutGrid size={24} color="var(--accent)" />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {cat.label}
                    </h2>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600, marginTop: 'auto' }}>
                    View courses <ArrowRight size={14} />
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick search CTA */}
            <div className="card" style={{ marginTop: '2rem', textAlign: 'center', background: 'var(--bg-card)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-soft)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={24} color="var(--accent)" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Looking for something specific?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
                Use our global search to find courses by title, keywords, or skills.
              </p>
              <Link href="/courses" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                Search catalog <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
