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

const SECTIONS = [
  {
    title: '1. Who we are',
    body: `BytesAI Learning is operated at learn.bytesai.uk. We provide a curated catalog of free AI courses. The data controller for personal data collected through this site is BytesAI Learning. Contact us at hello@bytesai.com for any privacy-related queries.`,
  },
  {
    title: '2. Data we collect and why',
    body: `We collect only the data needed to provide our service:

Account data: When you register, we collect your email address, a hashed password (we never store your password in plain text), and an optional display name. Legal basis: contract — this data is necessary to create and manage your account.

Learning activity: We record which courses you view, save, start, and complete. This powers your dashboard and progress tracking. Legal basis: contract.

Chatbot conversations: If you use our AI chatbot, your messages and the bot's responses are stored, linked to a session ID. Logged-in users' conversations are linked to their account. Anonymous visitors are tracked by a temporary session ID that is not tied to any identifiable information. Legal basis: legitimate interest in improving chatbot quality and providing the service.

Feedback: If you submit feedback through the feedback tab or article helpfulness widgets, we store your sentiment rating, optional message, and optional email address. Legal basis: legitimate interest in improving the platform.

Usage analytics: We track course view counts, popular courses, and referral sources in aggregate to improve the catalog. This does not involve tracking individual visitors. Legal basis: legitimate interest.

Cookie consent: We store your cookie preferences in your browser's local storage.`,
  },
  {
    title: '3. AI-generated content',
    body: `Some articles on our Insights section are drafted using AI language models (via OpenRouter) and reviewed by our editorial team before publication. AI-generated articles are clearly labelled with an "AI-assisted" badge. The AI models process the article topic and publicly available web content as research context — no personal data is sent to AI providers.`,
  },
  {
    title: '4. Cookies',
    body: `We use a single essential session cookie (bytesai_session) to keep you signed in. It is HttpOnly, Secure, and SameSite=Lax — it cannot be accessed by JavaScript and is protected against cross-site request forgery. With your consent, we may load optional analytics or marketing scripts. You can manage your cookie preferences at any time via the Cookie Settings link in the footer. See our full Cookie Policy for details.`,
  },
  {
    title: '5. Data sharing and third parties',
    body: `We do not sell your personal data. We do not share it with advertisers. We use the following third-party services:

Cloudflare (cloudflare.com): Our site runs on Cloudflare Workers and D1 (SQLite database). Your data is stored in Cloudflare's infrastructure. Cloudflare may process data in multiple regions including the European Economic Area and the United States. Cloudflare is certified under the EU-US Data Privacy Framework.

OpenRouter (openrouter.ai): Used for AI chatbot responses and article generation. Only the content of chatbot messages is sent — no user account data.

Resend (resend.com): Used to send transactional emails (account verification, welcome emails). Email addresses are transmitted to Resend for delivery.

Alison (alison.com): Some course links are affiliate links. When you click through, Alison may set their own cookies. Their privacy policy applies on their site.

All third-party providers are contractually bound to process data only as instructed and in accordance with applicable data protection law.`,
  },
  {
    title: '6. International data transfers',
    body: `BytesAI Learning is based in the United Kingdom. Our infrastructure (Cloudflare) operates globally. Data may be processed in the United States and other countries outside the UK/EEA. Where data is transferred outside the UK, we rely on Standard Contractual Clauses or the UK International Data Transfer Agreement, and/or the EU-US and UK-US Data Privacy Frameworks where applicable.`,
  },
  {
    title: '7. Data retention',
    body: `Account and profile data: Retained while your account is active and for 30 days after a deletion request, after which it is permanently removed.

Course progress and activity: Retained for the lifetime of your account and deleted with your account.

Chatbot conversation history: Retained for 12 months, then automatically deleted.

Feedback submissions: Retained for 24 months for quality improvement purposes.

Email verification tokens: Deleted immediately upon use or expiry (24 hours).

Admin audit logs: Retained for 24 months to support accountability and security investigations.`,
  },
  {
    title: '8. Your rights',
    body: `Under UK GDPR and equivalent laws, you have the following rights:

Right to access: Request a copy of all personal data we hold about you.
Right to rectification: Ask us to correct inaccurate data.
Right to erasure: Ask us to delete your account and personal data (see Account Deletion below).
Right to data portability: Request your data in a structured, machine-readable format.
Right to restrict processing: Ask us to pause processing your data in certain circumstances.
Right to object: Object to processing based on legitimate interest.

To exercise any of these rights, email hello@bytesai.com. We will respond within 30 days. You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at ico.org.uk.`,
  },
  {
    title: '9. Account deletion',
    body: `You can delete your account and all associated personal data from your Settings page. Upon deletion, your account, profile, course progress, and chatbot history are permanently removed within 30 days. Anonymised aggregate data (e.g. total course view counts) that cannot be traced back to you may be retained. Feedback submitted without an account may also be retained in anonymised form.`,
  },
  {
    title: '10. Data security',
    body: `We implement technical and organisational measures to protect your data, including: encrypted passwords (bcrypt), HttpOnly and Secure session cookies, rate limiting on all authentication endpoints, bot protection (Cloudflare Turnstile) on registration, prompt injection protection in the chatbot, and admin audit logging for all data changes.`,
  },
  {
    title: '11. Data breach notification',
    body: `In the event of a personal data breach that poses a risk to your rights and freedoms, we will notify the UK Information Commissioner's Office (ICO) within 72 hours of becoming aware of the breach, as required by Article 33 of UK GDPR. Where the breach is likely to result in high risk to you personally, we will also notify you directly without undue delay. Contact hello@bytesai.com if you suspect a data breach.`,
  },
  {
    title: '12. Children',
    body: `BytesAI Learning is not directed at children under 16. We do not knowingly collect personal data from children under 16. If you believe a child has provided us with personal data, contact hello@bytesai.com and we will delete it promptly.`,
  },
  {
    title: '13. Changes to this policy',
    body: `We may update this policy from time to time. The "last updated" date at the top will reflect any changes. For significant changes, we will notify logged-in users via email.`,
  },
  {
    title: '14. Contact',
    body: `BytesAI Learning\nEmail: hello@bytesai.com\nWebsite: learn.bytesai.uk`,
  },
];

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
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Last updated: April 2026</p>
          </div>
        </section>

        <section className="section" style={{ background: 'var(--bg)' }}>
          <div className="container" style={{ maxWidth: 760 }}>
            <div className="card" style={{ padding: '2rem 2.5rem', fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.85, display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              {SECTIONS.map(s => (
                <div key={s.title}>
                  <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>{s.title}</h2>
                  {s.body.split('\n\n').map((para, i) => (
                    <p key={i} style={{ margin: i > 0 ? '0.75rem 0 0' : '0', whiteSpace: 'pre-line' }}>{para}</p>
                  ))}
                </div>
              ))}

            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Link href="/cookie-policy" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cookie Policy</Link>
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
