export const runtime = 'edge';

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'About BytesAI Learning',
  description: 'BytesAI Learning curates and verifies the best free AI courses from Microsoft, Google, Anthropic, NVIDIA, and more — all in one place.',
  alternates: { canonical: 'https://learn.bytesai.com/about' },
};

export default async function AboutPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  return (
    <>
      <Header userRole={session?.role ?? null} displayName={session?.displayName} />

      <main>
        <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', padding: '4rem 0 3rem', color: 'white' }}>
          <div className="container" style={{ maxWidth: 800, textAlign: 'center' }}>
            <h1 className="text-display" style={{ color: 'white', marginBottom: '1rem' }}>
              About BytesAI Learning
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: '1.125rem', lineHeight: 1.7 }}>
              We curate and verify the best free AI learning on the internet — so you don&apos;t have to hunt across 20 tabs.
            </p>
          </div>
        </section>

        <section className="section" style={{ background: 'var(--bg)' }}>
          <div className="container" style={{ maxWidth: 760 }}>

            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.85, display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
              <p>
                The AI learning landscape moves fast. New courses, papers, and tools appear every week — but most free content is scattered across provider sites, buried in syllabi, or hidden behind "free trial" paywalls.
              </p>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>BytesAI Learning</strong> solves that. We hand-pick, verify, and organise the best free AI courses from trusted providers including Microsoft, Google, Anthropic, NVIDIA, DeepLearning.AI, Stanford, Harvard, and more. Every resource on this site is free to start — no credit card, no paywall.
              </p>
              <p>
                We&apos;re independent and learner-first. Where we link to Alison courses, we may earn a small affiliate commission if you choose to purchase an optional certificate. The learning itself is always free.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '3rem' }}>
              {[
                { icon: <Zap size={20} />, title: 'Verified free', body: 'Every course is checked before it goes live. No hidden paywalls or "free with subscription" traps.' },
                { icon: <ShieldCheck size={20} />, title: 'Trusted sources only', body: 'Courses from institutions and companies with real reputations — not random YouTube channels.' },
                { icon: <TrendingUp size={20} />, title: 'Kept current', body: 'The catalog is updated as the AI landscape evolves. We retire outdated content and add new releases.' },
                { icon: <BookOpen size={20} />, title: 'More than courses', body: 'We also curate books, lectures, and reading sources — a full learning library, not just video courses.' },
              ].map(item => (
                <div key={item.title} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: '0.875rem' }}>
                    {item.icon}
                  </div>
                  <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{item.body}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link href="/courses" className="btn btn-primary btn-lg">
                Browse free AI courses <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
