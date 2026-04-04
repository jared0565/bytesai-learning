'use client';

import { useState, useEffect } from 'react';
import { X, Cookie, Shield, BarChart2, Target } from 'lucide-react';

export interface TrackingCode {
  id: string;
  name: string;
  placement: 'head' | 'body';
  code: string;
  enabled: boolean;
  category?: 'analytics' | 'marketing';
}

interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
  version: number;
}

const CONSENT_KEY = 'bytesai_consent';
const CONSENT_VERSION = 1;

interface Props {
  trackingCodes: TrackingCode[];
}

export default function CookieConsent({ trackingCodes }: Props) {
  const [show, setShow] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [scriptsInjected, setScriptsInjected] = useState(false);

  // On mount: check for existing consent; if none, show banner
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (raw) {
        const saved: ConsentState = JSON.parse(raw);
        if (saved.version === CONSENT_VERSION) {
          setAnalytics(saved.analytics);
          setMarketing(saved.marketing);
          injectScripts(saved.analytics, saved.marketing);
          return;
        }
      }
    } catch { /* ignore parse errors */ }
    // No valid saved consent → show banner after short delay
    const t = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for "open cookie preferences" events (dispatched by footer button)
  useEffect(() => {
    function open() { setShowModal(true); }
    window.addEventListener('bytesai:cookie-preferences', open);
    return () => window.removeEventListener('bytesai:cookie-preferences', open);
  }, []);

  // Inject approved tracking scripts into the document (client-side, post-consent)
  function injectScripts(allowAnalytics: boolean, allowMarketing: boolean) {
    if (scriptsInjected) return;
    const enabled = trackingCodes.filter(c => c.enabled);
    for (const tc of enabled) {
      const cat = tc.category ?? 'analytics';
      if (cat === 'analytics' && !allowAnalytics) continue;
      if (cat === 'marketing' && !allowMarketing) continue;
      const content = tc.code.replace(/<\/?script[^>]*>/gi, '').trim();
      if (!content) continue;
      const el = document.createElement('script');
      el.textContent = content;
      document.body.appendChild(el);
    }
    setScriptsInjected(true);
  }

  function persist(analyticsVal: boolean, marketingVal: boolean) {
    const state: ConsentState = {
      necessary: true,
      analytics: analyticsVal,
      marketing: marketingVal,
      savedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    injectScripts(analyticsVal, marketingVal);
    setShow(false);
    setShowModal(false);
  }

  function acceptAll() {
    setAnalytics(true);
    setMarketing(true);
    persist(true, true);
  }

  function rejectNonEssential() {
    setAnalytics(false);
    setMarketing(false);
    persist(false, false);
  }

  function savePreferences() {
    persist(analytics, marketing);
  }

  if (!show && !showModal) return null;

  return (
    <>
      {/* Backdrop — behind modal, closes modal on click */}
      {showModal && (
        <div className="cc-backdrop" onClick={() => setShowModal(false)} aria-hidden="true" />
      )}

      {/* ── Preferences modal ──────────────────────────────────── */}
      {showModal && (
        <div
          className="cc-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Cookie Preferences"
        >
          <div className="cc-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Cookie size={20} />
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
                Cookie Preferences
              </h2>
            </div>
            <button className="cc-close-btn" onClick={() => setShowModal(false)} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="cc-modal-body">
            <p className="cc-modal-desc">
              We use cookies to improve your experience and analyse site traffic.
              Select which categories you allow below. Your choice is saved in your
              browser and can be changed at any time via &ldquo;Cookie Settings&rdquo; in the footer.
            </p>

            {/* Necessary — always on */}
            <div className="cc-category">
              <div className="cc-category-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={15} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  <span className="cc-category-name">Necessary</span>
                </div>
                <span className="cc-always-on">Always On</span>
              </div>
              <p className="cc-category-desc">
                Required for the site to work — login sessions, security tokens, and
                your cookie preference itself. Cannot be disabled.
              </p>
            </div>

            {/* Analytics */}
            <div className="cc-category">
              <div className="cc-category-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart2 size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span className="cc-category-name">Analytics</span>
                </div>
                <label className="cc-toggle" aria-label="Allow analytics cookies">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={e => setAnalytics(e.target.checked)}
                  />
                  <span className="cc-toggle-track" />
                </label>
              </div>
              <p className="cc-category-desc">
                Helps us understand how visitors interact with the site so we can
                improve it. No personally identifiable data is collected.
              </p>
            </div>

            {/* Marketing */}
            <div className="cc-category">
              <div className="cc-category-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                  <span className="cc-category-name">Marketing</span>
                </div>
                <label className="cc-toggle" aria-label="Allow marketing cookies">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={e => setMarketing(e.target.checked)}
                  />
                  <span className="cc-toggle-track" />
                </label>
              </div>
              <p className="cc-category-desc">
                Used to deliver relevant content and measure the effectiveness of
                campaigns. May include third-party pixels.
              </p>
            </div>
          </div>

          <div className="cc-modal-footer">
            <button className="cc-btn cc-btn-ghost" onClick={rejectNonEssential}>
              Reject Non-Essential
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="cc-btn cc-btn-outline" onClick={savePreferences}>
                Save Preferences
              </button>
              <button className="cc-btn cc-btn-primary" onClick={acceptAll}>
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cookie banner (first visit) ────────────────────────── */}
      {show && !showModal && (
        <div className="cc-banner" role="complementary" aria-label="Cookie consent notice">
          <div className="cc-banner-inner">
            <div className="cc-banner-text">
              <Cookie size={17} style={{ flexShrink: 0, color: 'var(--accent)', marginTop: 2 }} />
              <p>
                We use cookies to improve your experience and analyse site traffic.{' '}
                <button className="cc-text-btn" onClick={() => setShowModal(true)}>
                  Manage preferences
                </button>
              </p>
            </div>
            <div className="cc-banner-actions">
              <button className="cc-btn cc-btn-ghost" onClick={rejectNonEssential}>
                Reject
              </button>
              <button className="cc-btn cc-btn-outline" onClick={() => setShowModal(true)}>
                Manage
              </button>
              <button className="cc-btn cc-btn-primary" onClick={acceptAll}>
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
