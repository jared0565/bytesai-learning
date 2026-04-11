import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Cookie Policy — BytesAI Learning',
  description: 'How BytesAI Learning uses cookies and your consent choices.',
  alternates: { canonical: 'https://learn.bytesai.uk/cookie-policy' },
};

export default async function CookiePolicyPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '3rem 0 2.5rem', color: 'white' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <h1 className="text-display" style={{ color: 'white', marginBottom: '0.5rem' }}>Cookie Policy</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Last updated: April 2026</p>
          </div>
        </section>

        <section className="section" style={{ background: 'var(--bg)' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="card" style={{ padding: '2rem 2.5rem', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.85, display: 'flex', flexDirection: 'column', gap: '2rem' }}>

              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>What are cookies?</h2>
                <p>Cookies are small text files stored on your device by your browser when you visit a website. They are widely used to make websites work, improve performance, and provide information to site owners.</p>
              </div>

              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>Cookies we use</h2>
                <p style={{ marginBottom: '1rem' }}>BytesAI Learning uses a minimal number of cookies. We do not use advertising or cross-site tracking cookies.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Session cookie */}
                  <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.875rem' }}>bytesai_session</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,0.2)' }}>Strictly necessary</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Purpose:</strong> Keeps you signed in to your account across page loads.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Duration:</strong> 7 days (refreshed on activity). Deleted when you sign out.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Type:</strong> HttpOnly, Secure, SameSite=Lax — not accessible to JavaScript.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Data stored:</strong> An encrypted token containing your user ID, role, and display name. No sensitive personal data is stored in the cookie itself.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Can you refuse it?</strong> This cookie is required for the signed-in experience. If you do not want this cookie, do not create an account or sign in. The site is fully browsable without signing in.</p>
                  </div>

                  {/* Consent cookie */}
                  <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.875rem' }}>bytesai_consent (localStorage)</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,0.2)' }}>Strictly necessary</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Purpose:</strong> Stores your cookie consent preferences so we don&apos;t ask again on every visit.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Duration:</strong> Persists until you clear your browser&apos;s local storage or change your preferences.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Type:</strong> Browser localStorage — not a cookie, but serves a similar function.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Data stored:</strong> Your consent choices (necessary: true, analytics: true/false, marketing: true/false) and the timestamp of your consent.</p>
                  </div>

                  {/* Analytics */}
                  <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>Analytics cookies</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)' }}>Analytics — consent required</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Purpose:</strong> Help us understand how visitors use the site so we can improve it.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Loaded:</strong> Only if you click &quot;Accept All&quot; or enable Analytics in the cookie settings panel.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Currently active:</strong> None configured by default. Analytics tracking codes, if added, are listed in the cookie settings panel.</p>
                  </div>

                  {/* Marketing */}
                  <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>Marketing cookies</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(239,68,68,0.1)', color: 'var(--rose)', border: '1px solid rgba(239,68,68,0.2)' }}>Marketing — consent required</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Purpose:</strong> Used for retargeting and measuring marketing campaign effectiveness.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Loaded:</strong> Only if you click &quot;Accept All&quot; or enable Marketing in the cookie settings panel.</p>
                    <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>Currently active:</strong> None configured by default.</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>Third-party cookies</h2>
                <p>BytesAI Learning does not set third-party cookies itself. However, when you click through to external course providers (Alison, Google, Microsoft, etc.), those sites may set their own cookies under their own privacy policies.</p>
                <p style={{ marginTop: '0.75rem' }}>The Alison affiliate link we use includes UTM parameters for tracking affiliate referrals. This is a URL parameter, not a cookie set by us. Alison&apos;s own cookie policy applies on their site.</p>
              </div>

              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>How to manage your preferences</h2>
                <p>You can change your cookie preferences at any time using the <strong>Cookie Settings</strong> link in the footer of every page. You can also clear all cookies by clearing your browser&apos;s storage. Refusing optional cookies does not affect your ability to use the site.</p>
              </div>

              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>Contact</h2>
                <p>If you have questions about our use of cookies, email <a href="mailto:hello@bytesai.com" style={{ color: 'var(--accent)' }}>hello@bytesai.com</a>.</p>
              </div>

            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Link href="/privacy-policy" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Privacy Policy</Link>
              <Link href="/terms-of-service" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Terms of Service</Link>
              <Link href="/" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>← Back to home</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
