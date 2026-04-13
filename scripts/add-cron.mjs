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
  try {
    const db = env.DB;
    if (!db) return;

    // Read article gen settings
    const rows = await db.prepare(
      "SELECT key, value FROM site_settings WHERE key IN ('article_gen_mode','article_gen_frequency','article_gen_last_run')"
    ).all();

    const settings = {};
    for (const row of (rows.results ?? [])) settings[row.key] = row.value;

    // Only run if auto mode is enabled
    if (settings['article_gen_mode'] !== 'auto') return;

    const frequency = settings['article_gen_frequency'] ?? 'daily';
    const lastRun = settings['article_gen_last_run'] ? new Date(settings['article_gen_last_run']) : null;
    const now = new Date();

    // Minimum elapsed time per frequency setting (with 5-min buffer)
    const minElapsed = {
      hourly:   55 * 60 * 1000,        // 55 min
      '2xdaily': 11 * 60 * 60 * 1000,  // 11 hours
      daily:    23 * 60 * 60 * 1000,   // 23 hours
    }[frequency] ?? 23 * 60 * 60 * 1000;

    if (lastRun && (now.getTime() - lastRun.getTime()) < minElapsed) return;

    // Require CLI token — must be set as Worker secret BYTESAI_CLI_TOKEN
    const token = env.BYTESAI_CLI_TOKEN;
    if (!token) return;

    // Call the article-gen endpoint using the long-lived admin Bearer token
    await fetch('https://learn.bytesai.uk/api/admin/article-gen', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(40_000),
    });
  } catch {
    // Silent — cron errors must never crash the Worker
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
