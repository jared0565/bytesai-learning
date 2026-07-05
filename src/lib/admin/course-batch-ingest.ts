import type { D1Database } from '../db.ts';

export const MAX_BATCH_COURSES = 100;

const VALID_CONTENT_TYPES = ['course', 'book', 'other_source', 'platform', 'path'] as const;
const VALID_STATUSES = ['draft', 'published', 'archived'] as const;

type ContentType = typeof VALID_CONTENT_TYPES[number];
type PublishedStatus = typeof VALID_STATUSES[number];
type OptionalStringCourseKey =
  | 'slug'
  | 'provider_id'
  | 'category'
  | 'subcategory'
  | 'level'
  | 'long_description'
  | 'affiliate_url'
  | 'affiliate_provider'
  | 'disclosure_label'
  | 'cover_image_url'
  | 'meta_title'
  | 'meta_description'
  | 'og_image_url';

export interface BatchCourseInput {
  source_row?: number;
  title: string;
  slug?: string;
  content_type: ContentType;
  provider_id?: string;
  category?: string;
  subcategory?: string;
  level?: string;
  snippet: string;
  long_description?: string;
  official_link: string;
  affiliate_url?: string;
  is_affiliate?: boolean;
  is_alison?: boolean;
  affiliate_provider?: string;
  disclosure_label?: string;
  cover_image_url?: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  published_status: PublishedStatus;
}

export interface BatchParseIssue {
  row: number;
  title?: string;
  error: string;
}

export interface BatchParseResult {
  courses: BatchCourseInput[];
  issues: BatchParseIssue[];
}

export interface BatchIngestRowResult {
  row: number;
  title: string;
  status: 'created' | 'existing' | 'updated' | 'failed' | 'validated' | 'archive_candidate' | 'archived';
  slug?: string;
  id?: string;
  error?: string;
}

export interface BatchIngestSummary {
  total: number;
  created: number;
  existing: number;
  updated: number;
  failed: number;
  validated: number;
  archiveCandidates: number;
  archived: number;
}

export interface BatchIngestResult {
  ok: boolean;
  dryRun: boolean;
  summary: BatchIngestSummary;
  results: BatchIngestRowResult[];
  parseIssues: BatchParseIssue[];
}

interface ParseDefaults {
  publishedStatus?: PublishedStatus;
}

interface ExistingCourseMatch {
  id: string;
  slug: string;
  title: string;
  provider_id: string | null;
  official_link: string | null;
  snippet: string | null;
  long_description: string | null;
  category: string | null;
  subcategory: string | null;
  level: string | null;
  content_type: string;
  published_status: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function boolValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'no', '0'].includes(normalized)) return false;
  return undefined;
}

function normalizeContentType(value: unknown): ContentType | null {
  const raw = stringValue(value) ?? 'course';
  return VALID_CONTENT_TYPES.includes(raw as ContentType) ? raw as ContentType : null;
}

function normalizeStatus(value: unknown, fallback: PublishedStatus): PublishedStatus | null {
  const raw = stringValue(value) ?? fallback;
  return VALID_STATUSES.includes(raw as PublishedStatus) ? raw as PublishedStatus : null;
}

function valueFrom(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeOfficialLink(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/g, '').toLowerCase();
    if (host === 'learn.microsoft.com') {
      return `${host}${path.replace(/^\/[a-z]{2}(?:-[a-z]{2})?\//, '/:locale/')}`;
    }
    return `${host}${path}`;
  } catch {
    return value.trim().toLowerCase().replace(/\/+$/g, '');
  }
}

