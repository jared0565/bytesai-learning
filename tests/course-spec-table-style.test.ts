import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('src/components/ui/CourseSpecTable.tsx', 'utf8');
const css = readFileSync('src/app/globals.css', 'utf8');

test('affiliate disclosure uses the readable disclosure class', () => {
  assert.match(source, /className="course-affiliate-disclosure"/);
  assert.doesNotMatch(
    source,
    /Affiliate link[\s\S]{0,250}color:\s*'var\(--text-muted\)'/,
  );
});

test('article prose does not override primary course CTA text color', () => {
  assert.match(css, /\.article-prose\s+a\.btn-primary/);
  assert.match(css, /\.article-prose\s+a\.btn-primary[\s\S]{0,180}color:\s*oklch\(0\.99 0\.003 270\)/);
  assert.match(css, /\.article-prose\s+a\.btn-primary[\s\S]{0,180}text-decoration:\s*none/);
});
