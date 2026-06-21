# Plan: Actionable Tips Modal for Curated Articles

**Date:** 2026-06-21  
**Scope:** `/admin/curated` article cards and the existing AI rewrite endpoint.

## Goal

Make the article "tips" chip functional. Clicking it opens a modal that lists every tip for that article, lets the editor fix each issue in context, and offers an AI-assisted suggestion that can be reviewed and saved.

## Background

The current card already computes tips (`getTips`) and shows a count chip (e.g. "2 tips"). The chip is decorative. The snapshot shows the user wants a modal where each tip can be acted upon directly.

## Proposed UX

1. Clicking the tips chip opens a modal titled **"Improvement tips for {title}"**.
2. Tips are grouped by severity: errors (red), warnings (amber), info (teal).
3. Each tip card shows:
   - The tip text.
   - The field(s) it relates to (e.g. Summary, Meta description).
   - A textarea pre-filled with the current field value.
   - **AI suggest fix** button — calls the rewrite API with a tip-specific instruction.
   - **Apply** button — saves the edited/suggested value back to the article.
4. The modal can also be opened from the existing **"(+N more — click Edit)"** link below the top tip.

## Backend changes

### 1. Extend `/api/admin/article-rewrite`

Currently accepts only fixed instruction keys (`clarity`, `concise`, etc.). Extend it to accept a free-form `instruction` string. If the provided value is not a known key, use it directly as the AI prompt. This keeps the existing UI working and enables custom tip prompts.

Add validation: if `instruction` is missing/empty and not a known key, return 422.

## Frontend changes

### 2. Create `src/app/admin/curated/TipsModal.tsx`

Props:
- `page: PageData` (same shape used in `EditCuratedPageModal`).
- `onClose: () => void`.
- `onSaved: (id, updates) => void` (mirrors existing pattern).

State per tip:
- `draftValues: Record<fieldName, string>` — current textarea content.
- `aiSuggestions: Record<fieldName, string | null>` — last AI suggestion.
- `savingField: string | null` — which field is currently saving.
- `rewritingField: string | null` — which field is waiting for AI.

Field mapping from tips:
| Tip pattern | Affected field | AI instruction |
|---|---|---|
| "Summary is too long" | `summary` | "Make this article summary concise: 2–3 sentences, under 400 characters, keep the key hook." |
| "No meta description" | `meta_description` | "Write an SEO meta description under 155 characters for this article." |
| "Meta description is X chars" | `meta_description` | "Trim this meta description to under 155 characters while keeping it compelling." |
| "No course linked" | `primary_course_slug` + `primary_course_rationale` | Manual only (AI cannot reliably pick a slug without course search). |
| "Why it matters is empty" | `why_it_matters` | "Write a 3–5 sentence 'Why it matters' section that explains risk + opportunity and one limitation." |
| "What changed is empty" | `what_changed` | "Write a 3–5 sentence 'What changed' section with quantified details and one limitation." |
| "Key implications is empty" | `executive_implications` | "Write a time-boxed action playbook: This week / This quarter / This year." |
| "Published but not approved" | `editorial_review_status` | Toggle button (set to `approved`). |
| Other generic tips | Detect by substring | Generic instruction: "Fix the following issue for this article: {tip text}" |

Save flow:
- PATCH `/api/admin/curated?id={page.id}` with the changed fields.
- On success, call `onSaved` so the list updates.

### 3. Wire chip in `src/app/admin/curated/page.tsx`

- Make the tips chip clickable.
- Add state for `tipsModalPageId`.
- Render `<TipsModal />` when open.
- Keep the existing "(+N more — click Edit)" link but also make it open the tips modal.

## Files to change

| File | Change |
|---|---|
| `src/app/api/admin/article-rewrite/route.ts` | Accept custom `instruction` string. |
| `src/app/admin/curated/TipsModal.tsx` | New modal component. |
| `src/app/admin/curated/page.tsx` | Open modal from chip and tip link. |

## Verification

- `next build --webpack` passes.
- Clicking the tips chip opens the modal.
- Each tip shows the correct field editor.
- AI suggest returns a suggestion that can be edited.
- Apply saves the change and the list reflects it.

## Open decisions

- Course-link tips will remain manual because picking a slug requires the existing course-resolve flow. The modal will show the existing "Link a course" guidance and a button to open the full editor if needed.
