// D1 database client — parameterized queries only, no raw string interpolation
// Production: uses Cloudflare D1 binding via @opennextjs/cloudflare
// Local dev: uses node:sqlite adapter loaded via instrumentation.ts

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

// Central DB accessor — works in both production (Cloudflare) and local dev
export async function getDB(): Promise<D1Database> {
  // Local dev: instrumentation.ts sets globalThis.DB to the SQLite adapter
  const localDB = (globalThis as Record<string, unknown>).DB as D1Database | undefined;
  if (localDB) return localDB;

  // Production: use OpenNext's Cloudflare context
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as Record<string, unknown>).DB as D1Database | undefined;
  if (!db) {
    throw new Error('D1 database binding (DB) not available.');
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
  enroll_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
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
  marketing_consent: number; // 0 = no, 1 = yes
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
  primary_course_rationale: string | null;
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
  view_count: number;
  last_viewed_at: string | null;
  referrer_counts_json: string | null;
  ai_generated: number; // 0 = human, 1 = AI-generated
  generated_model: string | null; // e.g. "google/gemini-flash-1.5"
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Course queries ───────────────────────────────────────────────────

export async function getCourseBySlug(db: D1Database, slug: string, includeUnpublished = false): Promise<Course | null> {
  if (includeUnpublished) {
    return db.prepare('SELECT * FROM courses WHERE slug = ?').bind(slug).first<Course>();
  }
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
    featured: 'featured_priority DESC, popularity_score DESC',
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

export async function getCuratedPageBySlugAnyStatus(db: D1Database, slug: string): Promise<CuratedPage | null> {
  return db.prepare(
    'SELECT * FROM curated_pages WHERE slug = ?'
  ).bind(slug).first<CuratedPage>();
}

export async function getPublishedCuratedPages(db: D1Database): Promise<CuratedPage[]> {
  const result = await db.prepare(
    'SELECT * FROM curated_pages WHERE published_status = ? ORDER BY created_at DESC'
  ).bind('published').all<CuratedPage>();
  return result.results;
}

export async function getRecentPublishedCuratedPages(db: D1Database, limit = 3): Promise<CuratedPage[]> {
  const result = await db.prepare(
    'SELECT id, slug, title, summary, last_verified_at, view_count FROM curated_pages WHERE published_status = ? ORDER BY created_at DESC LIMIT ?'
  ).bind('published', limit).all<CuratedPage>();
  return result.results;
}

/** Find published curated pages that reference a given course slug */
export async function getCuratedPagesForCourse(db: D1Database, courseSlug: string): Promise<CuratedPage[]> {
  const result = await db.prepare(
    `SELECT id, slug, title, summary FROM curated_pages
     WHERE published_status = 'published'
       AND (primary_course_slug = ? OR related_course_slugs_json LIKE ?)
     ORDER BY view_count DESC LIMIT 3`
  ).bind(courseSlug, `%"${courseSlug}"%`).all<CuratedPage>();
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

/**
 * Purge admin audit log entries older than 24 months.
 * Run periodically to enforce the data retention policy stated in the Privacy Policy.
 * Safe to call on every admin login — the DELETE is a no-op when no rows qualify.
 */
export async function purgeOldAuditLogs(db: D1Database): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString(); // ~24 months
  await db.prepare(
    'DELETE FROM admin_audit_logs WHERE created_at < ?'
  ).bind(cutoff).run().catch(() => null);
}

/** Reorder courses so each grid row contains up to `maxAlison` Alison cards,
 *  interleaved with other providers. Partial last rows are capped at 1 Alison. */
export function distributeCourses(courses: Course[], rowSize: number = 4): Course[] {
  return distributeWithAlisonLimit(courses, c => c.is_alison === 1, rowSize, 2);
}

/** Interleaves Alison and non-Alison items so each row shows:
 *    Non | Alison | Non | Alison  (up to maxAlisonPerRow per full row).
 *  Alison are spread evenly across rows via round-robin before interleaving. */
export function distributeWithAlisonLimit<T>(
  items: T[],
  isAlison: (item: T) => boolean,
  rowSize: number = 4,
  maxAlisonPerRow: number = 2
): T[] {
  const nonAlison = items.filter(item => !isAlison(item));
  const alison = items.filter(item => isAlison(item));

  if (items.length === 0) return [];
  // Nothing to interleave
  if (alison.length === 0 || nonAlison.length === 0) return items;

  const numRows = Math.ceil(items.length / rowSize);
  const lastRowSize = items.length % rowSize || rowSize;

  // Partial last row (fewer items than a full row) gets at most 1 Alison
  const rowCap = (r: number) =>
    r === numRows - 1 && lastRowSize < rowSize ? 1 : maxAlisonPerRow;

  // Round-robin: distribute Alison evenly across rows (prevents front-loading)
  const alisonPerRow: number[] = new Array(numRows).fill(0);
  let totalPlaced = 0;
  let madeProgress = true;
  while (totalPlaced < alison.length && madeProgress) {
    madeProgress = false;
    for (let r = 0; r < numRows && totalPlaced < alison.length; r++) {
      if (alisonPerRow[r] < rowCap(r)) {
        alisonPerRow[r]++;
        totalPlaced++;
        madeProgress = true;
      }
    }
  }

  // Build result: for each row, interleave non-Alison and Alison
  const result: T[] = [];
  let nonIdx = 0, aliIdx = 0;

  for (let r = 0; r < numRows; r++) {
    const thisRowSize = r === numRows - 1 ? lastRowSize : rowSize;
    const aliCount = alisonPerRow[r];
    const nonCount = Math.max(0, thisRowSize - aliCount);

    const rowNon = nonAlison.slice(nonIdx, nonIdx + nonCount);
    const rowAli = alison.slice(aliIdx, aliIdx + aliCount);
    nonIdx += rowNon.length;
    aliIdx += rowAli.length;

    // Alternate: Non, Ali, Non, Ali...
    let nI = 0, aI = 0;
    let wantAli = false;
    while (nI < rowNon.length || aI < rowAli.length) {
      if (!wantAli && nI < rowNon.length) {
        result.push(rowNon[nI++]);
        wantAli = aI < rowAli.length;
      } else if (aI < rowAli.length) {
        result.push(rowAli[aI++]);
        wantAli = false;
      } else {
        result.push(rowNon[nI++]);
      }
    }
  }

  // Safety: append any overflow Alison that exceeded row caps
  if (aliIdx < alison.length) {
    result.push(...alison.slice(aliIdx));
  }

  return result;
}

// ─── Quiz types and queries ────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options_json: string;
  correct_index: number;
  explanation: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topic_tags_json: string | null;
}

export interface QuizAttempt {
  id: string;
  user_id: string | null;
  quiz_id: string;
  difficulty: string;
  score: number;
  total: number;
  answers_json: string | null;
  weak_topics_json: string | null;
  completed_at: string;
}

export interface QuizQuestionForClient {
  id: string;
  question_text: string;
  options: string[];
  difficulty: string;
}

export async function getQuizQuestions(
  db: D1Database,
  difficulty: string,
  limit: number = 5
): Promise<QuizQuestionForClient[]> {
  const stmt = db.prepare(
    `SELECT id, question_text, options_json, difficulty
     FROM quiz_questions
     WHERE difficulty = ?
     ORDER BY RANDOM()
     LIMIT ?`
  ).bind(difficulty, limit);
  const { results } = await stmt.all<{ id: string; question_text: string; options_json: string; difficulty: string }>();
  return results.map(r => ({
    id: r.id,
    question_text: r.question_text,
    options: JSON.parse(r.options_json) as string[],
    difficulty: r.difficulty,
  }));
}

export async function getQuizCorrectAnswers(
  db: D1Database,
  questionIds: string[]
): Promise<Array<{ id: string; correct_index: number; explanation: string | null; topic_tags_json: string | null }>> {
  if (questionIds.length === 0) return [];
  const placeholders = questionIds.map(() => '?').join(',');
  const stmt = db.prepare(
    `SELECT id, correct_index, explanation, topic_tags_json
     FROM quiz_questions
     WHERE id IN (${placeholders})`
  ).bind(...questionIds);
  const { results } = await stmt.all<{ id: string; correct_index: number; explanation: string | null; topic_tags_json: string | null }>();
  return results;
}

export async function saveQuizAttempt(
  db: D1Database,
  attempt: Omit<QuizAttempt, 'completed_at'> & { completed_at?: string }
): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO quiz_attempts (id, user_id, quiz_id, difficulty, score, total, answers_json, weak_topics_json, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    attempt.id,
    attempt.user_id ?? null,
    attempt.quiz_id,
    attempt.difficulty,
    attempt.score,
    attempt.total,
    attempt.answers_json ?? null,
    attempt.weak_topics_json ?? null,
    attempt.completed_at ?? now
  ).run();
}

