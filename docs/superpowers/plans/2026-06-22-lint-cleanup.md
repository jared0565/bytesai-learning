# Lint Cleanup Plan

Date: 2026-06-22

## Objective

Fix the existing ESLint errors that block `npm run lint` after generated-output ignores were corrected.

## Scope

- Fix blocking ESLint errors only.
- Leave warnings for a later cleanup unless they are in files already being touched and are trivial.
- Avoid behavioral changes where possible.
- Do not touch untracked generated assets or logs.

## Files From Current Lint Output

- `src/app/about/page.tsx`
- `src/app/admin/curated/EditCuratedPageModal.tsx`
- `src/app/admin/featured/page.tsx`
- `src/app/admin/feedback/page.tsx`
- `src/app/providers/page.tsx`
- `src/app/quiz/results/page.tsx`
- `src/components/Analytics/AnalyticsProvider.tsx`
- `src/components/Chatbot/Chatbot.tsx`
- `src/components/ThemeProvider/ThemeProvider.tsx`
- `src/lib/rss-parser.ts`

## Tasks

1. Replace unescaped JSX quote/apostrophe text with entities or string expressions.
2. Refactor React hook purity/set-state-in-effect lint errors with lazy state initialization or async effect callbacks.
3. Replace `let` with `const` where required.
4. Run `npm run lint`.
5. Run `npx tsc --noEmit`.

## Verification

- `npm run lint`
- `npx tsc --noEmit`

## Residual Risks

- Existing warnings may remain if they do not fail lint.
- Some React compiler lint rules are conservative; fixes should preserve runtime behavior.
