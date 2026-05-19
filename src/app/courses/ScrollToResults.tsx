'use client';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ScrollToResults() {
  const searchParams = useSearchParams();
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    document.getElementById('course-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams]);

  return null;
}
