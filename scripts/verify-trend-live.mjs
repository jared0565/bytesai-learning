/**
 * Manual live smoke test — hits real RSS feeds over the network.
 * Not part of automated verification (network-dependent, slow, non-deterministic).
 * Usage: node scripts/verify-trend-live.mjs
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unlinkSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, 'verify-trend-live.entry.ts');
const out = path.join(here, '.verify-trend-live.bundle.mjs');

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
