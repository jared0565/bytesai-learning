/**
 * Verification entry for the trend-engine naive-fill path.
 * Bundled with esbuild and run by verify-trend-fill.mjs — not shipped.
 */
import { cleanArticleText, autoFillPageFromArticle, type ParsedArticle } from '../src/lib/rss-parser';

const para = (n: number) =>
  `Paragraph ${n} of the sample article contains enough meaningful prose to pass the sixty character minimum filter easily.`;

// 6 paragraphs, one short sentence, one exact duplicate sentence
const html = `
<div class="c-entry-content">
  <p>${para(1)}</p>
  <p>${para(2)} It worked.</p>
  <p>${para(3)}</p>
  <p>${para(4)}</p>
  <p>${para(5)}</p>
  <p>${para(6)} ${para(6)}</p>
</div>`;

const text = cleanArticleText(html);

const article: ParsedArticle = {
  sourceId: 'test',
  sourceName: 'Test Source',
  sourceTier: 1,
  title: 'Sample Article Title For Verification',
  url: 'https://example.com/sample',
  publishedAt: new Date().toISOString(),
  contentText: text,
  contentLength: text.length,
  isComplete: text.length >= 800,
  score: 0,
};

const filled = autoFillPageFromArticle(article);

const checks: Array<{ name: string; pass: boolean; detail: string }> = [
  {
    name: 'paragraph breaks preserved',
    pass: text.includes('\n\n'),
    detail: `contentText has ${(text.match(/\n\n/g) ?? []).length} paragraph breaks`,
  },
  {
    name: 'short sentence survives',
    pass: text.includes('It worked.'),
    detail: text.includes('It worked.') ? 'found' : 'MISSING',
  },
  {
    name: 'duplicate sentence removed',
    pass: (text.match(new RegExp(para(6).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length === 1,
    detail: `paragraph-6 sentence appears ${(text.match(new RegExp(para(6).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length} time(s)`,
  },
  {
    name: 'summary non-empty',
    pass: filled.summary.length > 0,
    detail: `${filled.summary.length} chars`,
  },
  {
    name: 'whyItMatters non-empty',
    pass: filled.whyItMatters.length > 0,
    detail: `${filled.whyItMatters.length} chars`,
  },
  {
    name: 'whatChanged non-empty',
    pass: filled.whatChanged.length > 0,
    detail: `${filled.whatChanged.length} chars`,
  },
  {
    name: 'executiveImplications non-empty',
    pass: filled.executiveImplications.length > 0,
    detail: `${filled.executiveImplications.length} chars`,
  },
  {
    name: 'summary is not the whole article',
    pass: filled.summary.length < text.length * 0.6,
    detail: `summary ${filled.summary.length} / total ${text.length} chars`,
  },
];

let failed = 0;
for (const c of checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`);
  if (!c.pass) failed++;
}
process.exit(failed === 0 ? 0 : 1);
