'use client';

import { useEffect, useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}

export default function ScrollReveal({ children, className = '', delay = 0, threshold = 0.1 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Inside the mobile app-shell, scrolling happens on .app-content, not the document.
    const appContent = typeof document !== 'undefined' ? document.querySelector('.app-content') : null;
    const isScrollContainer = appContent ?
      (window.getComputedStyle(appContent).overflowY === 'auto' ||
       window.getComputedStyle(appContent).overflowY === 'scroll') : false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px', root: isScrollContainer ? appContent : null }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const delayClass = delay > 0 ? `reveal-delay-${Math.min(delay, 3)}` : '';

  return (
    <div ref={ref} className={`reveal ${delayClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
