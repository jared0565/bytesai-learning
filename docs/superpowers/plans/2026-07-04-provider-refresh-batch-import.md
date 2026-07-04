# Provider Refresh Batch Import

## Objective
Extend the batch importer so provider catalogs can be refreshed safely over time. The workflow must update matched courses in place, create missing courses, and report archive candidates without blindly deleting or replacing existing records.

## Architecture
- Reuse `src/lib/admin/course-batch-ingest.ts`.
- Add refresh options to `ingestCourseBatch`:
  - `updateExisting`: match by `official_link`, slug, or normalized title within provider.
  - `archiveMissing`: archive provider rows not represented in the uploaded full catalog.
  - `providerId`: required when archiving missing rows.
- Keep default behavior unchanged: normal batch import still only creates missing rows or reports existing official links.
- Update `src/app/api/admin/courses/batch-ingest/route.ts` to accept multipart and JSON refresh options.
- Update `src/app/admin/courses/BatchCourseImport.tsx` to expose:
  - Refresh existing matches
  - Archive missing provider courses
  - Provider ID for archive comparison
- Replace the Anthropic missing-only file with a full current catalog file so it can drive refresh.
- Expand tests for update-existing and archive-candidate behavior.

## Safety Rules
- Dry run remains enabled by default.
- Archive missing rows only when explicitly requested.
- Matching by title is scoped to `provider_id` to prevent cross-provider updates.
- Archive is soft: set `published_status = archived`, not delete.
- Create/update functions should return row-level results for admin review.

## Verification
- Run `node --test tests/*.test.ts`.
- Run production build through WSL Node 20:
  `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v20.20.1/bin:$PATH"; cd "/mnt/f/Projects/BytesAI Learning/app" && node node_modules/next/dist/bin/next build --webpack'`
