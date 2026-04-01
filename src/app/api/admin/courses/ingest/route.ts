export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { sanitizeText, isValidSlug, isValidExternalUrl } from '@/lib/security';
import { logAdminAction } from '@/lib/db';

function getDB(req: NextRequest) {
  const env = (req as unknown as { env?: { DB?: import('@/lib/db').D1Database } }).env;
  return env?.DB ?? (globalThis as Record<string, unknown>).DB as import('@/lib/db').D1Database | undefined ?? null;
}

async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'admin') return null;
  return session;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

const VALID_CONTENT_TYPES = ['course', 'book', 'other_source', 'platform', 'path'] as const;
const VALID_STATUSES = ['draft', 'published', 'archived'] as const;

// POST /api/admin/courses/ingest
export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body.' }, { status: 400 }); }

  const db = getDB(req);
  if (!db) return NextResponse.json({ error: 'DB unavailable.' }, { status: 503 });

  // Validate required fields
  const title = sanitizeText(body.title);
  if (!title) return NextResponse.json({ error: 'title is required.' }, { status: 422 });

  const contentType = body.content_type as string;
  if (!VALID_CONTENT_TYPES.includes(contentType as typeof VALID_CONTENT_TYPES[number])) {
    return NextResponse.json({ error: `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}.` }, { status: 422 });
  }

  // Slug: use provided or auto-generate, then verify uniqueness
  let slug = body.slug ? sanitizeText(body.slug as string) : slugify(title);
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'Invalid slug format (lowercase letters, numbers, hyphens only).' }, { status: 422 });
  }

  // Check slug uniqueness
  const existing = await db.prepare('SELECT id FROM courses WHERE slug = ?').bind(slug).first<{ id: string }>();
  if (existing) {
    // Append a short suffix to make it unique
    const { nanoid } = await import('nanoid');
    slug = `${slug}-${nanoid(4)}`;
  }

  const officialLink = body.official_link ? sanitizeText(body.official_link as string) : null;
  if (officialLink && !isValidExternalUrl(officialLink)) {
    return NextResponse.json({ error: 'official_link must be a valid HTTPS URL.' }, { status: 422 });
  }

  const affiliateUrl = body.affiliate_url ? sanitizeText(body.affiliate_url as string) : null;
  if (affiliateUrl && !isValidExternalUrl(affiliateUrl)) {
    return NextResponse.json({ error: 'affiliate_url must be a valid HTTPS URL.' }, { status: 422 });
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

  try {
    await db.prepare(`INSERT INTO courses (${columns}) VALUES (${placeholders})`).bind(...values).run();

    await logAdminAction(db, {
      adminUserId: session.userId,
      actionType: 'CREATE',
      entityType: 'course',
      entityId: id,
      after: fields,
    });

    return NextResponse.json({ ok: true, course: { id, slug } }, { status: 201 });
  } catch (err) {
    console.error('Course ingest error:', err);
    return NextResponse.json({ error: 'Failed to create course.' }, { status: 500 });
  }
}
