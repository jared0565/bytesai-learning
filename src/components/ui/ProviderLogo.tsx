'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { Building2 } from 'lucide-react';

const BRAND_MAP: Record<string, { color: string; bg: string; initials: string }> = {
  google:      { color: '#ffffff', bg: '#4285f4', initials: 'G' },
  microsoft:   { color: '#ffffff', bg: '#00a4ef', initials: 'M' },
  anthropic:   { color: '#ffffff', bg: '#d97757', initials: 'A' },
  nvidia:      { color: '#ffffff', bg: '#76b900', initials: 'N' },
  stanford:    { color: '#ffffff', bg: '#8c1515', initials: 'S' },
  'deeplearning-ai': { color: '#ffffff', bg: '#0056d2', initials: 'DL' },
  ibm:         { color: '#ffffff', bg: '#0f62fe', initials: 'IBM' },
  amazon:      { color: '#ffffff', bg: '#ff9900', initials: 'A' },
  aws:         { color: '#ffffff', bg: '#ff9900', initials: 'AWS' },
  openai:      { color: '#ffffff', bg: '#10a37f', initials: 'O' },
  meta:        { color: '#ffffff', bg: '#0668e1', initials: 'M' },
  harvard:     { color: '#ffffff', bg: '#a51c30', initials: 'H' },
  mit:         { color: '#ffffff', bg: '#8a2b2b', initials: 'MIT' },
  alison:      { color: '#ffffff', bg: '#f59e0b', initials: 'A' },
  'langchain-ai': { color: '#ffffff', bg: '#1c3c3c', initials: 'LC' },
  llamaindex:  { color: '#ffffff', bg: '#f59f4b', initials: 'LI' },
  huggingface: { color: '#ffffff', bg: '#ffbd3e', initials: 'HF' },
  crewai:      { color: '#ffffff', bg: '#1c3c3c', initials: 'C' },
  autogen:     { color: '#ffffff', bg: '#0f4c81', initials: 'AG' },
};

interface ProviderLogoProps {
  slug: string;
  name: string;
  logoUrl?: string | null;
  logoUrls?: Array<string | null | undefined>;
  size?: number;
  className?: string;
}

export default function ProviderLogo({ slug, name, logoUrl, logoUrls = [], size = 48, className }: ProviderLogoProps) {
  const brand = BRAND_MAP[slug];
  const [failedLogoUrls, setFailedLogoUrls] = useState<string[]>([]);
  const logoCandidates = [logoUrl, ...logoUrls]
    .map(candidate => candidate?.trim())
    .filter((candidate): candidate is string => Boolean(candidate));
  const selectedLogoUrl = logoCandidates.find(candidate => !failedLogoUrls.includes(candidate));

  if (selectedLogoUrl) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          background: 'oklch(1 0 0)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: Math.max(5, size * 0.14),
          overflow: 'hidden',
        }}
        title={name}
      >
        <img
          src={selectedLogoUrl}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedLogoUrls(prev => prev.includes(selectedLogoUrl) ? prev : [...prev, selectedLogoUrl])}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    );
  }

  if (brand) {
    const fontSize = brand.initials.length > 2 ? size * 0.32 : size * 0.44;
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
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

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
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
