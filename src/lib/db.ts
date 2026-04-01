// D1 database client — parameterized queries only, no raw string interpolation
// In Cloudflare Workers context, DB is injected via binding
// In local Next.js dev, proxied via wrangler dev

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    changes?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// Helper to get DB from Next.js request context (Cloudflare Workers)
export function getDB(env?: { DB?: D1Database }): D1Database {
  const db = env?.DB ?? (globalThis as Record<string, unknown>).DB as D1Database | undefined;
  if (!db) {
    throw new Error('D1 database binding (DB) not available. Ensure wrangler is running or binding is configured.');
  }
  return db;
}

// ─── Typed query helpers ──────────────────────────────────────────────

export interface Course {
  id: string;
  slug: string;
  provider_id: string | null;
  title: string;
  author_or_source: string | null;
  content_type: 'course' | 'book' | 'other_source' | 'platform' | 'path';
  category: string | null;
  subcategory: string | null;
  level: string | null;
  primary_audience: string | null;
  focus_area: string | null;
  format_type: string | null;
  free_status: string | null;
  access_model: string | null;
  certification_type: string | null;
  duration_text: string | null;
  snippet: string | null;
  long_description: string | null;
  learning_outcomes_json: string | null;
  tags_json: string | null;
  official_link: string | null;
  destination_url: string | null;
  affiliate_url: string | null;
  is_affiliate: number;
  affiliate_provider: string | null;
  disclosure_label: string | null;
  is_alison: number;
  featured_priority: number;
  popularity_score: number;
  recent_views_30d: number;
  unique_learners_30d: number;
  starts_30d: number;
  completion_rate: number;
  published_status: 'draft' | 'published' | 'archived';
  last_verified_at: string | null;
  cover_image_url: string | null;
  cover_image_type: string | null;
  cover_image_prompt: string | null;
  cover_image_alt: string | null;
  cover_image_style_rule: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  twitter_card_type: string | null;
  canonical_url: string | null;
  quick_facts_json: string | null;
  who_its_for: string | null;
  what_to_take_next: string | null;
  original_source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  affiliate_enabled: number;
  affiliate_disclosure: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  role: 'learner' | 'admin';
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  dark_mode: number;
  timezone: string;
  learning_goal: string | null;
  preferred_format: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  status: 'saved' | 'started' | 'completed';
  started_at: string | null;
  last_opened_at: string | null;
  progress_percent: number;
  current_position: string | null;
  completed_at: string | null;
  certificate_claimed_flag: number;
  created_at: string;
  updated_at: string;
}

