#!/usr/bin/env node
/**
 * Post-build script: appends the Cloudflare scheduled event handler to the
 * OpenNext-generated worker.js so Cloudflare cron triggers work.
 *
 * Run after: npx opennextjs-cloudflare build
 * Frequency: wrangler.toml sets hourly — handler checks DB settings to decide
 * whether to actually generate an article (respects Hourly / 2× Daily / Daily).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.resolve(__dirname, '../.open-next/worker.js');

if (!fs.existsSync(workerPath)) {
  console.error('❌ .open-next/worker.js not found — run opennextjs-cloudflare build first');
  process.exit(1);
}

const scheduledHandler = `

// ─── Cloudflare Cron: Automatic Article Generation ───────────────────────────
// Triggered hourly by wrangler.toml [triggers]. Reads DB settings to decide
// whether to actually run based on the admin-configured frequency.

export async function scheduled(event, env, ctx) {
  ctx.waitUntil(runArticleGenCron(env));
}

async function runArticleGenCron(env) {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  console.log('[cron:article-gen] tick', now);

  try {
    const db = env.DB;
    if (!db) { console.log('[cron:article-gen] no DB binding'); return; }

    const rows = await db.prepare(
      "SELECT key, value FROM site_settings WHERE key IN ('article_gen_mode','article_gen_frequency','article_gen_last_run')"
    ).all();

    const settings = {};
    for (const row of (rows.results ?? [])) settings[row.key] = row.value;

    if (settings['article_gen_mode'] !== 'auto') {
      console.log('[cron:article-gen] mode=', settings['article_gen_mode'], '— skip');
      return;
    }

    const frequency = settings['article_gen_frequency'] ?? 'daily';
    if (frequency === 'paused') { console.log('[cron:article-gen] paused — skip'); return; }

    const lastRun = settings['article_gen_last_run'] ? new Date(settings['article_gen_last_run']) : null;
    const minElapsed = {
      hourly:      55 * 60 * 1000,
      twice_daily: 11 * 60 * 60 * 1000,
      daily:       23 * 60 * 60 * 1000,
    }[frequency] ?? 23 * 60 * 60 * 1000;

    if (lastRun && (nowDate.getTime() - lastRun.getTime()) < minElapsed) {
      console.log('[cron:article-gen] too soon since last run:', lastRun.toISOString(), '— skip');
      return;
    }

    const token = env.BYTESAI_CLI_TOKEN;
    if (!token) { console.log('[cron:article-gen] BYTESAI_CLI_TOKEN not set — skip'); return; }

    // Record attempt timestamp so admin can see cron IS firing
    await db.prepare(
      "INSERT INTO site_settings (key, value, updated_at) VALUES ('article_gen_last_cron_attempt', ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at"
    ).bind(now, now).run();

    console.log('[cron:article-gen] calling article-gen API');
    let cronStatus = 'error';
    let cronMsg = '';

    try {
      const resp = await fetch('https://learn.bytesai.uk/api/admin/article-gen', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(90_000),
      });
      cronStatus = String(resp.status);
      const body = await resp.json().catch(() => ({}));
      cronMsg = JSON.stringify(body).slice(0, 300);
      console.log('[cron:article-gen] response', resp.status, cronMsg);
    } catch (fetchErr) {
      cronStatus = 'fetch_error';
      cronMsg = String(fetchErr).slice(0, 200);
      console.log('[cron:article-gen] fetch error:', fetchErr);
    }

    // Store result for admin visibility
    await db.prepare(
      "INSERT INTO site_settings (key, value, updated_at) VALUES ('article_gen_last_cron_result', ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at"
    ).bind(JSON.stringify({ status: cronStatus, msg: cronMsg, at: now }), now).run();

  } catch (err) {
    console.log('[cron:article-gen] unexpected error:', err);
  }
}
`;

const existing = fs.readFileSync(workerPath, 'utf8');

// Avoid double-appending if script is run twice
if (existing.includes('runArticleGenCron')) {
  console.log('ℹ️  Cron handler already present in worker.js — skipping.');
  process.exit(0);
}

fs.writeFileSync(workerPath, existing + scheduledHandler);
console.log('✅ Cron handler appended to .open-next/worker.js');
