import assert from 'node:assert/strict';
import test from 'node:test';
import { hashDiscoveryUrl, normalizeDiscoveryUrl } from '../src/lib/course-discovery/url.ts';

test('normalizes discovery URLs for stable duplicate detection', async () => {
  const first = normalizeDiscoveryUrl(
    'https://Grow.Google/intl/en/courses-and-tools/?utm_source=newsletter&utm_medium=email&x=1#section'
  );
  const second = normalizeDiscoveryUrl('https://grow.google/intl/en/courses-and-tools?x=1');

  assert.equal(first, 'https://grow.google/intl/en/courses-and-tools?x=1');
  assert.equal(second, first);
  assert.equal(await hashDiscoveryUrl(first), await hashDiscoveryUrl(second));
});

test('rejects non-HTTPS discovery URLs', () => {
  assert.equal(normalizeDiscoveryUrl('http://grow.google/intl/en/courses-and-tools'), null);
  assert.equal(normalizeDiscoveryUrl('javascript:alert(1)'), null);
  assert.equal(normalizeDiscoveryUrl('not a url'), null);
});
