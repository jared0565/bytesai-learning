# Microsoft Learn AI Catalog Check

## Objective
Verify the current Microsoft Learn AI course catalog from the provided filtered browse URL, compare it with the existing course catalog, and prepare a safe batch import file for admin review/upload.

## Constraints
- Use the live Microsoft Learn rendered catalog as source material because the page is JavaScript-rendered.
- Only include items that are clearly Microsoft Learn course resources and free to learn.
- Do not mutate production D1 directly for content.
- Use the existing admin batch import workflow for creation/update/archive decisions.
- Keep unrelated dirty worktree changes untouched.

## Steps
1. Confirm the Microsoft provider IDs present in production D1.
2. Extract course cards from the rendered Microsoft Learn browse URL.
3. Verify each candidate is a course and is free Microsoft Learn content.
4. Compare extracted course URLs/titles against current Microsoft catalog rows.
5. Create `data/imports/microsoft-learn-ai-courses-2026-07-04.json`.
6. Validate the import file with the existing batch parser and test suite.
7. Remove temporary extraction tooling unless it is intentionally retained.

## Risks
- Microsoft Learn search results may be personalized, paginated, or change over time.
- URL locale differences (`en-us` vs `en-gb`) can cause duplicate matching unless normalized.
- Provider refresh archive mode must be reviewed carefully before enabling archive for a broad Microsoft provider.
