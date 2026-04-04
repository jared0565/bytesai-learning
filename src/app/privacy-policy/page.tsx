import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Privacy Policy — BytesAI Learning',
  description: 'Privacy policy for BytesAI Learning (learn.bytesai.uk).',
  alternates: { canonical: 'https://learn.bytesai.uk/privacy-policy' },
};

export default async function PrivacyPolicyPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '3rem 0 2.5rem', color: 'white' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <h1 className="text-display" style={{ color: 'white', marginBottom: '0.5rem' }}>Privacy Policy</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Last updated: March 2026</p>
          </div>
        </section>

        <section className="section" style={{ background: 'var(--bg)' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="card" style={{ padding: '2rem 2.5rem', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.85, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {[
                { title: 'Who we are', body: 'BytesAI Learning is operated at learn.bytesai.uk. We provide a curated catalog of free AI courses. Contact: hello@bytesai.com.' },
                { title: 'Data we collect', body: 'When you create an account, we collect your email address and a hashed password. We record course views, saves, starts, and completions to power your dashboard and improve recommendations. We do not sell your data.' },
                { title: 'How we use your data', body: 'Your data is used to provide your learning dashboard, track progress, and show personalised recommendations. We may use aggregate, anonymised data to improve the catalog.' },
                { title: 'Cookies', body: 'We use a single HttpOnly session cookie (bytesai_session) to keep you signed in. We do not use tracking or advertising cookies.' },
                { title: 'Third-party links', body: 'Our course links direct you to third-party providers (Microsoft, Google, Alison, etc.). Their privacy policies apply once you leave our site.' },
                { title: 'Data retention', body: 'Your account and progress data is retained while your account is active. You can request deletion at any time by emailing hello@bytesai.com.' },
                { title: 'Your rights', body: 'You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at hello@bytesai.com.' },
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
