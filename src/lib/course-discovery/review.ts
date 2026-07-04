import type { D1Database } from '@/lib/db';
import { logAdminAction } from '@/lib/db';
import { createCourseFromAdminInput } from '@/lib/admin/course-ingest';
import type { DiscoveryReviewAction } from './types.ts';
import { getDiscoveryCandidate, updateCandidateStatus } from './store.ts';

export async function reviewDiscoveryCandidate(
  db: D1Database,
  adminUserId: string,
  candidateId: string,
  action: DiscoveryReviewAction
) {
  const candidate = await getDiscoveryCandidate(db, candidateId);
  if (!candidate) throw new Error('Candidate not found.');

  const nextStatus = action === 'restore'
    ? (candidate.existing_course_id ? 'existing' : 'new')
    : action === 'ignore'
      ? 'ignored'
      : 'rejected';

  await updateCandidateStatus(db, {
    candidateId,
    status: nextStatus,
    reviewedBy: action === 'restore' ? null : adminUserId,
    now: new Date().toISOString(),
  });

  await logAdminAction(db, {
    adminUserId,
    actionType: `DISCOVERY_${action.toUpperCase()}`,
    entityType: 'course_discovery_candidate',
    entityId: candidateId,
    before: { status: candidate.status },
    after: { status: nextStatus },
  }).catch(() => null);

  return getDiscoveryCandidate(db, candidateId);
}

export async function approveDiscoveryCandidate(
  db: D1Database,
  adminUserId: string,
  candidateId: string,
  overrides: Record<string, unknown>
) {
  const candidate = await getDiscoveryCandidate(db, candidateId);
  if (!candidate) throw new Error('Candidate not found.');
  if (candidate.status === 'approved' && candidate.created_course_id) {
    return { candidate, course: { id: candidate.created_course_id, slug: null }, existed: true };
  }

  const result = await createCourseFromAdminInput(db, adminUserId, {
    title: overrides.title || candidate.title,
    official_link: candidate.normalized_url,
    provider_id: candidate.provider_id,
    snippet: overrides.snippet || candidate.description || undefined,
    category: overrides.category || undefined,
    content_type: overrides.contentType || candidate.detected_content_type || 'course',
    level: overrides.level || candidate.detected_level || undefined,
    og_image_url: candidate.image_url || undefined,
    published_status: 'draft',
  });

  if (!result.body.ok || !result.body.course) {
    throw new Error(result.body.error ?? 'Failed to create draft course.');
  }

  await updateCandidateStatus(db, {
    candidateId,
    status: 'approved',
    reviewedBy: adminUserId,
    createdCourseId: result.body.course.id,
    now: new Date().toISOString(),
  });

  await logAdminAction(db, {
    adminUserId,
    actionType: 'DISCOVERY_APPROVE',
    entityType: 'course_discovery_candidate',
    entityId: candidateId,
    before: { status: candidate.status },
    after: { status: 'approved', courseId: result.body.course.id, slug: result.body.course.slug },
  }).catch(() => null);

  return {
    candidate: await getDiscoveryCandidate(db, candidateId),
    course: result.body.course,
    existed: result.body.existed === true,
  };
}
