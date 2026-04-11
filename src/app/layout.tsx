import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
import Chatbot from '@/components/Chatbot/Chatbot';
import BottomNav from '@/components/layout/BottomNav';
import CookieConsent, { type TrackingCode } from '@/components/CookieConsent/CookieConsent';
import Starfield from '@/components/Starfield/Starfield';
import { getDB } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

async function getSiteSettings(): Promise<{ trackingCodes: TrackingCode[] }> {
  try {
    const db = await getDB();
    if (!db) return { trackingCodes: [] };

    const row = await db
      .prepare("SELECT value FROM site_settings WHERE key = 'tracking_codes'")
      .first<{ value: string }>();

    const trackingCodes: TrackingCode[] = row?.value ? JSON.parse(row.value) : [];
    return { trackingCodes };
  } catch { return { trackingCodes: [] }; }
}

async function getLayoutSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySession(token);
  } catch { return null; }
}

const SITE_NAME = 'BytesAI Learning';
// IMPORTANT: This MUST be the production URL (absolute) — social crawlers need it.
// process.env.NEXT_PUBLIC_SITE_URL is overridden by .env.local at build time, so we hardcode it.
const PROD_URL = 'https://learn.bytesai.uk';

export const metadata: Metadata = {
  metadataBase: new URL(PROD_URL),
  title: {
    default: `${SITE_NAME} — Free AI Courses, Curated`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    '100+ free AI courses from Google, Microsoft, Anthropic, NVIDIA & DeepLearning.AI — curated, verified, and free to start. Stop hunting across 20 tabs.',
  keywords: ['AI courses', 'free AI learning', 'machine learning', 'generative AI', 'prompt engineering', 'online learning'],
  authors: [{ name: 'BytesAI Learning' }],
  creator: 'BytesAI Learning',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: PROD_URL,
    siteName: SITE_NAME,
    title: '100+ Free AI Courses — Curated from Google, Microsoft, Anthropic & More',
    description: 'Stop hunting across 20 tabs. 100+ free AI courses from the world\'s top providers — curated, verified, and ready to start now.',
    images: [{ url: `${PROD_URL}/og-default.png`, width: 1200, height: 630, alt: '100+ Free AI Courses — BytesAI Learning' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '100+ Free AI Courses — Curated from Google, Microsoft, Anthropic & More',
    description: 'Stop hunting across 20 tabs. 100+ free AI courses from the world\'s top providers — curated, verified, and ready to start now.',
    images: [`${PROD_URL}/og-default.png`],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
};

// Required for env(safe-area-inset-*) to work on iPhone notch/home bar
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ trackingCodes }, session] = await Promise.all([
    getSiteSettings(),
    getLayoutSession(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Starfield — fixed canvas, z-index:-1, paints its own dark background */}
        <Starfield />

        {/*
          App Shell: on mobile (≤768px) → position:fixed, 100dvh flex column
                     on desktop → transparent block passthrough (no layout effect)
          IMPORTANT: No transform/filter/backdrop-filter on .app-shell —
          would trap position:fixed children like <Chatbot> inside its stacking context.
        */}
        <div className="app-shell">
          {/* Scrollable content pane — page content (Header + page + Footer) scrolls here */}
          <div className="app-content">
            {children}
          </div>
          {/* Bottom nav — visible on mobile only via CSS */}
          <BottomNav userRole={session?.role ?? null} />
        </div>

        {/*
          These components live OUTSIDE .app-shell so their position:fixed works
          relative to the viewport, not a stacking context created by the shell.
        */}
        <Chatbot />
        <CookieConsent trackingCodes={trackingCodes} />
      </body>
    </html>
  );
}
