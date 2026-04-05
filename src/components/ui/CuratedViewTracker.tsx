'use client';

import { useEffect } from 'react';

interface Props {
  slug: string;
}

// Fires a single view event per browser session per article slug.
// Uses sessionStorage so refreshing the same page doesn't double-count.
export default function CuratedViewTracker({ slug }: Props) {
  useEffect(() => {
    const key = `cv_${slug}`;
    if (sessionStorage.getItem(key)) return; // already tracked this session
    sessionStorage.setItem(key, '1');

    // Fire and forget — we don't care about the response
    fetch('/api/curated/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }, [slug]);

  return null;
}
