/**
 * Course discovery engine.
 *
 * For each provider with existing courses, derives the catalog/parent URL
 * from existing course URLs, then discovers sibling courses on that page.
 */

import type { D1Database } from '@/lib/db';
import type { ScannedCourse } from './types';
import { fetchHTML, fetchHTMLWithFirecrawl, resolveCourse } from './base';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface ProviderWithSample {
  id: string;
  slug: string;
  name: string;
  sampleUrl: string;
  websiteUrl: string | null;
  courseCount?: number;
}

export interface DiscoveredCourse extends ScannedCourse {
  providerId: string;
}

export async function getProvidersWithSamples(db: D1Database): Promise<ProviderWithSample[]> {
  const rows = await db.prepare(
    `SELECT
       p.id, p.slug, p.name, p.website_url,
       c.official_link AS sample_url,
       COUNT(c2.id) AS course_count
     FROM providers p
     JOIN courses c ON c.provider_id = p.id
     LEFT JOIN courses c2 ON c2.provider_id = p.id
     WHERE c.published_status = 'published'
     GROUP BY p.id, c.official_link`
  ).all<{
    id: string; slug: string; name: string;
    website_url: string | null; sample_url: string;
    course_count: number;
  }>();

  return rows.results.map(r => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    sampleUrl: r.sample_url,
    websiteUrl: r.website_url,
    courseCount: r.course_count,
  }));
}

