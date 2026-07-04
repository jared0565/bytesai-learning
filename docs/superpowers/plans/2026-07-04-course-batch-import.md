# Course Batch Import

## Objective
Create a repeatable admin workflow for importing multiple verified-free courses from a JSON or Markdown file. Every imported course must include a short brief, stored as `snippet`, before it can be created.

## Architecture
- Add a server-side batch parser in `src/lib/admin/course-batch-ingest.ts`.
- Add an authenticated admin API route at `src/app/api/admin/courses/batch-ingest/route.ts`.
- Reuse `createCourseFromAdminInput` for every accepted row so batch imports share slug validation, URL validation, duplicate handling, status defaults, and audit logging with the existing single-course endpoint.
- Add an admin upload panel at `src/app/admin/courses/BatchCourseImport.tsx`.
- Add the upload panel as a fourth section in `src/app/admin/add-courses/AddCoursesClient.tsx`.
- Store the Google AI course batch as `data/imports/google-ai-courses-2026-07-04.json` so it can be uploaded or reused.
- Add parser tests in `tests/course-batch-ingest.test.ts`.

## File Format Contract
JSON accepts either:
- an array of course objects
- `{ "courses": [...] }`

Markdown accepts:
- a fenced JSON block containing either shape above
- or human-readable sections where each `## Course title` section has list fields like `Brief:`, `URL:`, `Provider ID:`, `Category:`, `Level:`, and `Status:`

Required fields per course:
- `title`
- short brief via `brief` or `snippet`
- `official_link` or `url`

Defaults:
- `content_type`: `course`
- `published_status`: `draft`

## Validation
- Reject files larger than a small bounded size.
- Reject batches above a bounded row count.
- Reject any row missing a short brief.
- Reject non-HTTPS URLs through the existing ingest function.
- Return per-row results so admins can see created, existing, and failed records.

## Tasks
1. Implement parser and normalization helpers.
2. Add tests for JSON import, Markdown import, and missing brief rejection.
3. Add authenticated API route for multipart upload and JSON body submission.
4. Add admin UI upload panel with file input, dry-run checkbox, status selector guidance, and per-row result table.
5. Wire panel into `/admin/add-courses`.
6. Add the Google AI batch file.
7. Run targeted tests, TypeScript/build verification, and inspect git diff.

## Rollback
The feature is additive. Roll back by removing the new route, parser, UI component, test, and sample import file.