function microsoftLearnCourseSlug(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== 'learn.microsoft.com') return null;
    const match = url.pathname.match(/^\/[a-z]{2}(?:-[a-z]{2})?\/training\/courses\/([^/?#]+)\/?$/i);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

async function findExistingCourseForRefresh(db: D1Database, course: BatchCourseInput): Promise<ExistingCourseMatch | null> {
  if (course.official_link) {
    const byUrl = await db.prepare(
      `SELECT id, slug, title, provider_id, official_link, snippet, long_description, category, subcategory, level, content_type, published_status
       FROM courses WHERE official_link = ? LIMIT 1`
    ).bind(course.official_link).first<ExistingCourseMatch>();
    if (byUrl) return byUrl;

    const microsoftSlug = microsoftLearnCourseSlug(course.official_link);
    if (microsoftSlug) {
      const candidates = await db.prepare(
        `SELECT id, slug, title, provider_id, official_link, snippet, long_description, category, subcategory, level, content_type, published_status
         FROM courses WHERE official_link LIKE ?`
      ).bind(`%/training/courses/${microsoftSlug}%`).all<ExistingCourseMatch>();
      const sourceKey = normalizeOfficialLink(course.official_link);
      const localeMatch = candidates.results.find(candidate =>
        candidate.official_link && normalizeOfficialLink(candidate.official_link) === sourceKey
      );
      if (localeMatch) return localeMatch;
    }
  }

  if (course.provider_id && course.slug) {
    const bySlug = await db.prepare(
      `SELECT id, slug, title, provider_id, official_link, snippet, long_description, category, subcategory, level, content_type, published_status
       FROM courses WHERE provider_id = ? AND slug = ? LIMIT 1`
    ).bind(course.provider_id, course.slug).first<ExistingCourseMatch>();
    if (bySlug) return bySlug;
  }

  if (course.provider_id) {
    const titleKey = normalizeComparableText(course.title);
    const candidates = await db.prepare(
      `SELECT id, slug, title, provider_id, official_link, snippet, long_description, category, subcategory, level, content_type, published_status
       FROM courses WHERE provider_id = ?`
    ).bind(course.provider_id).all<ExistingCourseMatch>();
    return candidates.results.find(candidate => normalizeComparableText(candidate.title) === titleKey) ?? null;
  }

  return null;
}

function buildRefreshUpdates(existing: ExistingCourseMatch, course: BatchCourseInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  const pairs: Array<[string, unknown, unknown]> = [
    ['title', course.title, existing.title],
    ['slug', course.slug, existing.slug],
    ['provider_id', course.provider_id, existing.provider_id],
    ['official_link', course.official_link, existing.official_link],
    ['destination_url', course.official_link, existing.official_link],
    ['snippet', course.snippet, existing.snippet],
    ['long_description', course.long_description, existing.long_description],
    ['category', course.category, existing.category],
    ['subcategory', course.subcategory, existing.subcategory],
    ['level', course.level, existing.level],
    ['content_type', course.content_type, existing.content_type],
    ['published_status', course.published_status, existing.published_status],
  ];

  for (const [field, next, current] of pairs) {
    if (next !== undefined && next !== current) {
      updates[field] = next;
    }
  }

  updates.last_verified_at = new Date().toISOString();
  updates.updated_at = updates.last_verified_at;
  return updates;
}

async function updateExistingCourseForRefresh(db: D1Database, existing: ExistingCourseMatch, course: BatchCourseInput): Promise<void> {
  const updates = buildRefreshUpdates(existing, course);
  const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  await db.prepare(`UPDATE courses SET ${setClauses} WHERE id = ?`).bind(...Object.values(updates), existing.id).run();
}

async function archiveCourse(db: D1Database, courseId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare('UPDATE courses SET published_status = ?, updated_at = ? WHERE id = ?').bind('archived', now, courseId).run();
}

export function normalizeBatchCourseInput(
  value: unknown,
  row: number,
  defaults: ParseDefaults = {}
): { course?: BatchCourseInput; issue?: BatchParseIssue } {
  const record = asRecord(value);
  if (!record) {
    return { issue: { row, error: 'Course row must be an object.' } };
  }

  const title = stringValue(valueFrom(record, ['title', 'name']));
  const snippet = stringValue(valueFrom(record, ['snippet', 'brief', 'short_brief', 'description']));
  const officialLink = stringValue(valueFrom(record, ['official_link', 'officialLink', 'url', 'link']));
  const contentType = normalizeContentType(record.content_type ?? record.contentType);
  const publishedStatus = normalizeStatus(
    record.published_status ?? record.publishedStatus ?? record.status,
    defaults.publishedStatus ?? 'draft'
  );

  if (!title) return { issue: { row, error: 'title is required.' } };
  if (!snippet) return { issue: { row, title, error: 'short brief is required. Add brief or snippet.' } };
  if (!officialLink) return { issue: { row, title, error: 'official_link or url is required.' } };
  if (!contentType) return { issue: { row, title, error: `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}.` } };
  if (!publishedStatus) return { issue: { row, title, error: `published_status must be one of: ${VALID_STATUSES.join(', ')}.` } };

  const course: BatchCourseInput = {
    source_row: row,
    title,
    content_type: contentType,
    snippet,
    official_link: officialLink,
    published_status: publishedStatus,
  };

  const optionalStringFields: Array<[OptionalStringCourseKey, string[]]> = [
    ['slug', ['slug']],
    ['provider_id', ['provider_id', 'providerId', 'provider']],
    ['category', ['category']],
    ['subcategory', ['subcategory', 'sub_category', 'subCategory']],
    ['level', ['level']],
    ['long_description', ['long_description', 'longDescription']],
    ['affiliate_url', ['affiliate_url', 'affiliateUrl']],
    ['affiliate_provider', ['affiliate_provider', 'affiliateProvider']],
    ['disclosure_label', ['disclosure_label', 'disclosureLabel']],
    ['cover_image_url', ['cover_image_url', 'coverImageUrl', 'image_url', 'imageUrl']],
    ['meta_title', ['meta_title', 'metaTitle']],
    ['meta_description', ['meta_description', 'metaDescription']],
    ['og_image_url', ['og_image_url', 'ogImageUrl']],
  ];

  for (const [field, keys] of optionalStringFields) {
    const next = stringValue(valueFrom(record, keys));
    if (next) {
      course[field] = next;
    }
  }

  const isAffiliate = boolValue(record.is_affiliate ?? record.isAffiliate);
  if (isAffiliate !== undefined) course.is_affiliate = isAffiliate;

  const isAlison = boolValue(record.is_alison ?? record.isAlison);
  if (isAlison !== undefined) course.is_alison = isAlison;

  return { course };
}

function parseJsonShape(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  const record = asRecord(parsed);
  if (record && Array.isArray(record.courses)) return record.courses;
  throw new Error('JSON must be an array of courses or an object with a courses array.');
}

function tryParseJson(text: string): unknown[] | null {
  try {
    return parseJsonShape(JSON.parse(text));
  } catch {
    return null;
  }
}

function extractJsonFence(markdown: string): unknown[] | null {
  const fences = markdown.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  for (const fence of fences) {
    const parsed = tryParseJson(fence[1].trim());
    if (parsed) return parsed;
  }
  return null;
}

function normalizeMarkdownKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseMarkdownSections(markdown: string): unknown[] {
  const sections = [...markdown.matchAll(/^##\s+(.+?)\s*$([\s\S]*?)(?=^##\s+|(?![\s\S]))/gm)];

  return sections.map((section) => {
    const rawTitle = section[1];
    const lines = section[2].split(/\r?\n/);
    const record: Record<string, string> = { title: rawTitle.trim() };
    const prose: string[] = [];

    for (const line of lines) {
      const cleaned = line.trim().replace(/^[-*]\s+/, '');
      if (!cleaned) continue;
      const match = cleaned.match(/^([A-Za-z][A-Za-z0-9 _-]{1,40}):\s*(.+)$/);
      if (!match) {
        prose.push(cleaned);
        continue;
      }
      const key = normalizeMarkdownKey(match[1]);
      record[key] = match[2].trim();
    }

    if (!record.brief && !record.snippet && prose.length > 0) {
      record.brief = prose.join(' ');
    }

    return {
      title: record.title,
      slug: record.slug,
      content_type: record.contenttype,
      provider_id: record.providerid ?? record.provider,
      category: record.category,
      subcategory: record.subcategory,
      level: record.level,
      brief: record.brief ?? record.shortbrief,
      snippet: record.snippet,
      long_description: record.longdescription,
      official_link: record.officiallink ?? record.url ?? record.link,
      affiliate_url: record.affiliateurl,
      is_affiliate: record.isaffiliate,
      is_alison: record.isalison,
      affiliate_provider: record.affiliateprovider,
      disclosure_label: record.disclosurelabel,
      cover_image_url: record.coverimageurl ?? record.imageurl,
      meta_title: record.metatitle,
      meta_description: record.metadescription,
      og_image_url: record.ogimageurl,
      published_status: record.publishedstatus ?? record.status,
    };
  });
}

export function parseCourseBatchText(
  text: string,
  filename = 'courses.json',
  defaults: ParseDefaults = {}
): BatchParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { courses: [], issues: [{ row: 0, error: 'File is empty.' }] };
  }

  let rawCourses: unknown[] | null = null;
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
    rawCourses = extractJsonFence(trimmed) ?? parseMarkdownSections(trimmed);
  } else {
    rawCourses = tryParseJson(trimmed);
  }

  if (!rawCourses) {
    return { courses: [], issues: [{ row: 0, error: 'Could not parse file. Upload JSON, or Markdown with course sections or a fenced JSON block.' }] };
  }

  if (rawCourses.length > MAX_BATCH_COURSES) {
    return { courses: [], issues: [{ row: 0, error: `Batch limit is ${MAX_BATCH_COURSES} courses per upload.` }] };
  }

  const courses: BatchCourseInput[] = [];
  const issues: BatchParseIssue[] = [];

  rawCourses.forEach((raw, index) => {
    const row = index + 1;
    const { course, issue } = normalizeBatchCourseInput(raw, row, defaults);
    if (course) courses.push(course);
    if (issue) issues.push(issue);
  });

  return { courses, issues };
}

export async function ingestCourseBatch(input: {
  db: D1Database;
  adminUserId: string;
  courses: BatchCourseInput[];
  parseIssues?: BatchParseIssue[];
  dryRun?: boolean;
  updateExisting?: boolean;
  archiveMissing?: boolean;
  providerId?: string;
}): Promise<BatchIngestResult> {
  const results: BatchIngestRowResult[] = [];
  const parseIssues = input.parseIssues ?? [];
  const seenExistingIds = new Set<string>();
  const summary: BatchIngestSummary = {
    total: input.courses.length + parseIssues.length,
    created: 0,
    existing: 0,
    updated: 0,
    failed: parseIssues.length,
    validated: 0,
    archiveCandidates: 0,
    archived: 0,
  };

  for (const issue of parseIssues) {
    results.push({
      row: issue.row,
      title: issue.title ?? `Row ${issue.row}`,
      status: 'failed',
      error: issue.error,
    });
  }

  for (const [index, course] of input.courses.entries()) {
    const row = course.source_row ?? index + 1;
    if (input.dryRun) {
      if (input.updateExisting) {
        const existing = await findExistingCourseForRefresh(input.db, course);
        if (existing) seenExistingIds.add(existing.id);
      }
      summary.validated++;
      results.push({ row, title: course.title, status: 'validated', slug: course.slug });
      continue;
    }

    if (input.updateExisting) {
      const existing = await findExistingCourseForRefresh(input.db, course);
      if (existing) {
        seenExistingIds.add(existing.id);
        await updateExistingCourseForRefresh(input.db, existing, course);
        summary.updated++;
        results.push({
          row,
          title: course.title,
          status: 'updated',
          id: existing.id,
          slug: existing.slug,
        });
        continue;
      }
    }

    const { createCourseFromAdminInput } = await import('./course-ingest.ts');
    const payload: Record<string, unknown> = { ...course };
    const result = await createCourseFromAdminInput(input.db, input.adminUserId, payload);
    if (result.status >= 200 && result.status < 300 && result.body.course) {
      if (result.body.existed) {
        summary.existing++;
        results.push({
          row,
          title: course.title,
          status: 'existing',
          id: result.body.course.id,
          slug: result.body.course.slug,
        });
      } else {
        summary.created++;
        results.push({
          row,
          title: course.title,
          status: 'created',
          id: result.body.course.id,
          slug: result.body.course.slug,
        });
      }
    } else {
      summary.failed++;
      results.push({
        row,
        title: course.title,
        status: 'failed',
        error: result.body.error ?? 'Failed to create course.',
      });
    }
  }

  if (input.updateExisting && input.providerId) {
    const providerRows = await input.db.prepare(
      `SELECT id, slug, title, provider_id, official_link, snippet, long_description, category, subcategory, level, content_type, published_status
       FROM courses WHERE provider_id = ? AND published_status != ?`
    ).bind(input.providerId, 'archived').all<ExistingCourseMatch>();

    for (const existing of providerRows.results) {
      if (seenExistingIds.has(existing.id)) continue;
      const row = input.courses.length + results.length + 1;
      if (input.archiveMissing && !input.dryRun) {
        await archiveCourse(input.db, existing.id);
        summary.archived++;
        results.push({
          row,
          title: existing.title,
          status: 'archived',
          id: existing.id,
          slug: existing.slug,
        });
      } else {
        summary.archiveCandidates++;
        results.push({
          row,
          title: existing.title,
          status: 'archive_candidate',
          id: existing.id,
          slug: existing.slug,
        });
      }
    }
  }

  return {
    ok: summary.failed === 0,
    dryRun: Boolean(input.dryRun),
    summary,
    results: results.sort((a, b) => a.row - b.row),
    parseIssues,
  };
}
