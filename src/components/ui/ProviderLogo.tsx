'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';

const BRAND_MAP: Record<string, { color: string; bg: string; initials: string }> = {
  google: { color: '#ffffff', bg: '#4285f4', initials: 'G' },
  microsoft: { color: '#ffffff', bg: '#00a4ef', initials: 'M' },
  anthropic: { color: '#ffffff', bg: '#d97757', initials: 'A' },
  nvidia: { color: '#ffffff', bg: '#76b900', initials: 'N' },
  stanford: { color: '#ffffff', bg: '#8c1515', initials: 'S' },
  'deeplearning-ai': { color: '#ffffff', bg: '#0056d2', initials: 'DL' },
  ibm: { color: '#ffffff', bg: '#0f62fe', initials: 'IBM' },
  amazon: { color: '#ffffff', bg: '#ff9900', initials: 'A' },
  aws: { color: '#ffffff', bg: '#ff9900', initials: 'AWS' },
  openai: { color: '#ffffff', bg: '#10a37f', initials: 'O' },
  meta: { color: '#ffffff', bg: '#0668e1', initials: 'M' },
  harvard: { color: '#ffffff', bg: '#a51c30', initials: 'H' },
  mit: { color: '#ffffff', bg: '#8a2b2b', initials: 'MIT' },
  alison: { color: '#ffffff', bg: '#f59e0b', initials: 'A' },
  'langchain-ai': { color: '#ffffff', bg: '#1c3c3c', initials: 'LC' },
  llamaindex: { color: '#ffffff', bg: '#f59f4b', initials: 'LI' },
  huggingface: { color: '#ffffff', bg: '#ffbd3e', initials: 'HF' },
  crewai: { color: '#ffffff', bg: '#1c3c3c', initials: 'C' },
  autogen: { color: '#ffffff', bg: '#0f4c81', initials: 'AG' },
};

function deriveLogoUrl(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;
  try {
    const url = new URL(websiteUrl);
    const domain = url.hostname.replace(/^www\./, '');
    return `https://logo.clearbit.com/${domain}?size=128`;
  } catch {
    return null;
  }
}

function deriveFaviconUrl(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;
  try {
    const url = new URL(websiteUrl);
    const domain = url.hostname.replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return null;
  }
}

interface ProviderLogoProps {
  slug: string;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  size?: number;
  className?: string;
}

export default function ProviderLogo({ slug, name, logoUrl, websiteUrl, size = 40, className }: ProviderLogoProps) {
  const brand = BRAND_MAP[slug];
  const [attempt, setAttempt] = useState(0);

  // Logo cascade: explicit logo_url → derived Clearbit → derived favicon → branded initials → generic icon
  const clearbitUrl = deriveLogoUrl(websiteUrl);
  const faviconUrl = deriveFaviconUrl(websiteUrl);

  const urls: (string | null)[] = [
    logoUrl ?? null,
    clearbitUrl,
    faviconUrl,
  ];

  const currentUrl = urls[attempt] ?? null;

  if (currentUrl) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.2,
          background: 'white',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          padding: size * 0.12,
        }}
        title={name}
      >
        <img
          src={currentUrl}
          alt={`${name} logo`}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          loading="lazy"
          onError={() => setAttempt(prev => prev + 1)}
        />
      </div>
    );
  }

  // Branded initials fallback
  if (brand) {
    const fontSize = brand.initials.length > 2 ? size * 0.3 : size * 0.42;
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.2,
          background: brand.bg,
          color: brand.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize,
          letterSpacing: '-0.02em',
          flexShrink: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        title={name}
      >
        {brand.initials}
      </div>
    );
  }

  // Generic fallback
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      title={name}
    >
      <Building2 size={size * 0.45} color="var(--text-muted)" />
    </div>
  );
}
