# GitHub Actions Node Runtime Fix

## Objective
Make the production deployment path deterministic through GitHub Actions by ensuring the workflow runtime can execute the existing TypeScript tests before deploying to Cloudflare Workers.

## Context
- Deployment is intentionally routed through GitHub Actions, not local `npm run deploy`.
- The deploy workflow currently uses Node 20.
- The workflow test command runs `node --test tests/*.test.ts`.
- Local verification passed with TypeScript test execution support, but Node 20 runners can fail on raw `.ts` tests.

## Plan
1. Update `.github/workflows/deploy.yml` to use Node 24 in Actions.
2. Keep the existing test, build, and Cloudflare deploy steps unchanged.
3. Run the existing test command locally.
4. Commit only the workflow/runtime fix and this plan.
5. Push to the feature branch and `master` so GitHub Actions can deploy.
6. Check workflow status; if GitHub API remains inaccessible from this shell, report the exact local state and the command the user can run to inspect the run.

## Risk
- Node 24 must remain compatible with the app build and Wrangler. This is acceptable because the app already supports Node >=20.9, and the fix avoids adding new packages or changing production code.
