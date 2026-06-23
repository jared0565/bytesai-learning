# Dynamic Social OG Generator

## Objective

Replace deploy-time/static article OG images with a built-in dynamic social metadata system for curated insight pages. Generated article records should carry their own social card text, platform post copy, and OG image rendering data in D1. Social platforms must receive a crawler-safe PNG URL.

## Current State

- Curated pages have `og_title`, `og_description`, `og_image_url`, and `share_image_prompt`, but article generation does not consistently populate them.
- Article social images currently point to static `public/og-images/{slug}.png`, which does not scale as insights grow.
- `/api/og` currently defaults to redirecting to static PNG files and only serves SVG when explicitly requested.
- `/api/curated/share-copy` generates platform post text on demand and returns it without persisting the result.

## Target Architecture

1. Store generated social metadata with the curated page in D1:
   - `og_title`
   - `og_description`
   - `og_image_url`
   - `share_image_prompt`
   - `og_image_alt`
   - `og_image_data_json`
   - `social_share_copy_json`
   - `social_share_copy_model`
   - `social_share_copy_generated_at`
2. Make `/api/og?type=article&slug=...` dynamically render `image/png` from D1 article data.
3. Keep generated image URLs stable and crawler-friendly by advertising `.png` path URLs with the article update/generation timestamp in the path. Keep the query endpoint for backwards-compatible in-app previews.
4. Update article generation so each new insight generates OG title, OG description, image prompt/data, and platform post copy in the same workflow.
5. Update share-copy generation to return stored platform copy first, then generate and persist missing copy.

## Implementation Steps

1. Add D1 schema and migration fields for generated OG/social data.
2. Add shared social metadata helpers for URL generation, stored copy parsing, and fallback card data.
3. Replace static article OG URLs with dynamic `/api/og` URLs.
4. Rework `/api/og` to return PNG via `next/og` for article/course/quiz cards.
5. Extend article generation prompts and insert logic to persist OG/social fields.
6. Update admin curated read/write endpoints and DB types to include the new fields.
7. Update `/api/curated/share-copy` to use and persist `social_share_copy_json`.
8. Verify with TypeScript, lint, and production build.
9. Harden crawler output by shortening social descriptions, advertising PNG-looking image paths, and verifying Twitterbot can fetch both metadata and the image.

## Operational Notes

- Do not run Wrangler/D1 commands locally. Write migration SQL and tell the user to run it in Cowork.
- D1 stores social metadata and image render data, not filesystem PNGs. The public endpoint renders PNG at request time for crawler compatibility.
- Social platforms cache previews aggressively, so versioned OG image URLs should change when article social data changes. If a platform cached a failed page URL, test with a fresh page query parameter after deployment.
