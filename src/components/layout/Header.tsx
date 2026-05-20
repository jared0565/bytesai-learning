'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  BookOpen, Menu, X, ChevronDown, Sparkles, LayoutDashboard, LogIn, User, LogOut, Share2, Settings, Sun, Moon,
} from 'lucide-react';
import AuthModal from '@/components/ui/AuthModal';
import SharePanel from '@/components/ui/SharePanel';
import FeedbackTab from '@/components/ui/FeedbackTab';
import { useTheme } from '@/components/ThemeProvider/ThemeProvider';

const NUDGE_MESSAGES = [
  { emoji: '', text: "100+ free AI courses from Google, Microsoft, Anthropic and NVIDIA, no paywalls, ever." },
  { emoji: '', text: "Every course is verified free before it goes live. No bait-and-switch, no hidden fees." },
  { emoji: '', text: "Courses from Microsoft, Google, Anthropic, NVIDIA, Stanford and more, all in one place." },
];

interface NavProps {
  userRole?: 'learner' | 'admin' | null;
  displayName?: string | null;
}

const MAIN_LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/#trending', label: 'Trending' },
  { href: '/#featured', label: 'Featured' },
  { href: '/providers', label: 'Providers', hideAtMd: true },
  { href: '/categories', label: 'Categories', hideAtMd: true },
  { href: '/curated', label: 'Insights' },
];

