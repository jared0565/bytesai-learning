/**
 * Verifies the trend-engine 24h age window + parseDate fix against the real
 * rss-parser code. Bundles verify-trend-window.entry.ts with esbuild
 * (transitive dep of next) and runs it.
 * Usage: node scripts/verify-trend-window.mjs
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unlinkSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, 'verify-trend-window.entry.ts');
const out = path.join(here, '.verify-trend-window.bundle.mjs');

await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  logLevel: 'silent',
});

try {
  execFileSync(process.execPath, [out], { stdio: 'inherit' });
} finally {
  unlinkSync(out);
}
