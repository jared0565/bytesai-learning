# Plan: Insight detail page as executive article report

**Date:** 2026-06-20  
**Scope:** Curated insight detail (`/curated/[slug]`) and the article-generation pipeline that feeds it.

## Goal
Transform the individual curated insight page from a stack of labelled cards into a continuous, executive article report that reads like an editor's brief. Preserve all existing functionality (share, helpfulness, analytics, admin preview, JSON-LD, course recommendations, AI disclosure). Also ensure generated insights ground themselves in one primary source plus checked additional reference sources, all surfaced in the Sources section.

## Outcomes
1. Article-first layout: narrow prose measure, editorial header, continuous body, inline course callout, endnote sources, simple related-course links.
2. AI disclosure is a bottom footnote containing the article title and verified source URLs.
3. Article generator (trend mode and manual/course mode) searches for and passes additional reference sources to the writer, then stores them alongside the primary source so the Sources section reflects real corroboration.

## Files to change
- `src/app/curated/[slug]/page.tsx` (main page refactor)
- `src/app/globals.css` (article prose utilities)
- `src/components/ui/MarkdownContent.tsx` (optional article variant)
- `src/components/ui/CourseSpecTable.tsx` (optional compact/aside styling)
- `src/app/api/admin/article-gen/route.ts` (multi-source corroboration)
- This plan file is read-only once execution starts.

## Implementation steps

### 1. Typography & layout utilities
In `src/app/globals.css` add:
- `.article-layout` — two-column grid (article + sticky sidebar) on ≥900px, single column below.
- `.article-prose` — body text 1rem/1.8, paragraph max-width 70ch, section dividers, h2 headings at title scale.
- `.article-lead` — 1.125rem/1.7 in soft ink for the deck paragraph.
- `.article-byline` — inline metadata row style.
- `.article-aside` — inline callout for the primary course: soft background, 1px border, left accent rule.
- `.article-footnotes` — numbered source list at the bottom.

### 2. MarkdownContent variant
Add an optional `variant?: 'default' | 'article'` prop. In article mode:
- Bump h2/h3/h4 sizes and margins so section headings feel like article headings, not nested UI labels.
- Keep the same inline bold/italic/table/list handling.
Default variant stays unchanged for other uses (admin, chatbot, etc.).

### 3. Curated detail page refactor
Rewrite the main content area of `src/app/curated/[slug]/page.tsx` while preserving everything outside it:
- Keep: metadata, admin preview banner, breadcrumb, JSON-LD, `CuratedViewTracker`, Header/Footer.
- New header inside `main`:
  - Optional category kicker (if `categories_json` is later exposed; skip for now because the DB interface does not consistently include it).
  - Title as display headline.
  - Lead paragraph from `page.summary`.
  - Byline row: verification date, AI-assisted badge, share button.
- New two-column article layout:
  - Left column (article):
    - `<article className="article-prose">` containing:
      - `why_it_matters`
      - `what_changed`
      - inline primary-course aside using `CourseSpecTable`
      - `executive_implications`
    - Related courses as a simple linked list (not card grid).
    - Sources as numbered endnotes (`ol.article-footnotes`).
    - `ArticleHelpfulness` at the bottom of the article body.
    - AI disclosure footnote with article title and verified source URLs.
    - Bottom share nudge.
  - Right column (sticky sidebar on desktop, collapsed to bottom/in-header on mobile):
    - Share button.
    - Verified date + AI badge.
    - Quick jump / sources mini-list (optional; keep minimal).
- Back link remains at the bottom.

### 4. Course recommendation presentation
- Primary course: render inside an `.article-aside` block within the article flow, using the existing `CourseSpecTable` but with reduced visual weight (smaller padding/rationale).
- Related courses: convert `grid-4` to a vertical list of links (`<ol>` or `<ul>`) with provider + level metadata, placed after the main article body.

### 5. Sources section
- Render all entries in `sourceRefs` as a numbered list.
- Each item links out with `ExternalLink` and shows the source title.
- If no sources exist, omit the section entirely.

### 6. AI disclosure footnote
- Keep the existing AI disclosure paragraph at the bottom of the article.
- Add the article title and a comma-separated list of verified source URLs (rendered as plain text) so the footnote carries the specific provenance.

### 7. Multi-source corroboration in article generator
In `src/app/api/admin/article-gen/route.ts`:
- Extract a reusable helper `buildSourceRefs(primary, additional)` that produces `{ title, url }[]`.
- Add `extractPageTitle(html)` helper to get readable titles from fetched pages.
- In **trend mode**:
  1. After picking the primary article, run `searchDDG` using a query derived from `article.title`.
  2. Filter out the primary article's domain and any already-used RSS-source domains.
  3. Fetch snippets from the top 2–3 additional results (with timeout and length guard).
  4. Pass the additional snippets to `generateFromTrend` as `referenceContent`.
  5. Store primary source + additional sources in `sourceRefs`.
- In **manual/course mode**:
  1. Keep the existing `searchDDG` web-search step.
  2. Improve source-ref titles by extracting page titles where possible.
  3. Pass search results to the prompt explicitly as corroborating references.
- Update both prompts:
  - Trend prompt: add an `ADDITIONAL REFERENCES` block and a quality standard requiring the writer to check and naturally cite corroborating sources where relevant.
  - Course prompt: change the research-context preamble from "use as background" to "additional references for corroboration".

### 8. Verification
- Run `next build --webpack` and confirm no errors.
- Check responsive breakpoints at 320px, 768px, 1024px, 1440px.
- Confirm heading hierarchy (only one h1, logical h2s).
- Confirm share panel, helpfulness, view tracker, JSON-LD, and admin preview banner still work.
- Confirm generated articles (manual + trend) store multiple source references.

## Open decisions resolved
1. Related courses → **simple linked list**.
2. AI disclosure → **bottom footnote with article title + verified source URLs**.
3. DESIGN.md → generated first; north star is **The Editor's Desk**.
