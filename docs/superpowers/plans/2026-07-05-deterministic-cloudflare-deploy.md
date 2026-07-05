# Deterministic Cloudflare Deploy Path

## Objective
Make production deployment deterministic and repository-driven: local commit -> push to GitHub -> Cloudflare deploy from GitHub Actions.

## Problems Found
- Local deploys can accidentally package dirty, uncommitted files.
- A temporary worktree with symlinked `node_modules` produced a bad OpenNext bundle.
- The existing GitHub Actions workflow only deploys `master`, so the active branch did not trigger deployment.
- The workflow builds OpenNext but does not run `scripts/add-cron.mjs`, while local deploys do.
- Graphite is fresh but misses app route modules, so it is not reliable as the only impact signal.

## Implementation
1. Keep local commands for development builds and tests.
2. Make the default `npm run deploy` command fail locally with instructions.
3. Add a CI-only deploy script that builds OpenNext, appends the cron handler, and deploys.
4. Update GitHub Actions to deploy from pushed commit state on `master` and `bytesFX/security-hardening`, plus manual dispatch.
5. Verify the workflow file and package scripts locally.

## Non-Goals
- Do not rewrite unrelated dirty user files.
- Do not deploy from a dirty local checkout.
- Do not treat Graphite output as proof; use tests/builds for completion claims.
