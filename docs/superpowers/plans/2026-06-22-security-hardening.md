# Security Hardening Plan

Date: 2026-06-22

## Objective

Reduce the highest-risk weaknesses found in the codebase review without changing the product surface unnecessarily.

## Scope

1. Protect AI share-copy generation from anonymous draft access and uncontrolled spend.
2. Add a Cloudflare KV-backed rate limiter with safe in-memory fallback.
3. Reduce CLI admin bearer token risk by shortening expiry and making token minting a POST-only, non-cacheable operation.
4. Escape untrusted values interpolated into transactional/marketing email HTML.
5. Add baseline production browser hardening headers.
6. Fix lint hygiene so generated cache folders do not block ESLint.

## Boundaries

- No D1 schema migration in this pass.
- No package installs.
- Keep existing cookie/session behavior compatible.
- Do not change public published-share behavior except rate limiting.
- Preserve Cloudflare Workers/OpenNext deployment constraints.

## Files

- `src/lib/security.ts`
  - Add async KV-backed rate limit helper.
  - Add origin helper for state-changing routes if needed.
  - Add HTML escaping utility.
- `src/app/api/curated/share-copy/route.ts`
  - Allow public requests only for published pages.
  - Allow draft previews only for admin sessions.
  - Add durable rate limiting and OpenRouter error handling.
- `src/app/api/auth/login/route.ts`
  - Switch auth rate limiting to KV-backed helper.
- `src/app/api/auth/register/route.ts`
  - Switch auth rate limiting to KV-backed helper.
  - Sanitize persisted display name before email/session usage.
- `src/app/api/chatbot/route.ts`
  - Switch chatbot rate limiting to KV-backed helper.
- `src/app/api/feedback/route.ts`
  - Switch feedback rate limiting to KV-backed helper.
- `src/app/api/chatbot/alison-search/route.ts`
  - Switch Alison search rate limiting to KV-backed helper.
- `src/lib/auth.ts`
  - Shorten CLI token expiry from 10 years to 90 days.
- `src/app/api/admin/cli-token/route.ts`
  - Change token minting from GET to POST.
  - Add no-store response headers.
- `src/lib/email.ts`
  - Escape dynamic HTML text and URLs.
- `next.config.ts`
  - Add CSP and HSTS.
- `eslint.config.mjs`
  - Ignore generated/cache/tool artifacts that should not be linted.

## Tasks

1. Implement shared KV-backed rate limit utility with graceful fallback to the current in-memory limiter.
2. Update public and auth endpoints to use async rate limiting.
3. Harden `/api/curated/share-copy` authorization semantics and AI error handling.
4. Reduce CLI token expiry and convert token minting to `POST`.
5. Escape email template interpolation points.
6. Add CSP/HSTS headers compatible with current external services.
7. Add ESLint ignores for generated cache output.
8. Run `npx tsc --noEmit` and `npm run lint`.

## Verification

- `npx tsc --noEmit`
- `npm run lint`

## Residual Risks

- Full CLI token revocation requires a token registry table or KV token registry and a migration/backfill plan.
- Complete CSRF hardening should be centralized across all state-changing cookie-authenticated routes.
- Broader AI governance improvements still need evals, model-output validation, and cost metrics.
