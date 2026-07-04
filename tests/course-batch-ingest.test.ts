import assert from 'node:assert/strict';
import test from 'node:test';
import { ingestCourseBatch, parseCourseBatchText } from '../src/lib/admin/course-batch-ingest.ts';

function createFakeDb(seedCourses) {
  const courses = seedCourses.map(course => ({ ...course }));
  return {
    courses,
    prepare(query) {
      return {
        bindings: [],
        bind(...values) {
          this.bindings = values;
          return this;
        },
        async first() {
          if (query.includes('WHERE official_link = ?')) {
            return courses.find(course => course.official_link === this.bindings[0]) ?? null;
          }
          if (query.includes('WHERE provider_id = ? AND slug = ?')) {
            return courses.find(course => course.provider_id === this.bindings[0] && course.slug === this.bindings[1]) ?? null;
          }
          return null;
        },
        async all() {
          if (query.includes('WHERE provider_id = ? AND published_status != ?')) {
            return {
              results: courses.filter(course => course.provider_id === this.bindings[0] && course.published_status !== this.bindings[1]),
              success: true,
              meta: { duration: 0 },
            };
          }
          if (query.includes('WHERE provider_id = ?')) {
            return {
              results: courses.filter(course => course.provider_id === this.bindings[0]),
              success: true,
              meta: { duration: 0 },
            };
          }
          return { results: [], success: true, meta: { duration: 0 } };
        },
        async run() {
          if (query.startsWith('UPDATE courses SET published_status = ?')) {
            const course = courses.find(item => item.id === this.bindings[2]);
            if (course) {
              course.published_status = this.bindings[0];
              course.updated_at = this.bindings[1];
            }
            return { results: [], success: true, meta: { duration: 0, changes: course ? 1 : 0 } };
          }

          if (query.startsWith('UPDATE courses SET ')) {
            const id = this.bindings[this.bindings.length - 1];
            const course = courses.find(item => item.id === id);
            if (course) {
              const fields = query
                .slice('UPDATE courses SET '.length, query.indexOf(' WHERE id = ?'))
                .split(', ')
                .map(part => part.split(' = ')[0]);
              fields.forEach((field, index) => {
                course[field] = this.bindings[index];
              });
            }
            return { results: [], success: true, meta: { duration: 0, changes: course ? 1 : 0 } };
          }

          return { results: [], success: true, meta: { duration: 0, changes: 0 } };
        },
      };
    },
    async exec() {
      return { count: 0, duration: 0 };
    },
    async batch() {
      return [];
    },
  };
}

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

test('refresh mode updates an existing provider course matched by normalized title', async () => {
  const db = createFakeDb([
    {
      id: 'c-ant-01',
      slug: 'claude-101',
      title: 'Claude 101',
      provider_id: 'prov-anthropic',
      official_link: null,
      snippet: 'Old brief',
      long_description: null,
      category: 'AI Foundations',
      subcategory: null,
      level: 'Beginner',
      content_type: 'course',
      published_status: 'published',
    },
  ]);

  const result = await ingestCourseBatch({
    db,
    adminUserId: 'usr-admin',
    updateExisting: true,
    providerId: 'prov-anthropic',
    courses: [
      {
        source_row: 1,
        title: 'Claude 101',
        slug: 'claude-101',
        content_type: 'course',
        provider_id: 'prov-anthropic',
        category: 'AI Foundations',
        level: 'Beginner',
        snippet: 'Updated brief',
        official_link: 'https://anthropic.skilljar.com/claude-101',
        published_status: 'published',
      },
    ],
  });

  assert.equal(result.summary.updated, 1);
  assert.equal(result.results[0].status, 'updated');
  assert.equal(db.courses[0].official_link, 'https://anthropic.skilljar.com/claude-101');
  assert.equal(db.courses[0].snippet, 'Updated brief');
});

test('refresh mode reports archive candidates without archiving by default', async () => {
  const db = createFakeDb([
    {
      id: 'c-ant-01',
      slug: 'claude-101',
      title: 'Claude 101',
      provider_id: 'prov-anthropic',
      official_link: 'https://anthropic.skilljar.com/claude-101',
      snippet: 'Current',
      long_description: null,
      category: 'AI Foundations',
      subcategory: null,
      level: 'Beginner',
      content_type: 'course',
      published_status: 'published',
    },
    {
      id: 'c-ant-old',
      slug: 'old-course',
      title: 'Old Course',
      provider_id: 'prov-anthropic',
      official_link: 'https://anthropic.skilljar.com/old-course',
      snippet: 'No longer listed',
      long_description: null,
      category: 'AI Foundations',
      subcategory: null,
      level: 'Beginner',
      content_type: 'course',
      published_status: 'published',
    },
  ]);

  const result = await ingestCourseBatch({
    db,
    adminUserId: 'usr-admin',
    updateExisting: true,
    providerId: 'prov-anthropic',
    courses: [
      {
        source_row: 1,
        title: 'Claude 101',
        slug: 'claude-101',
        content_type: 'course',
        provider_id: 'prov-anthropic',
        category: 'AI Foundations',
        level: 'Beginner',
        snippet: 'Current',
        official_link: 'https://anthropic.skilljar.com/claude-101',
        published_status: 'published',
      },
    ],
  });

  assert.equal(result.summary.archiveCandidates, 1);
  assert.equal(result.results.at(-1)?.status, 'archive_candidate');
  assert.equal(db.courses[1].published_status, 'published');
});
