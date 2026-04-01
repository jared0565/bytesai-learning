import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure — BytesAI Learning',
  description: 'BytesAI Learning affiliate disclosure. We may earn commissions from Alison certificate purchases.',
  alternates: { canonical: 'https://learn.bytesai.com/affiliate-disclosure' },
};

export default async function AffiliateDisclosurePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '3rem 0 2.5rem', color: 'white' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <h1 className="text-display" style={{ color: 'white', marginBottom: '0.5rem' }}>Affiliate Disclosure</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Last updated: March 2026</p>
          </div>
        </section>

        <section className="section" style={{ background: 'var(--bg)' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="card" style={{ padding: '2rem 2.5rem', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.85, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <p>
                BytesAI Learning (<strong style={{ color: 'var(--text-primary)' }}>learn.bytesai.com</strong>) participates in affiliate programmes. This means we may earn a commission when you make qualifying purchases through links on this site.
              </p>

              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Alison</h2>
                <p>
                  We are an affiliate partner of <strong>Alison</strong> (alison.com). Some courses on BytesAI Learning link to Alison using our affiliate tracking link. If you choose to purchase an optional certificate or diploma through Alison, we may earn a small commission at no extra cost to you.
                </p>
                <p style={{ marginTop: '0.75rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>The course content on Alison is always free to enrol, study, and complete.</strong> You are never required to purchase anything to access learning materials.
                </p>
              </div>

              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Our editorial independence</h2>
                <p>
                  Affiliate relationships do not influence which courses we include or how we rank them. We curate courses based on quality, source credibility, and relevance — not on whether they carry affiliate commissions. Non-affiliate courses from Microsoft, Google, Anthropic, NVIDIA, Stanford, and others appear alongside Alison courses.
                </p>
              </div>

              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>How to identify affiliate links</h2>
                <p>
                  Affiliate-linked courses are labelled with an <strong>Affiliate</strong> badge on course cards and a disclosure note on course detail pages. The Alison homepage CTA in our site header and hero section is also an affiliate link.
                </p>
              </div>

              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Questions</h2>
                <p>
                  If you have questions about our affiliate relationships, please contact us at <strong>hello@bytesai.com</strong>.
                </p>
              </div>

            </div>

            <div style={{ marginTop: '2rem' }}>
              <Link href="/" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>← Back to home</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
