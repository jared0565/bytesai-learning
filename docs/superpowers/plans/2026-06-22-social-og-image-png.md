# Social OG Image PNG Plan

Date: 2026-06-22

## Objective

Fix social sharing previews so X/Twitter and other platforms receive PNG/JPG Open Graph images instead of SVG or malformed image URLs.

## Scope

- Inspect current metadata generation for curated pages, courses, categories, providers, and site defaults.
- Inspect `/api/og` response format.
- Ensure social metadata emits absolute PNG image URLs.
- Prefer existing generated PNG assets when available.
- Use the dynamic `/api/og` PNG route as fallback.
- Preserve existing titles/descriptions and canonical URLs.

## Boundaries

- No package installs.
- No D1 schema migrations.
- Do not regenerate all image assets unless existing code requires it.
- Do not use SVG for `og:image` or `twitter:image`.

## Files To Inspect

- `src/app/layout.tsx`
- `src/app/api/og/route.ts`
- `src/app/curated/[slug]/page.tsx`
- `src/app/courses/[slug]/page.tsx`
- `src/app/categories/[slug]/page.tsx`
- `src/app/providers/[slug]/page.tsx`
- `src/lib/og-image.ts`
- `scripts/generate-og-pngs.mjs`

## Tasks

1. Identify where SVG or non-absolute social image URLs are emitted.
2. Add a helper that normalizes social image URLs to absolute PNG-compatible URLs.
3. Patch metadata routes to use the helper for `openGraph.images` and `twitter.images`.
4. Confirm `/api/og` returns `image/png` and is crawler-cacheable.
5. Run `npx tsc --noEmit` and `npm run lint`.

## Verification

- `npx tsc --noEmit`
- `npm run lint`
- Inspect rendered metadata code paths for curated page URLs.

## Residual Risks

- Social platforms cache previews aggressively; old cards may need platform-specific re-scrape/debugger refresh.
- X/Twitter preview generation may be delayed for new URLs even with correct metadata.
