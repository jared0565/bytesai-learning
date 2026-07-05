# Readable OG Image Typography

## Objective
Improve the typography of generated insight/course PNG cards so native social uploads and link previews use normal readable text instead of the current scaled pixel font.

## Constraints
- Keep the response as `image/png`; social crawlers and platform uploads need PNG.
- Do not add new packages.
- Keep the existing manual truecolor PNG renderer because it is proven in Cloudflare Workers and does not depend on runtime WASM compilation.
- Keep the change scoped to OG image generation.

## Plan
1. Preserve mixed-case text instead of forcing all text to uppercase.
2. Add lowercase glyphs to the built-in bitmap font so titles retain normal word shape.
3. Bump the social image render version to force fresh crawler URLs.
4. Add source-level regression tests for the mixed-case typography path.
5. Run focused tests, current Node tests, and a production build.
6. Commit, push, and verify Cloudflare deployment.
