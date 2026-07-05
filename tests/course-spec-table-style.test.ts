import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('src/components/ui/CourseSpecTable.tsx', 'utf8');

test('affiliate disclosure uses the readable disclosure class', () => {
  assert.match(source, /className="course-affiliate-disclosure"/);
  assert.doesNotMatch(
    source,
    /Affiliate link[\s\S]{0,250}color:\s*'var\(--text-muted\)'/,
  );
});
