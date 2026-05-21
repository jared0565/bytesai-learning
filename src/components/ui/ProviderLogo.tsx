'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';

const BRAND_MAP: Record<string, { color: string; bg: string; initials: string; logo?: string }> = {
  google:      { color: '#ffffff', bg: '#4285f4', initials: 'G',  logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
  microsoft:   { color: '#ffffff', bg: '#00a4ef', initials: 'M',  logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg' },
  anthropic:   { color: '#ffffff', bg: '#d97757', initials: 'A' },
  nvidia:      { color: '#ffffff', bg: '#76b900', initials: 'N',  logo: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg' },
  stanford:    { color: '#ffffff', bg: '#8c1515', initials: 'S' },
  'deeplearning-ai': { color: '#ffffff', bg: '#0056d2', initials: 'DL' },
  ibm:         { color: '#ffffff', bg: '#0f62fe', initials: 'IBM', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg' },
  amazon:      { color: '#ffffff', bg: '#ff9900', initials: 'A',  logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
  aws:         { color: '#ffffff', bg: '#ff9900', initials: 'AWS', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg' },
  openai:      { color: '#ffffff', bg: '#10a37f', initials: 'O',  logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg' },
  meta:        { color: '#ffffff', bg: '#0668e1', initials: 'M',  logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg' },
  harvard:     { color: '#ffffff', bg: '#a51c30', initials: 'H' },
  mit:         { color: '#ffffff', bg: '#8a2b2b', initials: 'MIT', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/MIT_logo.svg' },
  alison:      { color: '#ffffff', bg: '#f59e0b', initials: 'A' },
  'langchain-ai': { color: '#ffffff', bg: '#1c3c3c', initials: 'LC' },
  llamaindex:  { color: '#ffffff', bg: '#f59f4b', initials: 'LI' },
  huggingface: { color: '#ffffff', bg: '#ffbd3e', initials: 'HF', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Hugging_Face_logo.svg' },
  crewai:      { color: '#ffffff', bg: '#1c3c3c', initials: 'C' },
  autogen:     { color: '#ffffff', bg: '#0f4c81', initials: 'AG' },
};

interface ProviderLogoProps {
  slug: string;
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}

export default function ProviderLogo({ slug, name, logoUrl, size = 40, className }: ProviderLogoProps) {
  const brand = BRAND_MAP[slug];
  const [imgError, setImgError] = useState(false);

  // Priority: explicit DB logo_url → Wikimedia logo → branded initials → generic icon
  const logoSrc = logoUrl || brand?.logo;

  if (logoSrc && !imgError) {
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
          padding: size * 0.15,
        }}
        title={name}
      >
        <img
          src={logoSrc}
          alt={`${name} logo`}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

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
