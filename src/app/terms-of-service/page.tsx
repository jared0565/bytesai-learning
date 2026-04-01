export const runtime = 'edge';

import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Terms of Service — BytesAI Learning',
  description: 'Terms of service for BytesAI Learning (learn.bytesai.com).',
  alternates: { canonical: 'https://learn.bytesai.com/terms-of-service' },
};

export default async function TermsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '3rem 0 2.5rem', color: 'white' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <h1 className="text-display" style={{ color: 'white', marginBottom: '0.5rem' }}>Terms of Service</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Last updated: March 2026</p>
          </div>
        </section>

        <section className="section" style={{ background: 'var(--bg)' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="card" style={{ padding: '2rem 2.5rem', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.85, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {[
                { title: 'Acceptance', body: 'By using BytesAI Learning (learn.bytesai.com), you agree to these terms. If you do not agree, please do not use the service.' },
                { title: 'The service', body: 'BytesAI Learning provides a curated index of free AI learning resources. We do not host course content — we link to third-party providers. Access to course content is subject to each provider\'s own terms.' },
                { title: 'Your account', body: 'You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information when registering. You may not share your account or use it for commercial purposes without our consent.' },
                { title: 'Acceptable use', body: 'You agree not to attempt to circumvent security measures, scrape the site at scale, impersonate other users, or use the service for any unlawful purpose.' },
                { title: 'Affiliate links', body: 'Some links on this site are affiliate links. We may earn a commission when you make qualifying purchases. See our Affiliate Disclosure for full details.' },
                { title: 'Disclaimer', body: 'Course availability, content, and free status can change. We verify content regularly but cannot guarantee that all listed resources are currently free or available. BytesAI Learning is provided "as is" without warranty.' },
                { title: 'Limitation of liability', body: 'BytesAI Learning is not liable for any damages arising from your use of the service or linked third-party content.' },
                { title: 'Changes', body: 'We may update these terms at any time. Continued use after changes constitutes acceptance. Material changes will be noted on this page.' },
                { title: 'Contact', body: 'Questions about these terms? Email us at hello@bytesai.com.' },
              ].map(s => (
                <div key={s.title}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>{s.title}</h2>
                  <p>{s.body}</p>
                </div>
              ))}

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
