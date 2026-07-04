interface ProviderLogoSource {
  logo_url?: string | null;
  website_url?: string | null;
}

function domainFromUrl(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;

  try {
    const url = new URL(websiteUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function deriveProviderLogoUrl(websiteUrl: string | null | undefined): string | null {
  const domain = domainFromUrl(websiteUrl);
  return domain ? `https://logo.clearbit.com/${domain}` : null;
}

export function deriveProviderFallbackLogoUrl(websiteUrl: string | null | undefined): string | null {
  const domain = domainFromUrl(websiteUrl);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
}

export function providerLogoCandidates(provider: ProviderLogoSource): string[] {
  const candidates = [
    provider.logo_url,
    deriveProviderLogoUrl(provider.website_url),
    deriveProviderFallbackLogoUrl(provider.website_url),
  ];

  return Array.from(
    new Set(
      candidates
        .map(candidate => candidate?.trim())
        .filter((candidate): candidate is string => Boolean(candidate))
    )
  );
}
