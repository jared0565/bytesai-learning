# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Deployment: Cloudflare Workers via @opennextjs/cloudflare

## CRITICAL: Webpack only — never Turbopack

The production build MUST use `next build --webpack`. This is enforced in `package.json`.

**DO NOT** remove `--webpack` from the build command or switch to Turbopack.

Turbopack (Next.js 16 default) produces chunk filenames (`[root-of-the-server]__hash._.js`) that are incompatible with OpenNext's chunk loader inside Cloudflare Workers. The result is `Failed to load chunk` errors and 500 on every route. This was debugged and fixed on 2026-04-01.

Other deployment rules:
- Use `middleware.ts`, not `proxy.ts` — OpenNext does not support the Next.js 16 proxy convention yet
- `export const runtime = 'edge'` is NOT needed — the Worker uses `nodejs_compat`
- `@cloudflare/next-on-pages` is deprecated and incompatible — never use it
- `--no-turbopack` flag does not exist — use `--webpack` explicitly

# D1 Database — CRITICAL

**NEVER run `wrangler d1 execute` or any wrangler D1 command.** Wrangler is not authenticated in this environment and will always fail with exit code 1.

All D1 operations must go through the Cowork session:
- Write the `.sql` file as normal
- Then stop and tell the user: *"Please run this migration in Cowork — wrangler is not available here."*
- Do NOT attempt to execute it yourself

This applies to: `ALTER TABLE`, `CREATE TABLE`, `INSERT`, `UPDATE` on production data, and any file in `db/`.
