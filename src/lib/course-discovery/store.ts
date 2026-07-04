import type { D1Database, Provider } from '@/lib/db';
import type {
  CandidateCounts,
  CourseDiscoveryCandidate,
  CourseDiscoveryJob,
  DiscoveryCandidateInput,
  DiscoveryCandidateStatus,
  DiscoveryJobStatus,
  ExistingCourseMatch,
} from './types';
import { hashDiscoveryUrl, normalizeDiscoveryUrl } from './url.ts';

interface BuildCandidateRecordInput {
  candidate: DiscoveryCandidateInput;
  existingCourse: ExistingCourseMatch | null;
  jobId: string;
  providerId: string;
  sourceUrl: string | null;
  now: string;
}

export async function buildCandidateRecord(input: BuildCandidateRecordInput): Promise<CourseDiscoveryCandidate> {
  const normalizedUrl = normalizeDiscoveryUrl(input.candidate.url);
  if (!normalizedUrl) {
    throw new Error('Candidate URL must be a valid HTTPS URL.');
  }

  const status: DiscoveryCandidateStatus = input.existingCourse ? 'existing' : 'new';
  const rawJson = input.candidate.raw ? JSON.stringify(input.candidate.raw) : null;

  return {
    id: crypto.randomUUID(),
    job_id: input.jobId,
    provider_id: input.providerId,
    normalized_url: normalizedUrl,
    url_hash: await hashDiscoveryUrl(normalizedUrl),
    title: input.candidate.title.trim().slice(0, 500),
    description: input.candidate.description?.trim().slice(0, 2000) || null,
    image_url: normalizeDiscoveryUrl(input.candidate.imageUrl) ?? null,
    detected_content_type: input.candidate.detectedContentType?.trim().slice(0, 80) || null,
    detected_level: input.candidate.detectedLevel?.trim().slice(0, 80) || null,
    free_evidence: input.candidate.freeEvidence?.trim().slice(0, 1000) || null,
    confidence: clampConfidence(input.candidate.confidence),
    status,
    existing_course_id: input.existingCourse?.id ?? null,
    source_url: input.sourceUrl,
    raw_json: rawJson,
    reviewed_by: null,
    reviewed_at: null,
    created_course_id: null,
    created_at: input.now,
    updated_at: input.now,
  };
}

export async function getProviderForDiscovery(db: D1Database, providerId: string): Promise<Provider | null> {
  return db.prepare('SELECT * FROM providers WHERE id = ?').bind(providerId).first<Provider>();
}

export async function getProviderSampleCourses(db: D1Database, providerId: string) {
  const result = await db.prepare(
    `SELECT id, slug, title, official_link, destination_url
     FROM courses
     WHERE provider_id = ?
       AND published_status IN ('published','draft')
       AND (official_link IS NOT NULL OR destination_url IS NOT NULL)
     ORDER BY updated_at DESC
     LIMIT 10`
  ).bind(providerId).all<{
    id: string;
    slug: string;
    title: string;
    official_link: string | null;
    destination_url: string | null;
  }>();
  return result.results;
}

export async function createDiscoveryJob(db: D1Database, input: {
  providerId: string;
  adminUserId: string;
  strategyId: string;
  sourceUrl: string | null;
  requestedLimit: number;
  now: string;
}): Promise<CourseDiscoveryJob> {
  const job: CourseDiscoveryJob = {
    id: crypto.randomUUID(),
    provider_id: input.providerId,
    admin_user_id: input.adminUserId,
    status: 'running',
    strategy_id: input.strategyId,
    source_url: input.sourceUrl,
    requested_limit: input.requestedLimit,
    found_count: 0,
    new_count: 0,
    existing_count: 0,
    error_message: null,
    started_at: input.now,
    finished_at: null,
    created_at: input.now,
    updated_at: input.now,
  };

  await db.prepare(
    `INSERT INTO course_discovery_jobs (
      id, provider_id, admin_user_id, status, strategy_id, source_url, requested_limit,
      found_count, new_count, existing_count, error_message, started_at, finished_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    job.id,
    job.provider_id,
    job.admin_user_id,
    job.status,
    job.strategy_id,
    job.source_url,
    job.requested_limit,
    job.found_count,
    job.new_count,
    job.existing_count,
    job.error_message,
    job.started_at,
    job.finished_at,
    job.created_at,
    job.updated_at
  ).run();

  return job;
}

export async function finalizeDiscoveryJob(db: D1Database, input: {
  jobId: string;
  status: DiscoveryJobStatus;
  foundCount: number;
  newCount: number;
  existingCount: number;
  errorMessage?: string | null;
  now: string;
}): Promise<CourseDiscoveryJob | null> {
  await db.prepare(
    `UPDATE course_discovery_jobs
     SET status = ?, found_count = ?, new_count = ?, existing_count = ?,
         error_message = ?, finished_at = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    input.status,
    input.foundCount,
    input.newCount,
    input.existingCount,
    input.errorMessage ?? null,
    input.now,
    input.now,
    input.jobId
  ).run();

  return getDiscoveryJob(db, input.jobId);
}