export function deriveCatalogUrl(provider: ProviderWithSample): string | null {
  const url = provider.sampleUrl;
  const domain = provider.websiteUrl ?? new URL(url).origin;

  if (domain.includes('learn.microsoft.com')) {
    const m = url.match(/^(https?:\/\/[^\/]+\/[a-z]{2}(?:-[a-z]{2})?\/training)\/(?:courses|modules|paths)\/[^\/]+\/?/);
    if (m) return `${m[1]}/browse/?subjects=artificial-intelligence&resource_type=course`;
    const s = url.match(/^(https?:\/\/[^\/]+)\/[a-z]{2}(?:-[a-z]{2})?\/shows\//);
    if (s) return `${s[1]}/en-us/shows/`;
    return 'https://learn.microsoft.com/en-us/training/browse/?subjects=artificial-intelligence&resource_type=course';
  }

  if (domain.includes('nvidia.com')) {
    if (url.includes('academy.nvidia.com')) {
      const m = url.match(/^(https?:\/\/[^\/]+\/[a-z]{2}\/course)\//);
      if (m) return `${m[1]}s/`;
      return 'https://academy.nvidia.com/en/courses/';
    }
    if (url.includes('learn.nvidia.com')) {
      return 'https://learn.nvidia.com/courses';
    }
    return 'https://learn.nvidia.com/courses';
  }

  if (domain.includes('deeplearning.ai')) {
    const m = url.match(/^(https?:\/\/[^\/]+)\/short-courses\//);
    if (m) return `${m[1]}/short-courses/`;
    return 'https://www.deeplearning.ai/short-courses/';
  }

  if (domain.includes('skillbuilder.aws')) {
    return 'https://skillbuilder.aws/learn';
  }

  if (domain.includes('alison.com')) {
    return 'https://alison.com/courses?query=artificial+intelligence';
  }

  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      segments.pop();
      u.pathname = '/' + segments.join('/') + '/';
      return u.toString();
    }
  } catch { /* ignore */ }

  return null;
}

export function extractCoursesFromCatalog(
  html: string,
  sampleUrl: string,
): Array<{ title: string; url: string }> {
  const seen = new Set<string>();
  const candidates: Array<{ title: string; url: string }> = [];

  let pathPattern: RegExp | null = null;
  let domain: string | null = null;

  if (sampleUrl.includes('learn.microsoft.com')) {
    pathPattern = /\/[a-z]{2}(?:-[a-z]{2})?\/training\/(?:courses|modules|paths)\/[^"\s]+/gi;
    domain = 'https://learn.microsoft.com';
  } else if (sampleUrl.includes('academy.nvidia.com')) {
    pathPattern = /academy\.nvidia\.com\/[a-z]{2}\/course\/[^"\s]+/gi;
    domain = 'https://academy.nvidia.com';
  } else if (sampleUrl.includes('learn.nvidia.com')) {
    pathPattern = /learn\.nvidia\.com\/courses\/[^"\s]+/gi;
    domain = 'https://learn.nvidia.com';
  } else if (sampleUrl.includes('deeplearning.ai/short-courses/')) {
    pathPattern = /deeplearning\.ai\/short-courses\/[^"\s]+/gi;
    domain = 'https://www.deeplearning.ai';
  } else if (sampleUrl.includes('skillbuilder.aws')) {
    pathPattern = /skillbuilder\.aws\/learn\/[^"\s]+/gi;
    domain = 'https://skillbuilder.aws';
  } else if (sampleUrl.includes('alison.com/course/')) {
    pathPattern = /alison\.com\/course\/[^"\s]+/gi;
    domain = 'https://alison.com';
  }

  if (pathPattern) {
    let m: RegExpExecArray | null;
    while ((m = pathPattern.exec(html)) !== null) {
      const path = m[0];
      const url = path.startsWith('http') ? path : `${domain}${path}`;
      if (seen.has(url)) continue;
      seen.add(url);

      const window = html.slice(Math.max(0, m.index - 500), m.index + 500);
      const title = extractTitleFromWindow(window, path, url);
      if (title) candidates.push({ title, url });
    }
  }

  if (candidates.length === 0) {
    const genericRegex = /href="([^"]*(?:course|module|path|class|lesson)[^"]*)"[^>]*>\s*([^<]{10,200})\s*<\/a>/gi;
    let gm: RegExpExecArray | null;
    while ((gm = genericRegex.exec(html)) !== null) {
      const url = normalizeUrl(gm[1], sampleUrl);
      const title = cleanTitle(gm[2].trim());
      if (url && title && !seen.has(url)) {
        seen.add(url);
        candidates.push({ title, url });
      }
    }
  }

  return candidates;
}

export async function discoverProviderCourses(
  provider: ProviderWithSample,
  opts: { limit: number; db: D1Database }
): Promise<DiscoveredCourse[]> {
  const catalogUrl = deriveCatalogUrl(provider);
  if (!catalogUrl) return [];

  let html: string | null = null;
  let firecrawlKey: string | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    firecrawlKey = (env as Record<string, unknown>).FIRECRAWL_API_KEY as string | undefined;
  } catch { /* local dev */ }

  if (firecrawlKey) {
    html = await fetchHTMLWithFirecrawl(catalogUrl, firecrawlKey, 5000);
  }
  if (!html) {
    html = await fetchHTML(catalogUrl, 15_000);
  }
  if (!html) return [];

  const candidates = extractCoursesFromCatalog(html, provider.sampleUrl);

  const results: DiscoveredCourse[] = [];
  for (const c of candidates.slice(0, opts.limit)) {
    const resolved = await resolveCourse(opts.db, c.title, c.url, { fetchMeta: true, timeout: 8_000 });
    results.push({ ...resolved, providerId: provider.id });
  }

  return results;
}

/** Extract title from a window of HTML around a matched path.
 *  Tries to find the enclosing <a> tag first, then falls back to nearby headings.
 */
function extractTitleFromWindow(window: string, path: string, url: string): string | null {
  // 1. Find the <a> tag that contains this exact href and extract its text.
  //    Accounts for HTML comments like <!----> between the opening tag and text.
  const escapedPath = path.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const aRegex = new RegExp('href=["\']' + escapedPath + '["\'][^\u003e]*\u003e(?:\u003c[^\u003e]+\u003e)?([^\u003c]{10,200})', 'i');
  const aMatch = window.match(aRegex);
  if (aMatch) {
    const title = aMatch[1].trim();
    if (title.length > 5 && !/^(?:add to plan|enroll|learn more|view)$/i.test(title)) {
      return cleanTitle(title);
    }
  }

  // 2. Fall back to nearby headings (look in the window, not just backwards).
  const h3Match = window.match(/\u003ch[23][^\u003e]*\u003e([^\u003c]{10,200})\u003c\/h[23]\u003e/i);
  if (h3Match) return cleanTitle(h3Match[1].trim());

  const spanMatch = window.match(/\u003cspan[^\u003e]*class=["\'][^"\']*title[^"\']*["\'][^\u003e]*\u003e([^\u003c]{10,200})\u003c\/span\u003e/i);
  if (spanMatch) return cleanTitle(spanMatch[1].trim());

  // 3. Last resort: derive from URL slug.
  try {
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    if (slug.length > 3) {
      return cleanTitle(slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }
  } catch { /* ignore */ }

  return null;
}

function normalizeUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
