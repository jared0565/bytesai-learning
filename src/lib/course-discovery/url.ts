const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'msclkid',
]);

export function normalizeDiscoveryUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'https:') return null;

    url.protocol = 'https:';
    url.hostname = url.hostname.toLowerCase();
    url.hash = '';
    url.username = '';
    url.password = '';

    for (const key of Array.from(url.searchParams.keys())) {
      const normalized = key.toLowerCase();
      if (normalized.startsWith('utm_') || TRACKING_PARAMS.has(normalized)) {
        url.searchParams.delete(key);
      }
    }

    const params = Array.from(url.searchParams.entries())
      .sort(([aKey, aVal], [bKey, bVal]) => aKey.localeCompare(bKey) || aVal.localeCompare(bVal));
    url.search = '';
    for (const [key, value] of params) {
      url.searchParams.append(key, value);
    }

    url.pathname = normalizePathname(url.pathname);
    return url.toString();
  } catch {
    return null;
  }
}

export async function hashDiscoveryUrl(normalizedUrl: string): Promise<string> {
  const data = new TextEncoder().encode(normalizedUrl);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function getUrlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  if (collapsed === '/') return '/';
  return collapsed.replace(/\/+$/, '');
}
