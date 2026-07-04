import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCandidateRecord } from '../src/lib/course-discovery/store.ts';

test('builds a new candidate record from normalized discovery facts', async () => {
  const now = '2026-07-03T20:30:00.000Z';
  const record = await buildCandidateRecord({
    candidate: {
      title: 'Google AI Essentials',
      url: 'https://grow.google/intl/en/courses-and-tools/?utm_campaign=social',
      description: 'A free introductory AI course from Google.',
      imageUrl: 'https://grow.google/image.png',
      detectedContentType: 'course',
      detectedLevel: 'Beginner',
      freeEvidence: 'Provider catalog lists it as no-cost.',
      confidence: 0.82,
      raw: { strategy: 'google-cloud-skills' },
    },
    existingCourse: null,
    jobId: 'job-1',
    providerId: 'prov-google',
    sourceUrl: 'https://grow.google/intl/en/courses-and-tools/',
    now,
  });

  assert.equal(record.status, 'new');
  assert.equal(record.provider_id, 'prov-google');
  assert.equal(record.job_id, 'job-1');
  assert.equal(record.normalized_url, 'https://grow.google/intl/en/courses-and-tools');
  assert.equal(record.existing_course_id, null);
  assert.equal(record.raw_json, '{"strategy":"google-cloud-skills"}');
});

test('marks a candidate as existing when it matches a stored course', async () => {
  const record = await buildCandidateRecord({
    candidate: {
      title: 'Intro to AI',
      url: 'https://example.com/course/intro-ai',
      confidence: 0.7,
    },
    existingCourse: { id: 'crs-1', slug: 'intro-ai' },
    jobId: 'job-1',
    providerId: 'prov-example',
    sourceUrl: null,
    now: '2026-07-03T20:30:00.000Z',
  });

  assert.equal(record.status, 'existing');
  assert.equal(record.existing_course_id, 'crs-1');
});
