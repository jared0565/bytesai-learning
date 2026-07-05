# Admin Providers Page Fix

## Objective
Fix the Admin Providers page so it shows provider records and course counts instead of falling back to an empty list.

## Root Cause
The page performs a server-side fetch to `https://learn.bytesai.uk/api/admin/providers` while explicitly sending an empty cookie header. The API requires an admin session cookie, so the request returns unauthorized and the page silently returns `[]`.

## Approach
1. Keep the existing `/admin/providers` menu entry and page structure.
2. Replace the unauthenticated self-fetch with a direct D1 read from the already-protected admin route.
3. Mark the page dynamic so provider counts are not cached unexpectedly.
4. Verify with tests/build where feasible.

## Risk
Direct DB reads must keep the same query shape as the API so UI behavior remains unchanged.