export async function getQuizLeaderboard(
  db: D1Database,
  quizId: string,
  difficulty: string,
  limit: number = 20
): Promise<Array<{ id: string; display_name: string | null; score: number; total: number; completed_at: string }>> {
  const { results } = await db.prepare(
    `SELECT qa.id, up.display_name, qa.score, qa.total, qa.completed_at
     FROM quiz_attempts qa
     LEFT JOIN user_profiles up ON up.user_id = qa.user_id
     WHERE qa.quiz_id = ? AND qa.difficulty = ? AND qa.user_id IS NOT NULL
     ORDER BY qa.score DESC, qa.completed_at ASC
     LIMIT ?`
  ).bind(quizId, difficulty, limit).all<{ id: string; display_name: string | null; score: number; total: number; completed_at: string }>();
  return results;
}

export async function getUserQuizAttempts(
  db: D1Database,
  userId: string,
  quizId?: string
): Promise<QuizAttempt[]> {
  let sql = `SELECT * FROM quiz_attempts WHERE user_id = ?`;
  const bindings: unknown[] = [userId];
  if (quizId) {
    sql += ` AND quiz_id = ?`;
    bindings.push(quizId);
  }
  sql += ` ORDER BY completed_at DESC`;
  const { results } = await db.prepare(sql).bind(...bindings).all<QuizAttempt>();
  return results;
}
