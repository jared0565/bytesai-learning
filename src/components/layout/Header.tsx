'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BookOpen, Menu, X, ChevronDown, Sparkles, LayoutDashboard, LogIn, User, LogOut,
} from 'lucide-react';

interface NavProps {
  userRole?: 'learner' | 'admin' | null;
  displayName?: string | null;
}

const MAIN_LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/providers', label: 'Providers' },
  { href: '/categories', label: 'Categories' },
  { href: '/curated', label: 'Learning Paths' },
];

export default function Header({ userRole, displayName }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <header>
      <nav className="nav">
        <div className="container nav-inner">
          {/* Logo */}
          <Link href="/" className="nav-logo" style={{ color: 'var(--text-primary)' }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BookOpen size={18} color="white" strokeWidth={2.5} />
            </span>
            <span>BytesAI<span className="gradient-text" style={{ marginLeft: 2 }}>Learning</span></span>
          </Link>

          {/* Desktop links */}
          <div className="nav-links" style={{ gap: '0.125rem' }}>
            {MAIN_LINKS.map(link => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--teal))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <User size={14} color="white" />
                  </span>
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
                <Link href="/auth/login" className="btn btn-ghost btn-sm">
                  <LogIn size={15} /> Sign in
                </Link>
                <Link href="/auth/register" className="btn btn-primary btn-sm">
                  Get started
                </Link>
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
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
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
                  <Link href="/auth/login" className="btn btn-outline" onClick={() => setMenuOpen(false)}>Sign in</Link>
                  <Link href="/auth/register" className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => setMenuOpen(false)}>Get started free</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
