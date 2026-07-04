import { logAdminAction } from '@/lib/db';
import type { D1Database } from '@/lib/db';
import type { CourseDiscoveryCandidate, RunDiscoveryOptions, RunDiscoveryResult } from './types.ts';
import { normalizeDiscoveryUrl } from './url.ts';
import { selectDiscoveryStrategy } from './strategies.ts';
import {
  buildCandidateRecord,
  createDiscoveryJob,
  finalizeDiscoveryJob,
  findExistingCourseForUrl,
  getCandidateCounts,
  getDiscoveryJob,
  getProviderForDiscovery,
  getProviderSampleCourses,
  listDiscoveryCandidates,
  upsertDiscoveryCandidate,
} from './store.ts';

export async function runProviderDiscovery(
  db: D1Database,
  adminUserId: string,
  providerId: string,
  opts: RunDiscoveryOptions
): Promise<RunDiscoveryResult> {
  const provider = await getProviderForDiscovery(db, providerId);
  if (!provider) {
    throw new Error('Provider not found.');
  }

  const sampleCourses = await getProviderSampleCourses(db, providerId);
  const strategy = selectDiscoveryStrategy(provider, opts.strategyId);
  const requestedLimit = Math.min(Math.max(Number(opts.limit) || 25, 1), 50);
  const defaultSourceUrl = strategy.getDefaultSourceUrl({ provider, sampleCourses });
  const sourceUrl = opts.sourceUrl ? normalizeDiscoveryUrl(opts.sourceUrl) : defaultSourceUrl;

  if (!sourceUrl) {
    throw new Error('No valid HTTPS discovery source URL is available for this provider.');
  }

  const startedAt = new Date().toISOString();
  const job = await createDiscoveryJob(db, {
    providerId,
    adminUserId,
    strategyId: strategy.id,
    sourceUrl,
    requestedLimit,
    now: startedAt,
  });

  await logAdminAction(db, {
    adminUserId,
    actionType: 'RUN_DISCOVERY',
    entityType: 'provider',
    entityId: providerId,
    after: { jobId: job.id, strategyId: strategy.id, sourceUrl, requestedLimit },
  }).catch(() => null);

  try {
    const discovered = await strategy.discover({
      db,
      provider,
      sampleCourses,
      sourceUrl,
      limit: requestedLimit,
    });

    const now = new Date().toISOString();
    const records: CourseDiscoveryCandidate[] = [];
    const seen = new Set<string>();

    for (const candidate of discovered) {
      const normalizedUrl = normalizeDiscoveryUrl(candidate.url);
      if (!normalizedUrl || seen.has(normalizedUrl)) continue;
      seen.add(normalizedUrl);

      const existingCourse = await findExistingCourseForUrl(db, normalizedUrl, candidate.url);
      const record = await buildCandidateRecord({
        candidate,
        existingCourse,
        jobId: job.id,
        providerId,
        sourceUrl,
        now,
      });
      await upsertDiscoveryCandidate(db, record);
      records.push(record);
    }

    const newCount = records.filter(record => record.status === 'new').length;
    const existingCount = records.filter(record => record.status === 'existing').length;
    const finalJob = await finalizeDiscoveryJob(db, {
      jobId: job.id,
      status: 'succeeded',
      foundCount: records.length,
      newCount,
      existingCount,
      now: new Date().toISOString(),
    }) ?? job;

    return {
      provider,
      job: finalJob,
      counts: await getCandidateCounts(db, providerId),
      candidates: await listDiscoveryCandidates(db, { providerId, status: null, limit: 50 }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Discovery failed.';
    await finalizeDiscoveryJob(db, {
      jobId: job.id,
      status: 'failed',
      foundCount: 0,
      newCount: 0,
      existingCount: 0,
      errorMessage: message,
      now: new Date().toISOString(),
    }).catch(() => null);
    throw err;
  }
}

export async function getProviderDiscoveryState(
  db: D1Database,
  providerId: string,
  opts: { status?: string | null; limit?: number }
) {
  const provider = await getProviderForDiscovery(db, providerId);
  if (!provider) return null;

  const latestJob = await getDiscoveryJobForProvider(db, providerId);
  const status = isCandidateStatus(opts.status) ? opts.status : null;
  const candidates = await listDiscoveryCandidates(db, {
    providerId,
    status,
    limit: Math.min(Math.max(Number(opts.limit) || 50, 1), 100),
  });

  return {
    provider,
    latestJob,
    counts: await getCandidateCounts(db, providerId),
    candidates,
  };
}

async function getDiscoveryJobForProvider(db: D1Database, providerId: string) {
  const latest = await db.prepare(
    `SELECT id FROM course_discovery_jobs
     WHERE provider_id = ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(providerId).first<{ id: string }>();
  return latest ? getDiscoveryJob(db, latest.id) : null;
}

function isCandidateStatus(status: unknown): status is 'new' | 'existing' | 'approved' | 'ignored' | 'rejected' | 'stale' | 'failed' {
  return typeof status === 'string' && ['new', 'existing', 'approved', 'ignored', 'rejected', 'stale', 'failed'].includes(status);
}
