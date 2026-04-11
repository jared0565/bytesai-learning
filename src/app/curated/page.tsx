import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Lightbulb, Calendar, Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getPublishedCuratedPages, getDB} from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Curated AI Insights — BytesAI Learning',
  description: 'Hand-curated pages on emerging AI topics — why they matter, what changed, and which free courses to take next.',
};

export default async function CuratedIndexPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const db = await getDB();
  const pages = db ? await getPublishedCuratedPages(db).catch(() => []) : [];

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        <section className="courses-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '3rem 0 2rem', color: 'white' }}>
          <div className="container-sm" style={{ textAlign: 'center' }}>
            <h1 className="text-display" style={{ color: 'white', marginBottom: '1rem' }}>
              Curated AI Insights
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)', lineHeight: 1.6 }}>
              Hand-curated pages on emerging AI topics — why they matter, what changed, and which free courses to take next.
            </p>
          </div>
        </section>

        <section className="section" style={{ background: 'var(--bg)', minHeight: '50vh' }}>
          <div className="container">
            {pages.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Lightbulb size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Coming soon</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                  Curated insight pages are being prepared. Check back soon.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {pages.map(page => (
                  <Link
                    key={page.id}
                    href={`/curated/${page.slug}`}
                    className="card"
                    style={{ display: 'block', textDecoration: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>
                          {page.title}
                        </h2>
                        {page.summary && (
                          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem' }}>
                            {page.summary}
                          </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {page.last_verified_at && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                              <Calendar size={13} />
                              Verified {new Date(page.last_verified_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          {page.ai_generated === 1 && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.05em', padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
                              border: '1px solid rgba(139,92,246,0.2)',
                            }}>
                              <Sparkles size={10} /> AI-assisted
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>
                        Read more <ArrowRight size={14} />
                      </div>
                    </div>
                  </Link>
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
