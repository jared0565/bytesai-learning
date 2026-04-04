import Link from 'next/link';
import { BookOpen, ExternalLink } from 'lucide-react';
import CookieSettingsButton from '@/components/ui/CookieSettingsButton';

const FOOTER_LINKS = {
  Learn: [
    { label: 'Browse Courses', href: '/courses' },
    { label: 'AI Foundations', href: '/categories/ai-foundations' },
    { label: 'Generative AI', href: '/categories/llms-generative-ai' },
    { label: 'AI Agents', href: '/categories/agents' },
    { label: 'Prompt Engineering', href: '/categories/prompt-engineering' },
    { label: 'Books & Reading', href: '/books' },
  ],
  Discover: [
    { label: 'All Providers', href: '/providers' },
    { label: 'Learning Paths', href: '/curated' },
    { label: 'Lectures & Talks', href: '/lectures' },
    { label: 'Trending Now', href: '/courses?sort=popular' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
    { label: 'Affiliate Disclosure', href: '/affiliate-disclosure' },
    { label: 'Accessibility', href: '/accessibility' },
  ],
};

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <Link href="/" className="footer-logo">
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, var(--accent), var(--teal))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={18} color="white" strokeWidth={2.5} />
              </span>
              BytesAI Learning
            </Link>
            <p className="footer-desc">
              The best free AI courses, curated and verified. From Microsoft, Google, Anthropic,
              NVIDIA, DeepLearning.AI, and more — all in one place.
            </p>
            <div style={{ marginTop: '1.25rem' }}>
              <a
                href="https://alison.com/?utm_source=alison_user&utm_medium=affiliate&utm_campaign=27668723"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent btn-sm"
                style={{ display: 'inline-flex' }}
              >
                Browse Free Certificate Courses
                <ExternalLink size={13} />
              </a>
              <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.5rem', maxWidth: 280 }}>
                Affiliate link — we may earn a commission if you purchase a certificate. Course content is free.
              </p>
            </div>
          </div>

          {/* Link groups */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="footer-heading">{heading}</p>
              <nav aria-label={`${heading} links`}>
                {links.map(link => (
                  <Link key={link.href} href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                ))}
                {heading === 'Company' && <CookieSettingsButton />}
              </nav>
            </div>
          ))}
        </div>

        {/* Share / Viral CTA */}
        <div style={{
          margin: '2rem 0', padding: '1rem 1.25rem',
          background: 'rgba(79,110,247,0.06)', border: '1px solid rgba(79,110,247,0.15)',
          borderRadius: 'var(--radius-md)', textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.375rem' }}>
            Know someone learning AI?
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '0.875rem' }}>
            Share BytesAI Learning — help others find free AI courses.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a href="https://x.com/intent/tweet?text=I%20found%20this%20%E2%80%94%20100%2B%20free%20AI%20courses%20from%20Google%2C%20Microsoft%2C%20Anthropic%2C%20NVIDIA%20%26%20more.%20All%20curated%20and%20verified.%20No%20sign-up%20walls.&url=https%3A%2F%2Flearn.bytesai.uk" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', gap: '0.375rem', color: '#e5e7eb', borderColor: 'rgba(255,255,255,0.2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Post on X
            </a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Flearn.bytesai.uk" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', gap: '0.375rem', color: '#e5e7eb', borderColor: 'rgba(255,255,255,0.2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              Share on LinkedIn
            </a>
            <a href="https://wa.me/?text=I%20found%20this%20%E2%80%94%20100%2B%20free%20AI%20courses%20from%20Google%2C%20Microsoft%2C%20Anthropic%2C%20NVIDIA%20%26%20more.%20All%20curated%20and%20verified.%20No%20sign-up%20walls.%20https%3A%2F%2Flearn.bytesai.uk" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', gap: '0.375rem', color: '#e5e7eb', borderColor: 'rgba(255,255,255,0.2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Flearn.bytesai.uk" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', gap: '0.375rem', color: '#e5e7eb', borderColor: 'rgba(255,255,255,0.2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Share on Facebook
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {year} BytesAI Learning. All rights reserved.</p>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', maxWidth: 480, textAlign: 'right' }}>
            Some links on this site are affiliate links. We may earn a commission at no extra cost to you.
            Course content from third-party providers is free unless stated otherwise.
          </p>
        </div>
      </div>
    </footer>
  );
}
