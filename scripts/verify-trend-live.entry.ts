/**
 * One-off live smoke check (not part of CI): runs the real
 * fetchTrendingArticles() against RSS_SOURCES over the network and reports
 * how many articles survive the new 24h window. Not run automatically —
 * invoke manually with scripts/verify-trend-live.mjs when validating a
 * source-list or window change.
 */
import { fetchTrendingArticles } from '../src/lib/rss-parser';
import { RSS_SOURCES } from '../src/lib/rss-sources';

const articles = await fetchTrendingArticles(RSS_SOURCES);
console.log(`Total articles within the 24h window: ${articles.length}`);
for (const a of articles.slice(0, 10)) {
  const ageHours = (Date.now() - new Date(a.publishedAt).getTime()) / 3_600_000;
  console.log(`  [score ${a.score}] (${ageHours.toFixed(1)}h old) ${a.sourceName}: ${a.title}`);
}
if (articles.length === 0) {
  console.log('WARNING: zero articles — window may be too tight or all feeds failed.');
  process.exit(1);
}
