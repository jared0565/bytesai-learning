'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';

/* ── Google & LinkedIn SVG icons ──────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.859-3.047.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
);
const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077B5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
);

type Tab = 'login' | 'register';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

export default function AuthModal({ open, onClose, initialTab = 'register' }: AuthModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPw, setRegPw] = useState('');
  const [regShowPw, setRegShowPw] = useState(false);
  const [regMarketing, setRegMarketing] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  const pwStrength = regPw.length === 0 ? 0 : regPw.length < 8 ? 1 : regPw.length < 12 ? 2 : 3;
  const pwLabel = ['', 'Too short', 'Good', 'Strong'][pwStrength];
  const pwColor = ['', 'var(--rose)', 'var(--amber)', 'var(--emerald)'][pwStrength];

  // Reset when tab/open changes
  useEffect(() => { if (open) { setTab(initialTab); setLoginError(''); setRegError(''); } }, [open, initialTab]);

  // ESC to close
  const handleKey = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    if (open) { document.addEventListener('keydown', handleKey); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [open, handleKey]);

  if (!open) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPw }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; redirectTo?: string };
      if (data.ok) { onClose(); router.push(data.redirectTo ?? '/dashboard'); router.refresh(); }
      else setLoginError(data.error ?? 'Login failed. Please try again.');
    } catch { setLoginError('Network error. Please try again.'); }
    finally { setLoginLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError('');
    if (regPw.length < 8) { setRegError('Password must be at least 8 characters.'); return; }
    setRegLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPw, displayName: regName, marketingConsent: regMarketing }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; redirectTo?: string };
      if (data.ok) {
        window.dispatchEvent(new CustomEvent('bai:cta', { detail: { ctaType: 'create_account' } }));
        onClose(); router.push(data.redirectTo ?? '/dashboard'); router.refresh();
      } else setRegError(data.error ?? 'Registration failed. Please try again.');
    } catch { setRegError('Network error. Please try again.'); }
    finally { setRegLoading(false); }
  }

  const loading = tab === 'login' ? loginLoading : regLoading;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 440, maxHeight: '90dvh', overflowY: 'auto',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '0.875rem', right: '0.875rem',
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '0.25rem', display: 'flex', borderRadius: 'var(--radius-sm)',
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="auth-modal-content" style={{ padding: '2rem 2rem 1.75rem' }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
            {(['register', 'login'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setLoginError(''); setRegError(''); }}
                style={{
                  flex: 1, padding: '0.625rem 0', borderRadius: 'var(--radius-sm)',
                  border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                  background: tab === t ? 'var(--bg-card)' : 'transparent',
                  color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'register' ? 'Create Account' : 'Sign In'}
              </button>
            ))}
          </div>

          {/* ─── REGISTER TAB ───────────────────────────────────────── */}
          {tab === 'register' && (
            <>
              {regError && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#991b1b' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {regError}
                </div>
              )}

              <form onSubmit={handleRegister} noValidate>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="label" htmlFor="modal-reg-name">Your name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input id="modal-reg-name" type="text" className="input" style={{ paddingLeft: '2.75rem' }} value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g. Jamie" maxLength={100} disabled={loading} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="label" htmlFor="modal-reg-email">Email address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input id="modal-reg-email" type="email" className="input" style={{ paddingLeft: '2.75rem' }} value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={320} disabled={loading} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="label" htmlFor="modal-reg-pw">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input id="modal-reg-pw" type={regShowPw ? 'text' : 'password'} className="input" style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }} value={regPw} onChange={e => setRegPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required maxLength={128} disabled={loading} />
                    <button type="button" onClick={() => setRegShowPw(p => !p)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }} aria-label={regShowPw ? 'Hide' : 'Show'}>
                      {regShowPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {regPw && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
                      <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(pwStrength / 3) * 100}%`, background: pwColor, transition: 'width 0.3s, background 0.3s', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: pwColor }}>{pwLabel}</span>
                    </div>
                  )}
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', marginBottom: '1.25rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={regMarketing} onChange={e => setRegMarketing(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, width: 15, height: 15 }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Email me weekly AI course recommendations and learning tips. You can unsubscribe at any time via the link in any email we send.
                  </span>
                </label>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9375rem', height: 46 }} disabled={regLoading || !regEmail || !regPw}>
                  {regLoading ? <><Loader2 size={17} style={{ animation: 'spin 0.7s linear infinite' }} /> Creating account...</> : 'Create free account'}
                </button>
              </form>
            </>
          )}

          {/* ─── LOGIN TAB ──────────────────────────────────────────── */}
          {tab === 'login' && (
            <>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.375rem' }}>Welcome back</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Sign in to your BytesAI Learning account.
              </p>

              {loginError && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#991b1b' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} noValidate>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="label" htmlFor="modal-login-email">Email address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input id="modal-login-email" type="email" className="input" style={{ paddingLeft: '2.75rem' }} value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={320} disabled={loading} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="label" htmlFor="modal-login-pw">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input id="modal-login-pw" type={loginShowPw ? 'text' : 'password'} className="input" style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }} value={loginPw} onChange={e => setLoginPw(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required maxLength={128} disabled={loading} />
                    <button type="button" onClick={() => setLoginShowPw(p => !p)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }} aria-label={loginShowPw ? 'Hide' : 'Show'}>
                      {loginShowPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                  <Link href="/auth/reset-password" style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500 }} onClick={onClose}>
                    Forgot password?
                  </Link>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9375rem', height: 46 }} disabled={loginLoading || !loginEmail || !loginPw}>
                  {loginLoading ? <><Loader2 size={17} style={{ animation: 'spin 0.7s linear infinite' }} /> Signing in...</> : 'Sign in'}
                </button>
              </form>
            </>
          )}

          {/* Social auth divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or continue with</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <a href="/api/auth/oauth/google" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}>
              <GoogleIcon /> Google
            </a>
            <a href="/api/auth/oauth/linkedin" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}>
              <LinkedInIcon /> LinkedIn
            </a>
          </div>

          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1.25rem', lineHeight: 1.5 }}>
            By continuing you agree to our{' '}
            <Link href="/terms-of-service" style={{ color: 'var(--accent)' }} onClick={onClose}>Terms</Link> and{' '}
            <Link href="/privacy-policy" style={{ color: 'var(--accent)' }} onClick={onClose}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
