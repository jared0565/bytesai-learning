'use client';

import { useEffect } from 'react';

interface Props {
  slug: string;
}

// Fires a single view event per browser session per article slug.
// Uses sessionStorage so refreshing the same page doesn't double-count.
// Also captures UTM source and document.referrer for traffic attribution.
export default function CuratedViewTracker({ slug }: Props) {
  useEffect(() => {
    const key = `cv_${slug}`;
    if (sessionStorage.getItem(key)) return; // already tracked this session
    sessionStorage.setItem(key, '1');

    // Collect referrer signals
    const utm = new URLSearchParams(window.location.search).get('utm_source') ?? undefined;
    const ref = document.referrer || undefined;

    // Fire and forget
    fetch('/api/curated/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, utm, ref }),
    }).catch(() => {});
  }, [slug]);

  return null;
}
