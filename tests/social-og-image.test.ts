import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  articleSocialImageUrl,
  courseSocialImageUrl,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_WIDTH,
} from '../src/lib/social-meta.ts';

test('article social image URLs are crawler-friendly PNG paths with render cache busting', () => {
  const url = articleSocialImageUrl('test-insight', '2026-07-05T11:16:16.007Z');

  assert.equal(
    url,
    'https://learn.bytesai.uk/api/og/article/test-insight/20260705T111616007Zr4.png',
  );
  assert.doesNotMatch(url, /\?/);
  assert.match(url, /\.png$/);
});

test('course social image URLs use the current render version', () => {
  assert.equal(
    courseSocialImageUrl('test-course'),
    'https://learn.bytesai.uk/api/og/course/test-course/cardr4.png',
  );
});

test('social image dimensions match large-card crawler expectations', () => {
  assert.equal(SOCIAL_IMAGE_WIDTH, 1200);
  assert.equal(SOCIAL_IMAGE_HEIGHT, 630);
});

test('dynamic OG route emits truecolor PNG data instead of indexed-palette PNG', () => {
  const source = readFileSync('src/app/api/og/route.ts', 'utf8');

  assert.match(source, /function encodePngRgb/);
  assert.match(source, /pngChunk\('IHDR', ihdr\(width, height, 2\)\)/);
  assert.doesNotMatch(source, /pngChunk\('PLTE'/);
});

test('dynamic OG route preserves mixed-case text for more readable card typography', () => {
  const source = readFileSync('src/app/api/og/route.ts', 'utf8');

  assert.match(source, /a:\s*\['00000', '00000', '01110'/);
  assert.match(source, /z:\s*\['00000', '00000', '11111'/);
  assert.doesNotMatch(source, /\.toUpperCase\(\)/);
});
