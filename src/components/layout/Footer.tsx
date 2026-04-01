import Link from 'next/link';
import { BookOpen, ExternalLink } from 'lucide-react';

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
              </nav>
            </div>
          ))}
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