export default function Header({ userRole, displayName }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const t = setInterval(() => setNudgeIndex(i => (i + 1) % NUDGE_MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!userRole) return;
    fetch('/api/learner/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.profile?.avatar_url) setAvatarUrl(d.profile.avatar_url); })
      .catch(() => null);
  }, [userRole]);

  return (
    <>
    <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Announcement bar */}
      <div className="announcement-bar" style={{
        padding: '0.45rem 1rem',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.8rem', color: 'white', margin: 0, lineHeight: 1.4 }}>
          {NUDGE_MESSAGES[nudgeIndex].emoji}{' '}
          <strong>{NUDGE_MESSAGES[nudgeIndex].text}</strong>{' '}
          <span className="hide-mobile" style={{ opacity: 0.7, fontSize: '0.75rem' }}>Click the chat button below.</span>
        </p>
      </div>
      <nav className="nav">
        <div className="container nav-inner">
          {/* Logo */}
          <Link href="/" className="nav-logo" style={{ color: 'var(--text-primary)' }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BookOpen size={18} color="white" strokeWidth={2.5} />
            </span>
            <span>BytesAI <span style={{ color: 'var(--accent)', fontWeight: 800 }}>Learning</span></span>
          </Link>

          {/* Desktop links */}
          <div className="nav-links" style={{ gap: '0.125rem' }}>
            {MAIN_LINKS.map(link => (
              <Link key={link.href} href={link.href} className={`nav-link${link.hideAtMd ? ' nav-link-hide-md' : ''}`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Theme toggle */}
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }}
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Share button */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }}
                onClick={() => setShareOpen(!shareOpen)}
                aria-label="Share BytesAI Learning"
                title="Share"
              >
                <Share2 size={17} />
              </button>
              {shareOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShareOpen(false)} />
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 200,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                    padding: '0.875rem', minWidth: 260,
                  }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.625rem' }}>
                      Share with friends
                    </p>
                    <SharePanel
                      url="https://learn.bytesai.uk"
                      title="BytesAI Learning"
                      description="100+ free AI courses from Google, Microsoft, Anthropic & NVIDIA — curated, verified, no paywalls. Genuinely worth your time."
                      compact
                    />
                  </div>
                </>
              )}
            </div>

            {/* Alison CTA */}
            <a
              href="https://alison.com/?utm_source=alison_user&utm_medium=affiliate&utm_campaign=27668723"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-accent btn-sm"
              style={{ display: 'none' }}
              id="nav-alison-cta"
            >
              <Sparkles size={14} />
              Free Certificates
            </a>

            {userRole ? (
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ gap: '0.375rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-full)' }}
                  onClick={() => setUserOpen(!userOpen)}
                  aria-expanded={userOpen}
                  aria-label="User menu"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
                    />
                  ) : (
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <User size={14} color="white" />
                    </span>
                  )}
                  <span className="text-sm" style={{ fontWeight: 600, maxWidth: 100 }} title={displayName ?? undefined}>
                    {displayName?.split(' ')[0] ?? 'Account'}
                  </span>
                  <ChevronDown size={14} />
                </button>

                {userOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: 200,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 300,
                    padding: '0.5rem',
                  }}>
                    <Link href="/dashboard" className="nav-link" style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', display: 'flex' }} onClick={() => setUserOpen(false)}>
                      <LayoutDashboard size={15} style={{ marginRight: '0.5rem' }} /> Dashboard
                    </Link>
                    <Link href="/my-learning" className="nav-link" style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', display: 'flex' }} onClick={() => setUserOpen(false)}>
                      <BookOpen size={15} style={{ marginRight: '0.5rem' }} /> My Learning
                    </Link>
                    <Link href="/settings" className="nav-link" style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', display: 'flex' }} onClick={() => setUserOpen(false)}>
                      <Settings size={15} style={{ marginRight: '0.5rem' }} /> Settings
                    </Link>
                    {userRole === 'admin' && (
                      <Link href="/admin" className="nav-link" style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', display: 'flex', color: 'var(--accent)' }} onClick={() => setUserOpen(false)}>
                        <Sparkles size={15} style={{ marginRight: '0.5rem' }} /> Admin Panel
                      </Link>
                    )}
                    <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                    <form action="/api/auth/logout" method="POST">
                      <button type="submit" className="nav-link" style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', color: 'var(--rose)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <LogOut size={15} style={{ marginRight: '0.5rem' }} /> Sign out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setAuthModal('login'); window.dispatchEvent(new CustomEvent('bai:cta', { detail: { ctaType: 'sign_in' } })); }}>
                  <LogIn size={15} /> Sign in
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setAuthModal('register'); window.dispatchEvent(new CustomEvent('bai:cta', { detail: { ctaType: 'get_started' } })); }}>
                  Get started
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="btn btn-ghost btn-sm"
              style={{ display: 'flex', padding: '0.5rem' }}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              id="mobile-menu-toggle"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'oklch(0 0 0 / 0.3)',
        }} onClick={() => setMenuOpen(false)}>
          <nav style={{
            position: 'absolute', top: 64, left: 0, right: 0,
            background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
            padding: '1rem',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {MAIN_LINKS.map(link => (
                <Link key={link.href} href={link.href} className="nav-link" style={{ padding: '0.75rem 1rem' }} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <hr style={{ margin: '0.75rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0 1rem', marginBottom: '0.375rem' }}>
                Share with friends
              </p>
              <div style={{ padding: '0 1rem', marginBottom: '0.75rem' }}>
                <SharePanel
                  url="https://learn.bytesai.uk"
                  title="BytesAI Learning"
                  description="100+ free AI courses from Google, Microsoft, Anthropic & NVIDIA — curated, verified, no paywalls. Genuinely worth your time."
                  compact
                />
              </div>
              <hr style={{ margin: '0.75rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
              <a
                href="https://alison.com/?utm_source=alison_user&utm_medium=affiliate&utm_campaign=27668723"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent"
                style={{ margin: '0 0 0.5rem' }}
              >
                <Sparkles size={15} /> Browse Free Certificates
              </a>
              {!userRole && (
                <>
                  <button className="btn btn-outline" onClick={() => { setMenuOpen(false); setAuthModal('login'); window.dispatchEvent(new CustomEvent('bai:cta', { detail: { ctaType: 'sign_in' } })); }}>Sign in</button>
                  <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => { setMenuOpen(false); setAuthModal('register'); window.dispatchEvent(new CustomEvent('bai:cta', { detail: { ctaType: 'get_started' } })); }}>Get started free</button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
      {/* Auth modal */}
      {!userRole && <AuthModal open={authModal !== null} onClose={() => setAuthModal(null)} initialTab={authModal ?? 'register'} />}
    </header>

    {/* Global feedback tab */}
    <FeedbackTab />
    </>
  );
}