export interface CuratedPage {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  why_it_matters: string | null;
  what_changed: string | null;
  executive_implications: string | null;
  primary_course_slug: string | null;
  related_course_slugs_json: string | null;
  source_references_json: string | null;
  editorial_review_status: 'draft' | 'in_review' | 'approved' | 'rejected';
  published_status: 'draft' | 'published' | 'archived';
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  share_image_prompt: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Course queries ───────────────────────────────────────────────────

export async function getCourseBySlug(db: D1Database, slug: string): Promise<Course | null> {
  return db.prepare('SELECT * FROM courses WHERE slug = ? AND published_status = ?')
    .bind(slug, 'published')
    .first<Course>();
}

export async function getCourseById(db: D1Database, id: string): Promise<Course | null> {
  return db.prepare('SELECT * FROM courses WHERE id = ? AND published_status = ?')
    .bind(id, 'published')
    .first<Course>();
}

export async function getCoursesByIds(db: D1Database, ids: string[]): Promise<Course[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const result = await db.prepare(
    `SELECT * FROM courses WHERE id IN (${placeholders})`
  ).bind(...ids).all<Course>();
  return result.results;
}

export async function getFeaturedCourses(db: D1Database): Promise<{ alison: Course[]; dynamic: Course[] }> {
  const alison = await db.prepare(
    'SELECT * FROM courses WHERE is_alison = 1 AND published_status = ? ORDER BY featured_priority DESC LIMIT 2'
  ).bind('published').all<Course>();

  const dynamic = await db.prepare(
    'SELECT * FROM courses WHERE is_alison = 0 AND published_status = ? ORDER BY popularity_score DESC LIMIT 2'
  ).bind('published').all<Course>();

  return { alison: alison.results, dynamic: dynamic.results };
}

export async function getTrendingCourses(db: D1Database, limit = 8): Promise<Course[]> {
  const result = await db.prepare(
    `SELECT * FROM courses WHERE published_status = ? ORDER BY 
     (recent_views_30d * 0.45 + unique_learners_30d * 0.30 + starts_30d * 0.15 + completion_rate * 0.10) DESC 
     LIMIT ?`
  ).bind('published', limit).all<Course>();
  return result.results;
}

export async function getCoursesByCategory(db: D1Database, category: string, limit = 20): Promise<Course[]> {
  const result = await db.prepare(
    'SELECT * FROM courses WHERE category = ? AND published_status = ? ORDER BY popularity_score DESC LIMIT ?'
  ).bind(category, 'published', limit).all<Course>();
  return result.results;
}

export async function getCoursesByProvider(db: D1Database, providerId: string, limit = 20): Promise<Course[]> {
  const result = await db.prepare(
    'SELECT * FROM courses WHERE provider_id = ? AND published_status = ? ORDER BY popularity_score DESC LIMIT ?'
  ).bind(providerId, 'published', limit).all<Course>();
  return result.results;
}

export async function searchCourses(db: D1Database, opts: {
  q?: string;
  category?: string;
  level?: string;
  format?: string;
  certification?: string;
  access?: string;
  provider?: string;
  contentType?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<{ courses: Course[]; total: number }> {
  const conditions: string[] = ['published_status = ?'];
  const bindings: unknown[] = ['published'];

  if (opts.q) {
    conditions.push('(title LIKE ? OR snippet LIKE ?)');
    bindings.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  if (opts.category) { conditions.push('category = ?'); bindings.push(opts.category); }
  if (opts.level) { conditions.push('level = ?'); bindings.push(opts.level); }
  if (opts.format) { conditions.push('format_type = ?'); bindings.push(opts.format); }
  if (opts.certification) { conditions.push('certification_type = ?'); bindings.push(opts.certification); }
  if (opts.access) { conditions.push('access_model = ?'); bindings.push(opts.access); }
  if (opts.provider) { conditions.push('provider_id = ?'); bindings.push(opts.provider); }
  if (opts.contentType) { conditions.push('content_type = ?'); bindings.push(opts.contentType); }

  const where = conditions.join(' AND ');
  const sortMap: Record<string, string> = {
    popular: 'popularity_score DESC',
    newest: 'created_at DESC',
    title: 'title ASC',
    featured: 'featured_priority DESC',
    beginner: 'CASE WHEN level = "Beginner" THEN 0 ELSE 1 END, popularity_score DESC',
  };
  const orderBy = sortMap[opts.sort ?? 'popular'] ?? 'popularity_score DESC';
  const limit = Math.min(opts.limit ?? 20, 50);
  const offset = opts.offset ?? 0;

  const [data, countResult] = await db.batch<Course | { total: number }>([
    db.prepare(`SELECT * FROM courses WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(...bindings, limit, offset),
    db.prepare(`SELECT COUNT(*) AS total FROM courses WHERE ${where}`)
      .bind(...bindings),
  ]);

  return {
    courses: (data as D1Result<Course>).results,
    total: ((countResult as D1Result<{ total: number }>).results[0]?.total) ?? 0,
  };
}

export async function getRelatedCourses(db: D1Database, courseId: string, category: string, limit = 4): Promise<Course[]> {
  const result = await db.prepare(
    'SELECT * FROM courses WHERE category = ? AND id != ? AND published_status = ? ORDER BY popularity_score DESC LIMIT ?'
  ).bind(category, courseId, 'published', limit).all<Course>();
  return result.results;
}

// ─── Provider queries ─────────────────────────────────────────────────

export async function getAllProviders(db: D1Database): Promise<Provider[]> {
  const result = await db.prepare('SELECT * FROM providers ORDER BY name ASC').all<Provider>();
  return result.results;
}

export async function getProviderBySlug(db: D1Database, slug: string): Promise<Provider | null> {
  return db.prepare('SELECT * FROM providers WHERE slug = ?').bind(slug).first<Provider>();
}

// ─── User queries ─────────────────────────────────────────────────────

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first<User>();
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export async function getUserProfile(db: D1Database, userId: string): Promise<UserProfile | null> {
  return db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').bind(userId).first<UserProfile>();
}

export async function getUserProgress(db: D1Database, userId: string): Promise<UserCourseProgress[]> {
  const result = await db.prepare(
    'SELECT * FROM user_course_progress WHERE user_id = ? ORDER BY last_opened_at DESC'
  ).bind(userId).all<UserCourseProgress>();
  return result.results;
}

// ─── Event recording ──────────────────────────────────────────────────

export async function recordCourseEvent(db: D1Database, opts: {
  userId?: string;
  courseId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { nanoid } = await import('nanoid');
  await db.prepare(
    'INSERT INTO course_events (id, user_id, course_id, event_type, occurred_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    nanoid(),
    opts.userId ?? null,
    opts.courseId,
    opts.eventType,
    new Date().toISOString(),
    opts.metadata ? JSON.stringify(opts.metadata) : null
  ).run();
}

// ─── Curated pages ────────────────────────────────────────────────────

export async function getCuratedPageBySlug(db: D1Database, slug: string): Promise<CuratedPage | null> {
  return db.prepare(
    'SELECT * FROM curated_pages WHERE slug = ? AND published_status = ?'
  ).bind(slug, 'published').first<CuratedPage>();
}

export async function getPublishedCuratedPages(db: D1Database): Promise<CuratedPage[]> {
  const result = await db.prepare(
    'SELECT * FROM curated_pages WHERE published_status = ? ORDER BY created_at DESC'
  ).bind('published').all<CuratedPage>();
  return result.results;
}

// ─── Admin queries ────────────────────────────────────────────────────

export async function logAdminAction(db: D1Database, opts: {
  adminUserId: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  const { nanoid } = await import('nanoid');
  await db.prepare(
    'INSERT INTO admin_audit_logs (id, admin_user_id, action_type, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    nanoid(),
    opts.adminUserId,
    opts.actionType,
    opts.entityType,
    opts.entityId ?? null,
    opts.before ? JSON.stringify(opts.before) : null,
    opts.after ? JSON.stringify(opts.after) : null,
    new Date().toISOString()
  ).run();
}
