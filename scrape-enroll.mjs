// Playwright script — scrapes Alison enrollment counts and updates production D1
// Run from: F:\Projects\BytesAI Learning\
// Usage: node scrape-enroll.mjs

import { chromium } from 'playwright';
import { execSync } from 'child_process';

const ALISON_SLUGS = [
  'affective-artificial-intelligence',
  'ai-governance-and-ethics',
  'ai-in-cybersecurity-vulnerability-intelligence-security-and-ethics',
  'ai-risk-management-and-incident-response',
  'artificial-intelligence-for-beginners',
  'basics-of-prompt-engineering',
  'chatgpt-and-ai-masterclass-prompt-engineering',
  'comprehensive-guide-to-harnessing-gemini-ai',
  'diploma-in-ai-ethics-navigating-the-moral-compass-of-business-ai',
  'diploma-in-ai-for-healthcare-professionals',
  'diploma-in-applied-generative-ai',
  'generative-ai-and-large-language-models-for-beginners',
  'introduction-to-artificial-intelligence-ai',
  'introduction-to-artificial-intelligence-and-problem-solving',
  'machine-learning-and-advanced-ai-techniques',
  'machine-learning-essentials-and-backpropagation-algorithm',
  'machine-learning-for-absolute-beginners',
  'machine-learning-with-artificial-intelligence',
  'managing-ai-governance-in-organizations-with-iso-42001',
  'master-course-in-generative-ai-artificial-intelligence',
  'prompt-engineering-for-ai-applications',
  'prompt-engineering-with-generative-ai',
  'securing-large-language-models-llms',
  'the-fundamentals-of-chat-gpt-ai-language-model',
  'vibe-coding-basics',
];

function parseCount(text) {
  if (!text) return null;
  const clean = text.replace(/[,\s]/g, '').trim();
  if (!clean || clean === '-' || clean === '') return null;
  const n = parseInt(clean, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

async function scrapeEnrollCount(page, slug) {
  const url = `https://alison.com/course/${slug}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for enrollment element to populate (JS replaces "-" with actual number)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('.course-enrolled');
        return el && el.textContent.trim() !== '-' && el.textContent.trim() !== '';
      },
      { timeout: 8000 }
    ).catch(() => {}); // ok if it times out — might still have the value

    const count = await page.evaluate(() => {
      // Try primary enrollment counter
      const el = document.querySelector('.course-enrolled');
      if (el) return el.textContent.trim();
      // Try publisher-enrollments fallback
      const pub = document.querySelector('.publisher-enrollments');
      if (pub) return pub.textContent.trim();
      return null;
    });

    const n = parseCount(count);
    console.log(`  ${slug}: "${count}" → ${n ?? 'null'}`);
    return n;
  } catch (e) {
    console.log(`  ${slug}: ERROR — ${e.message}`);
    return null;
  }
}

function updateD1(slug, count) {
  const sql = `UPDATE courses SET enroll_count = ${count} WHERE slug = '${slug}' AND is_alison = 1`;
  try {
    execSync(
      `npx wrangler d1 execute bytesai-learning-db --remote --command="${sql}"`,
      { cwd: 'F:\\Projects\\BytesAI Learning\\app', stdio: 'pipe' }
    );
    return true;
  } catch (e) {
    console.error(`  DB update failed for ${slug}:`, e.message.slice(0, 120));
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  console.log(`\nScraping enrollment counts for ${ALISON_SLUGS.length} Alison courses...\n`);

  const results = [];
  for (const slug of ALISON_SLUGS) {
    const count = await scrapeEnrollCount(page, slug);
    results.push({ slug, count });
    if (count != null) {
      const ok = updateD1(slug, count);
      if (ok) console.log(`  ✓ Updated D1: ${slug} = ${count}`);
    }
    // Short pause between requests
    await page.waitForTimeout(600);
  }

  await browser.close();

  console.log('\n── Summary ──────────────────────────────────');
  const found = results.filter(r => r.count != null);
  const missing = results.filter(r => r.count == null);
  console.log(`Found: ${found.length}/${ALISON_SLUGS.length}`);
  found.forEach(r => console.log(`  ✓ ${r.slug}: ${r.count.toLocaleString()}`));
  if (missing.length) {
    console.log(`\nMissing (${missing.length}):`);
    missing.forEach(r => console.log(`  ✗ ${r.slug}`));
  }
})();
