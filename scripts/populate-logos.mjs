#!/usr/bin/env node
/**
 * Standalone script to populate provider logo_url values.
 *
 * Usage:
 *   node scripts/populate-logos.mjs --dry-run   # preview only
 *   node scripts/populate-logos.mjs             # apply changes
 *   node scripts/populate-logos.mjs --force     # overwrite existing
 *
 * Requires BYTESAI_CLI_TOKEN in environment.
 *   export BYTESAI_CLI_TOKEN=your_token_here
 */

import process from 'process';

const token = process.env.BYTESAI_CLI_TOKEN;
if (!token) {
  console.error('BYTESAI_CLI_TOKEN is not set in your environment.');
  console.error('Set it first: export BYTESAI_CLI_TOKEN=your_token_here');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

const dryRunText = dryRun ? '\n  ⚠️ DRY RUN — no DB changes made' : '';
const forceText = force ? '\n  ⚠️ FORCE — overwriting existing logo_url values' : '';
console.log(`Running provider logo population…${dryRunText}${forceText}\n`);

const url = 'https://learn.bytesai.uk/api/admin/provider-logos';

fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dryRun, force }),
})
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('Failed:', err.message);
    process.exit(1);
  });
