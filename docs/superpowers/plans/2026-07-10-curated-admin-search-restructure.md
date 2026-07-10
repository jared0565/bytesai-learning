# Curated Admin Search And Single-Article Restructure

## Objective

Make a specific insight article, such as "Meta says its new AI model is ready to compete on coding", findable and fixable from the admin curated pages screen.

## Root Cause

The curated admin page fetches `/api/admin/curated` without parameters, and the API returns only the latest 200 records ordered by `updated_at`. Older articles can be present in D1 but invisible in the admin list. The backend can edit article fields and the framework refresh endpoint already accepts IDs, but the UI only exposes a global batch action.

## Changes

1. Add safe search parameters to `GET /api/admin/curated`.
   - Support `q` across title, slug, summary, source references, and course slug.
   - Support bounded `limit`, default 200 and max 500.
   - Bind query values to avoid SQL injection.

2. Add search controls to `src/app/admin/curated/page.tsx`.
   - Query by title/topic/slug.
   - Preserve current compact admin style.
   - Show loading, empty, and error states.

3. Add a single-article framework refresh action.
   - Use existing `/api/admin/curated/refresh-framework` with `{ ids: [pageId] }`.
   - Allow targeted refresh for any article status, not only published.
   - Refresh the edited page fields after success.

4. Verify.
   - Run TypeScript/build checks with `npm run build`.
   - Do not modify production content as part of this change.
