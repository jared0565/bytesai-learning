'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const VISITOR_KEY = 'bai_vid';
const SESSION_KEY = 'bai_sid';
const IDLE_MS = 30 * 60 * 1000;

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch { return crypto.randomUUID(); }
}

function trackPageView(sessionId: string, visitorId: string, path: string) {
  fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, visitorId, path }),
  }).catch(() => null);
}

export default function AnalyticsProvider() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);
  const visitorIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    const visitorId = getVisitorId();
    const now = Date.now();
    visitorIdRef.current = visitorId;
    startedAtRef.current = now;
    lastActivityRef.current = now;

    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      sessionIdRef.current = existing;
      trackPageView(existing, visitorId, window.location.pathname);
    } else {
      fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          referrer: document.referrer || undefined,
          userAgent: navigator.userAgent,
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((d: { sessionId?: string } | null) => {
          if (d?.sessionId) {
            sessionStorage.setItem(SESSION_KEY, d.sessionId);
            sessionIdRef.current = d.sessionId;
            trackPageView(d.sessionId, visitorId, window.location.pathname);
          }
        })
        .catch(() => null);
    }

    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });

    const handlePageHide = () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      const idleMs = Date.now() - lastActivityRef.current;
      const totalMs = Date.now() - startedAtRef.current;
      const activeMs = idleMs > IDLE_MS ? totalMs - idleMs : totalMs;
      const duration = Math.max(1, Math.round(activeMs / 1000));
      navigator.sendBeacon(
        '/api/analytics/heartbeat',
        new Blob([JSON.stringify({ sessionId: sid, duration })], { type: 'application/json' })
      );
    };
    window.addEventListener('pagehide', handlePageHide);

    const handleCta = (e: Event) => {
      const sid = sessionIdRef.current;
      const vid = visitorIdRef.current;
      if (!sid || !vid) return;
      const { ctaType } = (e as CustomEvent<{ ctaType: string }>).detail;
      fetch('/api/analytics/cta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, visitorId: vid, ctaType, path: window.location.pathname }),
      }).catch(() => null);
    };
    window.addEventListener('bai:cta', handleCta as EventListener);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('bai:cta', handleCta as EventListener);
    };
  }, []);

  // Track route changes (skip first render — init handles the landing page)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const sid = sessionIdRef.current;
    const vid = visitorIdRef.current;
    if (!sid || !vid) return;
    trackPageView(sid, vid, pathname);
  }, [pathname]);

  return null;
}