export async function getDiscoveryJob(db: D1Database, jobId: string): Promise<CourseDiscoveryJob | null> {
  return db.prepare('SELECT * FROM course_discovery_jobs WHERE id = ?').bind(jobId).first<CourseDiscoveryJob>();
}

export async function findExistingCourseForUrl(db: D1Database, normalizedUrl: string, originalUrl: string): Promise<ExistingCourseMatch | null> {
  const direct = await db.prepare(
    `SELECT id, slug FROM courses
     WHERE official_link IN (?, ?) OR destination_url IN (?, ?)
     ORDER BY published_status = 'published' DESC
     LIMIT 1`
  ).bind(normalizedUrl, originalUrl, normalizedUrl, originalUrl).first<ExistingCourseMatch>();
  return direct ?? null;
}

export async function upsertDiscoveryCandidate(db: D1Database, record: CourseDiscoveryCandidate): Promise<void> {
  await db.prepare(
    `INSERT INTO course_discovery_candidates (
      id, job_id, provider_id, normalized_url, url_hash, title, description, image_url,
      detected_content_type, detected_level, free_evidence, confidence, status,
      existing_course_id, source_url, raw_json, reviewed_by, reviewed_at,
      created_course_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider_id, url_hash) DO UPDATE SET
      job_id = excluded.job_id,
      title = excluded.title,
      description = excluded.description,
      image_url = excluded.image_url,
      detected_content_type = excluded.detected_content_type,
      detected_level = excluded.detected_level,
      free_evidence = excluded.free_evidence,
      confidence = excluded.confidence,
      status = CASE
        WHEN course_discovery_candidates.status IN ('approved','ignored','rejected')
          THEN course_discovery_candidates.status
        ELSE excluded.status
      END,
      existing_course_id = COALESCE(excluded.existing_course_id, course_discovery_candidates.existing_course_id),
      source_url = excluded.source_url,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at`
  ).bind(
    record.id,
    record.job_id,
    record.provider_id,
    record.normalized_url,
    record.url_hash,
    record.title,
    record.description,
    record.image_url,
    record.detected_content_type,
    record.detected_level,
    record.free_evidence,
    record.confidence,
    record.status,
    record.existing_course_id,
    record.source_url,
    record.raw_json,
    record.reviewed_by,
    record.reviewed_at,
    record.created_course_id,
    record.created_at,
    record.updated_at
  ).run();
}

export async function listDiscoveryCandidates(db: D1Database, input: {
  providerId: string;
  status?: DiscoveryCandidateStatus | null;
  limit: number;
}): Promise<CourseDiscoveryCandidate[]> {
  const limit = Math.min(Math.max(input.limit, 1), 100);
  if (input.status) {
    const result = await db.prepare(
      `SELECT * FROM course_discovery_candidates
       WHERE provider_id = ? AND status = ?
       ORDER BY updated_at DESC
       LIMIT ?`
    ).bind(input.providerId, input.status, limit).all<CourseDiscoveryCandidate>();
    return result.results;
  }

  const result = await db.prepare(
    `SELECT * FROM course_discovery_candidates
     WHERE provider_id = ?
     ORDER BY updated_at DESC
     LIMIT ?`
  ).bind(input.providerId, limit).all<CourseDiscoveryCandidate>();
  return result.results;
}

export async function getCandidateCounts(db: D1Database, providerId: string): Promise<CandidateCounts> {
  const result = await db.prepare(
    `SELECT status, COUNT(*) AS count
     FROM course_discovery_candidates
     WHERE provider_id = ?
     GROUP BY status`
  ).bind(providerId).all<{ status: DiscoveryCandidateStatus; count: number }>();

  const counts: CandidateCounts = {
    total: 0,
    new: 0,
    existing: 0,
    approved: 0,
    ignored: 0,
    rejected: 0,
    stale: 0,
    failed: 0,
  };

  for (const row of result.results) {
    counts[row.status] = row.count;
    counts.total += row.count;
  }

  return counts;
}

export async function getLatestDiscoveryJob(db: D1Database, providerId: string): Promise<CourseDiscoveryJob | null> {
  return db.prepare(
    `SELECT * FROM course_discovery_jobs
     WHERE provider_id = ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(providerId).first<CourseDiscoveryJob>();
}

export async function getDiscoveryCandidate(db: D1Database, candidateId: string): Promise<CourseDiscoveryCandidate | null> {
  return db.prepare('SELECT * FROM course_discovery_candidates WHERE id = ?').bind(candidateId).first<CourseDiscoveryCandidate>();
}

export async function updateCandidateStatus(db: D1Database, input: {
  candidateId: string;
  status: DiscoveryCandidateStatus;
  reviewedBy: string | null;
  createdCourseId?: string | null;
  now: string;
}): Promise<void> {
  await db.prepare(
    `UPDATE course_discovery_candidates
     SET status = ?, reviewed_by = ?, reviewed_at = ?, created_course_id = COALESCE(?, created_course_id), updated_at = ?
     WHERE id = ?`
  ).bind(
    input.status,
    input.reviewedBy,
    input.reviewedBy ? input.now : null,
    input.createdCourseId ?? null,
    input.now,
    input.candidateId
  ).run();
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0.5;
  return Math.max(0, Math.min(1, n));
}
