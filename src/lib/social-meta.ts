export const SITE_URL = 'https://learn.bytesai.uk';

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

export type SharePlatform = 'twitter' | 'linkedin' | 'whatsapp' | 'facebook';

export type SocialShareCopy = Partial<Record<SharePlatform, string>>;

export interface ArticleOgImageData {
  eyebrow: string;
  headline: string;
  summary: string;
  callout: string;
  badge: string;
  accent: 'violet' | 'teal' | 'amber' | 'blue' | 'rose';
}

function apiUrl(path: string, params?: Record<string, string | number | undefined | null>): string {
  const url = new URL(path, SITE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

function imagePath(type: 'article' | 'course', slug: string, version: string): string {
  return `${SITE_URL}/api/og/${type}/${encodeURIComponent(slug)}/${encodeURIComponent(version)}.png`;
}

export function articleSocialImageUrl(slug: string, version?: string | null): string {
  return imagePath('article', slug, version ? encodeVersion(version) : 'card');
}

export function courseSocialImageUrl(slug: string): string {
  return imagePath('course', slug, 'card');
}

export function quizSocialImageUrl(score: number, total: number, difficulty: string): string {
  return apiUrl('/api/og', { type: 'quiz', score, total, difficulty });
}

export function defaultSocialImageUrl(): string {
  return `${SITE_URL}/og-default.png`;
}

export function encodeVersion(value: string): string {
  return value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 24);
}

export function parseSocialShareCopy(value: string | null | undefined): SocialShareCopy {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const copy: SocialShareCopy = {};
    for (const platform of ['twitter', 'linkedin', 'whatsapp', 'facebook'] as const) {
      if (typeof parsed[platform] === 'string' && parsed[platform].trim()) {
        copy[platform] = parsed[platform].trim();
      }
    }
    return copy;
  } catch {
    return {};
  }
}

export function serializeSocialShareCopy(copy: SocialShareCopy): string | null {
  const cleaned: SocialShareCopy = {};
  for (const platform of ['twitter', 'linkedin', 'whatsapp', 'facebook'] as const) {
    const value = copy[platform]?.trim();
    if (value) cleaned[platform] = value;
  }
  return Object.keys(cleaned).length ? JSON.stringify(cleaned) : null;
}

export function socialMetaDescription(value: string | null | undefined, maxLength = 200): string | undefined {
  const cleaned = stripMarkdown(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return undefined;
  return truncateAtWord(cleaned, maxLength);
}

export function buildArticleOgImageData(input: {
  title: string;
  summary?: string | null;
  whyItMatters?: string | null;
  categories?: string[] | null;
  stored?: string | null;
}): ArticleOgImageData {
  const stored = parseArticleOgImageData(input.stored);
  if (stored) return stored;

  const category = input.categories?.[0] ?? 'AI INSIGHT';
  return {
    eyebrow: 'CURATED INSIGHT',
    headline: input.title,
    summary: stripMarkdown(input.summary ?? input.whyItMatters ?? '').slice(0, 180),
    callout: stripMarkdown(input.whyItMatters ?? '').slice(0, 220),
    badge: category.toUpperCase(),
    accent: pickAccent(category),
  };
}

export function parseArticleOgImageData(value: string | null | undefined): ArticleOgImageData | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ArticleOgImageData>;
    if (!parsed.headline || typeof parsed.headline !== 'string') return null;
    return {
      eyebrow: typeof parsed.eyebrow === 'string' && parsed.eyebrow.trim() ? parsed.eyebrow.trim() : 'CURATED INSIGHT',
      headline: parsed.headline.trim(),
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      callout: typeof parsed.callout === 'string' ? parsed.callout.trim() : '',
      badge: typeof parsed.badge === 'string' && parsed.badge.trim() ? parsed.badge.trim() : 'AI INSIGHT',
      accent: isAccent(parsed.accent) ? parsed.accent : 'violet',
    };
  } catch {
    return null;
  }
}

export function stripMarkdown(value: string): string {
  return value
    .replace(/^[-*]\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateAtWord(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(' ');
  const base = lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trimEnd()}...`;
}

function pickAccent(value: string): ArticleOgImageData['accent'] {
  const normalized = value.toLowerCase();
  if (normalized.includes('governance') || normalized.includes('ethics') || normalized.includes('risk')) return 'amber';
  if (normalized.includes('tool') || normalized.includes('workflow')) return 'teal';
  if (normalized.includes('research') || normalized.includes('model')) return 'blue';
  if (normalized.includes('safety') || normalized.includes('bias')) return 'rose';
  return 'violet';
}

function isAccent(value: unknown): value is ArticleOgImageData['accent'] {
  return value === 'violet' || value === 'teal' || value === 'amber' || value === 'blue' || value === 'rose';
}
