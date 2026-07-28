# Trend Engine Fixes — Batch 1 (2026-07-28)

From the 2026-07-28 audit. Scope: findings #1, #2, #3, #4, #5, #6, #7, #8.

## Files

- `app/src/lib/rss-parser.ts` — content extraction (#1, #2)
- `app/src/app/api/admin/trend-engine/route.ts` — audit flag (#3), slug pre-check (#8)
- `app/src/app/admin/trend-engine/page.tsx` — POST error handling (#4), save feedback (#5), count mismatch (#6), source count (#7)

## Tasks

1. **#1 Paragraph structure destroyed** — `stripHtml` collapses all whitespace to single
   spaces before `cleanArticleText` can restore `\n\n`, so `naiveFill`'s split on
   `/\n{2,}|\.\s{2,}/` never matches and the whole article lands in `summary`.
   Fix: in `stripHtml`, convert block-level closing tags (`</p>`, `</div>`, `</li>`,
   `</h1-6>`, `<br>`) to `\n\n` *before* collapsing horizontal whitespace; collapse only
   spaces/tabs inline, then collapse 3+ newlines to `\n\n`.
2. **#2 Short sentences deleted** — `deduplicateSentences` drops sentences < 20 chars.
   Fix: dedupe per-paragraph, keep sentences regardless of length (dedupe key only).
3. **#3 Wrong audit flag** — `route.ts` logs `aiStructured: !!apiKey`; change to `usedAi`.
4. **#4 Crash on POST error** — `createDrafts` doesn't check `res.ok`; on error body
   `result.created.length` throws. Fix: check `res.ok`, surface error banner instead.
5. **#5 False "Saved"** — `saveSettings` doesn't check `res.ok`. Fix: show saved only on
   success, error state otherwise.
6. **#6 Label/action mismatch** — `selectedCount` counts filtered selection but submit
   sends all selected. Fix: `selectedCount = selected.size`.
7. **#7 Wrong source count** — page hardcodes `{14}`; `RSS_SOURCES` has 13. Fix: use the
   `sources` array returned by GET (state), fallback to `RSS_SOURCES.length` equivalent.
8. **#8 AI spend before dup check** — POST runs the OpenRouter call before the UNIQUE
   slug check. Fix: `SELECT 1 FROM curated_pages WHERE slug = ?` before `aiStructureArticle`;
   skip with reason 'Page with this slug already exists'.

## Verification

- No test framework in repo. Write `scripts/verify-trend-fill.mjs`, bundle the real
  `rss-parser.ts` (+ a naiveFill harness) with esbuild (transitive dep of next), run with
  node. Falsifiability: before the fix, `whyItMatters`/`whatChanged` must come out empty
  on multi-paragraph input; after the fix they must be non-empty and short sentences must
  survive.
- `npx tsc --noEmit` for type safety on the three edited files.
- `npm run lint` on edited files.
