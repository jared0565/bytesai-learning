'use client';

import { useState, useCallback } from 'react';
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

function deriveFallbackUrl(websiteUrl: string | null | undefined): string | null {
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
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const handleImgError = useCallback(() => {
    setImgError(true);
  }, []);

  const handleFallbackError = useCallback(() => {
    setFallbackError(true);
  }, []);

  // Attempt 1: clearbit logo_url
  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={className}
        style={{ width: size, height: size, borderRadius: size * 0.2, objectFit: 'contain', flexShrink: 0 }}
        loading="lazy"
        onError={handleImgError}
      />
    );
  }

  // Attempt 2: Google Favicon API fallback
  const fallbackUrl = deriveFallbackUrl(websiteUrl);
  if (fallbackUrl && !fallbackError && (!logoUrl || imgError)) {
    return (
      <img
        src={fallbackUrl}
        alt={`${name} logo`}
        className={className}
        style={{ width: size, height: size, borderRadius: size * 0.2, objectFit: 'contain', flexShrink: 0 }}
        loading="lazy"
        onError={handleFallbackError}
      />
    );
  }

  // Attempt 3: branded initials
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
