# Readable OG Image Typography

## Objective
Improve the typography of generated insight/course PNG cards so native social uploads and link previews use normal readable text instead of the current scaled pixel font.

## Constraints
- Do not add new packages.
- Keep the existing manual truecolor PNG renderer as the crawler-safe fallback because it is proven in Cloudflare Workers and does not depend on runtime WASM compilation.
- Do not use server-side WASM rasterization in this stack; previous attempts were build/runtime fragile under OpenNext and Workers.
- Keep social crawler URLs as PNG.
- Use escaped same-origin SVG only for the admin/native-share workflow preview and browser-side PNG rasterization.

## Plan
1. Add `format=svg` support to the dynamic OG endpoint using the existing SVG builders with Inter/system font stacks.
2. Serve pre-rendered static PNG assets from `public/og-images/<slug>.png` through the versioned crawler route when available.
3. Preserve the existing manual PNG renderer as the dynamic fallback if no static asset exists.
4. Bump the social image render version so Facebook sees a fresh `og:image` URL instead of its cached bitmap card.
5. Update the modal and inline share composers to preview the SVG image card.
6. Update Copy image and Download image to fetch the SVG, rasterize it to PNG in the browser with canvas, and fall back to server PNG if needed.
7. Add source-level regression tests for SVG routing, crawler PNG rendering, version bumping, and browser-side rasterization.
8. Run focused tests, current Node tests, and a production build.
9. Commit, push, and verify Cloudflare deployment.
