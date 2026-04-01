import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Accessibility — BytesAI Learning',
  description: 'Accessibility statement for BytesAI Learning (learn.bytesai.com).',
  alternates: { canonical: 'https://learn.bytesai.com/accessibility' },
};

export default async function AccessibilityPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '3rem 0 2.5rem', color: 'white' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <h1 className="text-display" style={{ color: 'white', marginBottom: '0.5rem' }}>Accessibility</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Last updated: March 2026</p>
          </div>
        </section>

        <section className="section" style={{ background: 'var(--bg)' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="card" style={{ padding: '2rem 2.5rem', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.85, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <p>BytesAI Learning is committed to making AI education accessible to everyone. We aim to meet WCAG 2.1 Level AA guidelines.</p>

              {[
                { title: 'What we do', body: 'We use semantic HTML, sufficient colour contrast, keyboard-navigable components, and descriptive link text. Images include alt attributes. Pages work without JavaScript for core content.' },
                { title: 'Known limitations', body: 'Some interactive components (chatbot, course save/share buttons) require JavaScript. We are working to improve keyboard and screen reader support for these features.' },
                { title: 'Third-party content', body: 'Course content is hosted by third-party providers. We cannot control the accessibility of their platforms but we note accessibility information where providers disclose it.' },
                { title: 'Feedback', body: 'If you encounter an accessibility barrier, please email us at hello@bytesai.com. We aim to respond within 5 business days and resolve issues within 30 days where possible.' },
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
