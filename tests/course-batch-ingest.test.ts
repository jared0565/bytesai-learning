import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCourseBatchText } from '../src/lib/admin/course-batch-ingest.ts';

test('parses JSON courses and requires a short brief', () => {
  const result = parseCourseBatchText(JSON.stringify({
    courses: [
      {
        title: 'AI Boost Bites',
        brief: 'Short Google Skills lessons for practical AI productivity.',
        url: 'https://www.skills.google/paths/2480',
        provider_id: 'prov-google',
        published_status: 'published',
      },
      {
        title: 'Missing Brief',
        url: 'https://example.com/course',
      },
    ],
  }));

  assert.equal(result.courses.length, 1);
  assert.equal(result.courses[0].title, 'AI Boost Bites');
  assert.equal(result.courses[0].snippet, 'Short Google Skills lessons for practical AI productivity.');
  assert.equal(result.courses[0].official_link, 'https://www.skills.google/paths/2480');
  assert.equal(result.courses[0].published_status, 'published');
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].error, 'short brief is required. Add brief or snippet.');
});

test('parses Markdown course sections', () => {
  const markdown = `
# Google AI Courses

## Make AI Work for You
- URL: https://www.youtube.com/playlist?list=PLTZYG7bZ1u6pjtxBt4IQxPTYVH7J2dwOo
- Brief: A Google YouTube learning series for practical workplace AI.
- Provider ID: prov-google
- Category: AI Foundations
- Level: Beginner
- Status: published
`;

  const result = parseCourseBatchText(markdown, 'google-ai.md');

  assert.deepEqual(result.issues, []);
  assert.equal(result.courses.length, 1);
  assert.equal(result.courses[0].title, 'Make AI Work for You');
  assert.equal(result.courses[0].provider_id, 'prov-google');
  assert.equal(result.courses[0].category, 'AI Foundations');
  assert.equal(result.courses[0].published_status, 'published');
});

test('parses fenced JSON from Markdown', () => {
  const markdown = `
# Import

\`\`\`json
[
  {
    "title": "Introduction to Large Language Models",
    "brief": "A Google Skills course introducing LLMs and prompt tuning.",
    "official_link": "https://www.skills.google/course_templates/539"
  }
]
\`\`\`
`;

  const result = parseCourseBatchText(markdown, 'courses.md', { publishedStatus: 'draft' });

  assert.deepEqual(result.issues, []);
  assert.equal(result.courses[0].title, 'Introduction to Large Language Models');
  assert.equal(result.courses[0].published_status, 'draft');
  assert.equal(result.courses[0].content_type, 'course');
});
