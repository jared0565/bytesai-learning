/**
 * Verification entry for the 24-hour age window + parseDate fix.
 * Bundled with esbuild and run by verify-trend-window.mjs — not shipped.
 */
import { parseDate, ageHoursClamped, MAX_AGE_HOURS } from '../src/lib/rss-parser';

const HOUR = 3_600_000;
const now = Date.now();

const checks: Array<{ name: string; pass: boolean; detail: string }> = [];

// ── parseDate: missing/unparseable input never defaults to "now" ──────────
checks.push({
  name: 'parseDate(empty string) returns null',
  pass: parseDate('') === null,
  detail: `got ${JSON.stringify(parseDate(''))}`,
});
checks.push({
  name: 'parseDate(garbage) returns null',
  pass: parseDate('not a date at all') === null,
  detail: `got ${JSON.stringify(parseDate('not a date at all'))}`,
});
checks.push({
  name: 'parseDate(valid RFC-2822) returns an ISO string',
  pass: (() => {
    const d = parseDate('Mon, 27 Jul 2026 10:00:00 GMT');
    return d !== null && !Number.isNaN(new Date(d).getTime());
  })(),
  detail: `got ${JSON.stringify(parseDate('Mon, 27 Jul 2026 10:00:00 GMT'))}`,
});

// ── MAX_AGE_HOURS is the 24h window, not the old 14-day one ───────────────
checks.push({
  name: 'MAX_AGE_HOURS is 24 (not 14 days / 336 hours)',
  pass: MAX_AGE_HOURS === 24,
  detail: `got ${MAX_AGE_HOURS}`,
});

// ── ageHoursClamped: the actual cutoff arithmetic ──────────────────────────
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

checks.push({
  name: '20-hours-ago article is within the 24h window',
  pass: ageHoursClamped(iso(20 * HOUR), now) <= MAX_AGE_HOURS,
  detail: `ageHours=${ageHoursClamped(iso(20 * HOUR), now).toFixed(2)}`,
});
checks.push({
  name: '30-hours-ago article is excluded by the 24h window',
  pass: ageHoursClamped(iso(30 * HOUR), now) > MAX_AGE_HOURS,
  detail: `ageHours=${ageHoursClamped(iso(30 * HOUR), now).toFixed(2)}`,
});
checks.push({
  name: 'exactly-24-hours-ago article is still within the window (inclusive)',
  pass: ageHoursClamped(iso(24 * HOUR), now) <= MAX_AGE_HOURS,
  detail: `ageHours=${ageHoursClamped(iso(24 * HOUR), now).toFixed(2)}`,
});
checks.push({
  name: 'future-dated article (clock skew) clamps to age 0, not negative',
  pass: ageHoursClamped(new Date(now + 5 * HOUR).toISOString(), now) === 0,
  detail: `ageHours=${ageHoursClamped(new Date(now + 5 * HOUR).toISOString(), now)}`,
});
checks.push({
  name: '5-hours-ago article qualifies for the <=6h recency tier',
  pass: ageHoursClamped(iso(5 * HOUR), now) <= 6,
  detail: `ageHours=${ageHoursClamped(iso(5 * HOUR), now).toFixed(2)}`,
});
checks.push({
  name: '18-hours-ago article qualifies for the <=24h (not <=6h) recency tier',
  pass: ageHoursClamped(iso(18 * HOUR), now) > 6 && ageHoursClamped(iso(18 * HOUR), now) <= 24,
  detail: `ageHours=${ageHoursClamped(iso(18 * HOUR), now).toFixed(2)}`,
});

let failed = 0;
for (const c of checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`);
  if (!c.pass) failed++;
}
process.exit(failed === 0 ? 0 : 1);
