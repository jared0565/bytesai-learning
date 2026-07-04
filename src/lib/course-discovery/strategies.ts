import type { Provider } from '@/lib/db';
import { extractCoursesFromCatalog } from '@/lib/scanner/discovery';
import { fetchHTML, fetchHTMLWithFirecrawl } from '@/lib/scanner/base';
import type { DiscoveryCandidateInput, DiscoveryInput, DiscoveryStrategy } from './types.ts';
import { normalizeDiscoveryUrl } from './url.ts';

type ProviderMatcher = (provider: Provider) => boolean;

export const discoveryStrategies: DiscoveryStrategy[] = [
  makeCatalogStrategy({
    id: 'google-cloud-skills',
    label: 'Google learning catalogs',
    canHandle: provider => provider.slug.includes('google') || provider.name.toLowerCase().includes('google'),
    defaultSourceUrl: provider => {
      if (provider.slug.includes('cloud') || provider.website_url?.includes('cloudskillsboost.google')) {
        return 'https://www.cloudskillsboost.google/catalog?keywords=artificial%20intelligence';
      }
      return 'https://grow.google/intl/en/courses-and-tools/?topic=ai';
    },
    confidence: 0.72,
  }),
  makeCatalogStrategy({
    id: 'microsoft-learn',
    label: 'Microsoft Learn AI catalog',
    canHandle: provider => provider.slug.includes('microsoft') || provider.website_url?.includes('learn.microsoft.com') === true,
    defaultSourceUrl: () => 'https://learn.microsoft.com/en-us/training/browse/?subjects=artificial-intelligence&resource_type=course',
    confidence: 0.78,
  }),
  makeCatalogStrategy({
    id: 'deeplearning-ai-short-courses',
    label: 'DeepLearning.AI short courses',
    canHandle: provider => provider.slug.includes('deeplearning') || provider.website_url?.includes('deeplearning.ai') === true,
    defaultSourceUrl: () => 'https://www.deeplearning.ai/short-courses/',
    confidence: 0.82,
  }),
  makeCatalogStrategy({
    id: 'nvidia-academy',
    label: 'NVIDIA learning catalogs',
    canHandle: provider => provider.slug.includes('nvidia') || provider.website_url?.includes('nvidia.com') === true,
    defaultSourceUrl: provider => provider.website_url?.includes('academy.nvidia.com')
      ? 'https://academy.nvidia.com/en/courses/'
      : 'https://learn.nvidia.com/courses',
    confidence: 0.76,
  }),
  makeCatalogStrategy({
    id: 'generic-sibling-catalog',
    label: 'Generic sibling catalog',
    canHandle: () => true,
    defaultSourceUrl: (_provider, input) => {
      const sampleUrl = getSampleUrl(input);
      if (!sampleUrl) return _provider.website_url;
      return deriveGenericCatalogUrl(sampleUrl);
    },
    confidence: 0.55,
  }),
];

export function getStrategiesForProvider(provider: Provider): DiscoveryStrategy[] {
  return discoveryStrategies.filter(strategy => strategy.canHandle(provider));
}

export function selectDiscoveryStrategy(provider: Provider, strategyId?: string): DiscoveryStrategy {
  if (strategyId && strategyId !== 'auto') {
    const explicit = discoveryStrategies.find(strategy => strategy.id === strategyId);
    if (explicit) return explicit;
  }

  return getStrategiesForProvider(provider)[0] ?? discoveryStrategies[discoveryStrategies.length - 1];
}

function makeCatalogStrategy(opts: {
  id: string;
  label: string;
  canHandle: ProviderMatcher;
  defaultSourceUrl: (provider: Provider, input: Omit<DiscoveryInput, 'db' | 'limit' | 'sourceUrl'>) => string | null;
  confidence: number;
}): DiscoveryStrategy {
  return {
    id: opts.id,
    label: opts.label,
    canHandle: opts.canHandle,
    getDefaultSourceUrl: input => normalizeDiscoveryUrl(opts.defaultSourceUrl(input.provider, input)),
    discover: input => discoverFromCatalog(input, opts.id, opts.confidence),
  };
}

async function discoverFromCatalog(
  input: DiscoveryInput,
  strategyId: string,
  confidence: number
): Promise<DiscoveryCandidateInput[]> {
  const sourceUrl = normalizeDiscoveryUrl(input.sourceUrl);
  if (!sourceUrl) return [];

  const html = await fetchCatalogHtml(sourceUrl);
  if (!html) return [];

  const sampleUrl = getSampleUrl(input) ?? sourceUrl;
  const extracted = extractCoursesFromCatalog(html, sampleUrl);
  const generic = extracted.length > 0 ? extracted : extractGenericCourseLinks(html, sourceUrl);

  return generic.slice(0, input.limit).map(course => ({
    title: course.title,
    url: course.url,
    confidence,
    freeEvidence: 'Discovered from provider-controlled learning catalog. Admin verification required.',
    raw: {
      strategyId,
      sourceUrl,
    },
  }));
}

async function fetchCatalogHtml(sourceUrl: string): Promise<string | null> {
  const firecrawlKey = await getFirecrawlApiKey();
  if (firecrawlKey) {
    const rendered = await fetchHTMLWithFirecrawl(sourceUrl, firecrawlKey, 5000);
    if (rendered) return rendered;
  }
  return fetchHTML(sourceUrl, 15_000);
}

async function getFirecrawlApiKey(): Promise<string | undefined> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    return (env as Record<string, unknown>).FIRECRAWL_API_KEY as string | undefined;
  } catch {
    return process.env.FIRECRAWL_API_KEY;
  }
}

function getSampleUrl(input: Pick<DiscoveryInput, 'sampleCourses'>): string | null {
  for (const course of input.sampleCourses) {
    const url = course.official_link ?? course.destination_url;
    const normalized = normalizeDiscoveryUrl(url);
    if (normalized) return normalized;
  }
  return null;
}

function deriveGenericCatalogUrl(sampleUrl: string): string | null {
  try {
    const url = new URL(sampleUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length > 1) segments.pop();
    url.pathname = segments.length ? `/${segments.join('/')}` : '/';
    url.search = '';
    url.hash = '';
    return normalizeDiscoveryUrl(url.toString());
  } catch {
    return null;
  }
}

function extractGenericCourseLinks(html: string, baseUrl: string): Array<{ title: string; url: string }> {
  const seen = new Set<string>();
  const courses: Array<{ title: string; url: string }> = [];
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,600}?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const normalized = normalizeHref(match[1], baseUrl);
    if (!normalized || seen.has(normalized)) continue;

    const title = cleanText(match[2]);
    if (!title || title.length < 6 || title.length > 220) continue;
    if (!looksLikeCourseUrl(normalized) && !looksLikeCourseTitle(title)) continue;

    seen.add(normalized);
    courses.push({ title, url: normalized });
  }

  return courses;
}

function normalizeHref(href: string, baseUrl: string): string | null {
  try {
    return normalizeDiscoveryUrl(new URL(href, baseUrl).toString());
  } catch {
    return null;
  }
}

function cleanText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeCourseUrl(url: string): boolean {
  try {
    return /\/(?:course|courses|training|learn|module|modules|path|paths|class|classes|catalog)\b/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function looksLikeCourseTitle(title: string): boolean {
  return /\b(?:ai|artificial intelligence|machine learning|generative|prompt|data|cloud|course|training|learn)\b/i.test(title);
}
