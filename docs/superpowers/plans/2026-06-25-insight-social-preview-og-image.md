# Insight Social Preview OG Image Fix

## Objective

Restore reliable social sharing previews for insight/curated pages, specifically the missing `og_image` rendering shown in X/Twitter shares while preserving the existing crawler-friendly PNG URL contract.

## Constraints

- Do not switch the Next.js build away from `next build --webpack`.
- Do not modify production D1 schema or content directly for this bug unless investigation proves a content-row issue and the user approves the production change.
- Preserve existing `/api/og` compatibility behavior while keeping advertised social image URLs path-style and image-like.
- Leave unrelated worktree changes untouched.

## Trust Boundaries And Risks

- Social crawlers consume server-rendered metadata, not client-rendered UI.
- X/Twitter can cache failed card fetches, so verification must inspect crawler-visible HTML and image endpoint responses directly.
- Dynamic OG rendering runs inside Cloudflare Workers; image response headers and cache behavior must be explicit enough for crawlers.
- Page slugs and generated image versions may come from database content, so metadata helpers must tolerate missing or malformed optional fields.

## Investigation Plan

1. Identify the live insight URL for "Introducing computer use in Gemini 3.5 Flash".
2. Fetch the live page with `Twitterbot/1.0` and inspect `og:*` and `twitter:*` meta tags.
3. Fetch the advertised image URL with browser and crawler user agents and verify status, content type, cache headers, content length, and PNG bytes.
4. Compare live behavior with local source in `src/lib/social-meta.ts`, `src/app/curated/[slug]/page.tsx`, and OG route handlers.
5. Determine root cause before changing code.

## Implementation Plan

1. Add or update focused tests around social metadata/image URL behavior if the failure is code-level.
2. Patch the smallest affected module or route while preserving backward compatibility.
3. Run typecheck/lint/build or a narrower verified test set first, then broaden if the change touches shared helpers.
4. Re-probe the live or locally served route with crawler user agents after deploy-ready validation.

## Verification Commands

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `curl.exe -A "Twitterbot/1.0" ...`
- `curl.exe -I -A "Twitterbot/1.0" <advertised-og-image-url>`

