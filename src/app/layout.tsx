import type { Metadata } from 'next';
import './globals.css';
import Chatbot from '@/components/Chatbot/Chatbot';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'BytesAI Learning';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://learn.bytesai.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Free AI Courses, Curated`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Discover the best free AI courses from Microsoft, Google, Anthropic, NVIDIA, DeepLearning.AI and more. Curated, verified, and free to start.',
  keywords: ['AI courses', 'free AI learning', 'machine learning', 'generative AI', 'prompt engineering', 'online learning'],
  authors: [{ name: 'BytesAI Learning' }],
  creator: 'BytesAI Learning',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Free AI Courses, Curated`,
    description: 'Discover the best free AI courses. Curated, verified, free to start.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Free AI Courses, Curated`,
    description: 'Discover the best free AI courses. Curated, verified, free to start.',
    images: ['/og-default.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
