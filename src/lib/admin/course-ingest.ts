import type { D1Database } from '@/lib/db';
import { logAdminAction } from '@/lib/db';
import { sanitizeText, isValidSlug, isValidExternalUrl } from '@/lib/security';

const VALID_CONTENT_TYPES = ['course', 'book', 'other_source', 'platform', 'path'] as const;
const VALID_STATUSES = ['draft', 'published', 'archived'] as const;

export interface CourseIngestResult {
  status: number;
  body: {
    ok?: boolean;
    course?: { id: string; slug: string };
    existed?: boolean;
    error?: string;
  };
}

export function slugifyCourseTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export async function createCourseFromAdminInput(
  db: D1Database,
  adminUserId: string,
  body: Record<string, unknown>
): Promise<CourseIngestResult> {
  const title = sanitizeText(body.title);
  if (!title) return { status: 422, body: { error: 'title is required.' } };

  const contentType = body.content_type as string;
  if (!VALID_CONTENT_TYPES.includes(contentType as typeof VALID_CONTENT_TYPES[number])) {
    return { status: 422, body: { error: `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}.` } };
  }

  let slug = body.slug ? sanitizeText(body.slug as string) : slugifyCourseTitle(title);
  if (!isValidSlug(slug)) {
    return { status: 422, body: { error: 'Invalid slug format (lowercase letters, numbers, hyphens only).' } };
  }

  const existing = await db.prepare('SELECT id FROM courses WHERE slug = ?').bind(slug).first<{ id: string }>();
  if (existing) {
    const { nanoid } = await import('nanoid');
    slug = `${slug}-${nanoid(4)}`;
  }

  const officialLink = body.official_link ? sanitizeText(body.official_link as string) : null;
  if (officialLink && !isValidExternalUrl(officialLink)) {
    return { status: 422, body: { error: 'official_link must be a valid HTTPS URL.' } };
  }

  if (officialLink) {
    const dupe = await db.prepare('SELECT id, slug FROM courses WHERE official_link = ?').bind(officialLink).first<{ id: string; slug: string }>();
    if (dupe) {
      return { status: 200, body: { ok: true, course: { id: dupe.id, slug: dupe.slug }, existed: true } };
    }
  }

  const affiliateUrl = body.affiliate_url ? sanitizeText(body.affiliate_url as string) : null;
  if (affiliateUrl && !isValidExternalUrl(affiliateUrl)) {
    return { status: 422, body: { error: 'affiliate_url must be a valid HTTPS URL.' } };
  }

  const publishedStatus = VALID_STATUSES.includes(body.published_status as typeof VALID_STATUSES[number])
    ? (body.published_status as string)
    : 'draft';

  const isAlison = body.is_alison ? 1 : 0;
  const isAffiliate = body.is_affiliate ? 1 : 0;

  const { nanoid } = await import('nanoid');
  const id = `crs-${nanoid(12)}`;
  const now = new Date().toISOString();

  const fields = {
    id,
    slug,
    title,
    content_type: contentType,
    provider_id: body.provider_id ? sanitizeText(body.provider_id as string) : null,
    category: body.category ? sanitizeText(body.category as string) : null,
    subcategory: body.subcategory ? sanitizeText(body.subcategory as string) : null,
    level: body.level ? sanitizeText(body.level as string) : null,
    snippet: body.snippet ? sanitizeText(body.snippet as string) : null,
    long_description: body.long_description ? sanitizeText(body.long_description as string) : null,
    official_link: officialLink,
    destination_url: officialLink,
    affiliate_url: affiliateUrl,
    is_affiliate: isAffiliate,
    is_alison: isAlison,
    affiliate_provider: isAlison ? 'alison' : (body.affiliate_provider ? sanitizeText(body.affiliate_provider as string) : null),
    disclosure_label: body.disclosure_label ? sanitizeText(body.disclosure_label as string) : null,
    cover_image_url: body.cover_image_url ? sanitizeText(body.cover_image_url as string) : null,
    meta_title: body.meta_title ? sanitizeText(body.meta_title as string) : null,
    meta_description: body.meta_description ? sanitizeText(body.meta_description as string) : null,
    og_image_url: body.og_image_url ? sanitizeText(body.og_image_url as string) : null,
    published_status: publishedStatus,
    featured_priority: 0,
    popularity_score: 0,
    recent_views_30d: 0,
    unique_learners_30d: 0,
    starts_30d: 0,
    completion_rate: 0,
    created_at: now,
    updated_at: now,
  };

  const columns = Object.keys(fields).join(', ');
  const placeholders = Object.keys(fields).map(() => '?').join(', ');
  const values = Object.values(fields);

  await db.prepare(`INSERT INTO courses (${columns}) VALUES (${placeholders})`).bind(...values).run();

  await logAdminAction(db, {
    adminUserId,
    actionType: 'CREATE',
    entityType: 'course',
    entityId: id,
    after: fields,
  }).catch(() => null);

  return { status: 201, body: { ok: true, course: { id, slug } } };
}
