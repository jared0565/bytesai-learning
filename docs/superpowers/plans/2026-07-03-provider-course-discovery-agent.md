# Plan: Provider Course Discovery Agent

## Objective

Keep BytesAI Learning's free course catalog fresh by giving admins a provider-specific discovery workflow from `/admin/providers`.

Interaction target:

1. Admin opens Providers.
2. Admin clicks a provider row/card.
3. A modal opens with utilities for discovering, reviewing, and importing free courses from that provider.
4. Discovery results are persisted as reviewable candidates, never published directly.

## Current State

Existing pieces:

- `src/app/admin/providers/page.tsx`
  - Server-rendered admin providers table.
  - Uses `ProviderActions` for create/edit.
  - Fetches `/api/admin/providers`.
- `src/app/admin/providers/ProviderActions.tsx`
  - Client modal for provider CRUD.
- `src/app/admin/courses/DiscoveryPanel.tsx`
  - Existing discovery UI on the courses surface.
  - Calls `/api/admin/scan-courses`.
  - Imports discovered courses immediately as draft courses.
- `src/app/api/admin/scan-courses/route.ts`
  - Admin-only discovery endpoint.
  - Supports legacy scanner registry and database-provider discovery.
- `src/lib/scanner/discovery.ts`
  - Derives a catalog URL from an existing provider sample course.
  - Extracts candidates from provider catalog HTML.
  - Resolves candidates against existing courses.
- `src/app/api/admin/courses/ingest/route.ts`
  - Admin-only draft course creation.
  - Has idempotency on `official_link`.
- `db/schema.sql`
  - Has `providers`, `courses`, and `admin_audit_logs`.
  - No persisted discovery jobs or candidate queue yet.

## Architecture Decision

Create a provider-centered discovery subsystem with four layers:

1. **Discovery strategy layer**
   - Provider-specific strategies for known providers.
   - Generic fallback for providers without custom rules.
   - Strategy returns normalized candidate facts, not course rows.

2. **Discovery job layer**
   - Persist each admin-triggered scan as a job.
   - Store status, source URLs, counts, failures, and actor.
   - Make scan runs auditable and repeatable.

3. **Candidate queue layer**
   - Store discovered items separately from `courses`.
   - Deduplicate by normalized URL and provider.
   - Track review state: `new`, `ignored`, `approved`, `rejected`, `stale`, `existing`.
   - Store confidence, evidence, metadata, and raw source JSON.

4. **Admin review UI layer**
   - Provider modal with tabs:
     - `Discover`: run scan, choose source strategy, see last run.
     - `Candidates`: review new/existing/stale items.
     - `Rules`: configure provider-specific catalog URLs and selectors later.
     - `History`: recent runs and audit events.
   - Approving a candidate creates a draft course via existing ingest logic or a shared service.

This keeps the public course list curated and avoids accidental publication of unverified scraper output.

## Trust Boundaries

- Admin UI is untrusted client code. Every mutation must re-check admin session server-side.
- Provider URLs are untrusted external input. Validate protocols, normalize hosts, restrict to HTTPS, and bound fetch timeouts.
- Scraped HTML is untrusted. Do not render raw HTML. Store excerpts as text only.
- AI classification, if added later, is advisory only. It cannot publish or overwrite course fields without human approval.
- The candidate queue must not feed public pages directly.

## Database Changes

Add a narrow migration, not ad hoc SQL:

`db/migrations/2026-07-03-course-discovery.sql`

Tables:

### `course_discovery_jobs`

- `id TEXT PRIMARY KEY`
- `provider_id TEXT NOT NULL`
- `admin_user_id TEXT NOT NULL`
- `status TEXT NOT NULL CHECK (status IN ('queued','running','succeeded','failed','cancelled'))`
- `strategy_id TEXT NOT NULL`
- `source_url TEXT`
- `requested_limit INTEGER NOT NULL DEFAULT 25`
- `found_count INTEGER NOT NULL DEFAULT 0`
- `new_count INTEGER NOT NULL DEFAULT 0`
- `existing_count INTEGER NOT NULL DEFAULT 0`
- `error_message TEXT`
- `started_at TEXT`
- `finished_at TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- foreign keys to `providers` and `users`

Indexes:

- `(provider_id, created_at DESC)`
- `(status, created_at DESC)`

### `course_discovery_candidates`

- `id TEXT PRIMARY KEY`
- `job_id TEXT NOT NULL`
- `provider_id TEXT NOT NULL`
- `normalized_url TEXT NOT NULL`
- `url_hash TEXT NOT NULL`
- `title TEXT NOT NULL`
- `description TEXT`
- `image_url TEXT`
- `detected_content_type TEXT`
- `detected_level TEXT`
- `free_evidence TEXT`
- `confidence REAL NOT NULL DEFAULT 0`
- `status TEXT NOT NULL CHECK (status IN ('new','existing','approved','ignored','rejected','stale','failed'))`
- `existing_course_id TEXT`
- `source_url TEXT`
- `raw_json TEXT`
- `reviewed_by TEXT`
- `reviewed_at TEXT`
- `created_course_id TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- foreign keys to `course_discovery_jobs`, `providers`, `courses`, and `users`

Indexes:

- `UNIQUE(provider_id, url_hash)`
- `(provider_id, status, created_at DESC)`
- `(job_id)`

Rationale:

- `url_hash` avoids long URL uniqueness issues and lets us normalize tracking parameters away.
- `status` enables lifecycle management without deleting operational evidence.
- `raw_json` preserves scanner evidence for debugging without expanding schema prematurely.

## Service Boundaries

Add:

- `src/lib/course-discovery/types.ts`
  - Shared types for jobs, candidates, strategy results, review actions.
- `src/lib/course-discovery/url.ts`
  - URL normalization, URL hashing, host validation.
- `src/lib/course-discovery/strategies.ts`
  - Strategy registry.
  - Known provider strategy IDs.
  - Generic fallback.
- `src/lib/course-discovery/store.ts`
  - D1 persistence helpers for jobs and candidates.
- `src/lib/course-discovery/run.ts`
  - Orchestrates one bounded discovery run:
    - validate provider
    - create job
    - execute strategy
    - resolve duplicates
    - persist candidates
    - finalize job
- `src/lib/course-discovery/review.ts`
  - Approve, ignore, reject, and import candidate actions.

Reuse:

- Existing `src/lib/scanner/base.ts` fetch and metadata helpers where safe.
- Existing `src/app/api/admin/courses/ingest/route.ts` behavior, preferably by extracting shared course creation into `src/lib/admin/course-ingest.ts` before reuse.

## API Design

All endpoints:

- Require admin session cookie or Bearer admin token.
- Return structured JSON errors.
- Enforce input size and limits.
- Log admin action for run and review mutations.

Add:

### `GET /api/admin/providers/[providerId]/course-discovery`

Returns:

- provider summary
- latest job
- candidate counts by status
- recent candidates

Query:

- `status`
- `limit`

### `POST /api/admin/providers/[providerId]/course-discovery/run`

Body:

```json
{
  "strategyId": "auto",
  "sourceUrl": "https://example.com/catalog",
  "limit": 25
}
```

Behavior:

- Runs synchronously for the first implementation with strict timeout and limit.
- Stores job and candidates.
- Returns job summary and candidate counts.

Later:

- Move to queued/background execution when Cloudflare queue or durable workflow is introduced.

### `PATCH /api/admin/course-discovery/candidates/[candidateId]`

Body:

```json
{
  "action": "ignore",
  "reason": "Not free"
}
```

Supported actions:

- `ignore`
- `reject`
- `restore`

### `POST /api/admin/course-discovery/candidates/[candidateId]/approve`

Body:

```json
{
  "category": "Agents",
  "level": "Beginner",
  "contentType": "course",
  "publishedStatus": "draft"
}
```

Behavior:

- Creates a draft course.
- Marks candidate `approved`.
- Stores `created_course_id`.
- Never publishes by default.

## UI Design

Add:

- `src/app/admin/providers/CourseDiscoveryModal.tsx`
- `src/app/admin/providers/ProviderDiscoveryButton.tsx`

Update:

- `src/app/admin/providers/page.tsx`

Provider row behavior:

- Keep edit action as a dedicated icon button.
- Add a `Discover courses` button or make the course-count cell open the discovery modal.
- Avoid making the whole row clickable because it conflicts with links and edit buttons.

Modal structure:

- Header: provider logo/name, current published course count, latest scan status.
- Toolbar:
  - source URL input
  - strategy select
  - limit select
  - `Run discovery`
- Tabs:
  - `Candidates`
  - `Existing`
  - `Ignored`
  - `History`
- Candidate row:
  - title
  - source host
  - description excerpt
  - confidence/free evidence
  - existing match state
  - `Preview`, `Approve draft`, `Ignore`

States:

- Initial empty: explain that no discovery runs have been performed for this provider.
- Loading: skeleton rows.
- Error: clear failure message with retry.
- Success with no new candidates: show existing count and source URL checked.
- Candidate actions: per-row loading, optimistic removal only after successful response.

Accessibility:

- Use a real dialog pattern with `role="dialog"`, `aria-modal`, labelled header, close button, escape handling.
- Keep 44px minimum button targets.
- Do not render external HTML.

## Discovery Strategy Design

Strategy contract:

```ts
interface DiscoveryStrategy {
  id: string;
  label: string;
  canHandle(provider: Provider): boolean;
  getDefaultSourceUrl(provider: Provider, samples: Course[]): string | null;
  discover(input: DiscoveryInput): Promise<DiscoveryCandidateInput[]>;
}
```

Initial strategies:

- `google-cloud-skills`
  - Source candidates from known Google learning/catalog pages.
  - Avoid assuming all Google AI learning lives under one catalog.
- `microsoft-learn`
  - Use existing scanner logic.
- `deeplearning-ai-short-courses`
  - Use existing catalog pattern.
- `nvidia-academy`
  - Use existing catalog pattern.
- `generic-sibling-catalog`
  - Current fallback from `src/lib/scanner/discovery.ts`.

Important rule:

- Each strategy should produce candidates with evidence and confidence, not make publish decisions.

## AI Agent Layer

First implementation should be deterministic. Add AI only after the queue and review workflow are reliable.

Later AI-assisted pass:

- Classify category, level, content type, and free-status evidence.
- Summarize why a candidate likely qualifies.
- Flag uncertainty, paywall risk, or provider mismatch.

Governance:

- Version prompts.
- Store model, prompt version, inputs hash, and output JSON in candidate `raw_json`.
- Treat AI output as advisory.
- Require human approval before draft creation.
- Track false positives through reject reasons.

## Security and Reliability

- Bound discovery `limit` to max 50.
- Bound fetch timeout per source.
- Normalize URLs and strip common tracking parameters.
- Reject non-HTTPS candidate URLs.
- Never execute scripts from fetched pages.
- Store only text metadata and URLs.
- Log admin actions:
  - discovery run requested
  - candidate approved
  - candidate ignored/rejected
- Keep discovery endpoints admin-only.
- Prefer draft creation on approval.
- Add failure-safe job finalization so failed scans do not remain `running`.

## Implementation Steps

1. Add schema migration for discovery jobs and candidates.
2. Add `course-discovery` library types, URL normalization, store helpers, and run orchestration.
3. Extract course ingest creation into reusable service.
4. Add provider discovery API endpoints.
5. Add provider discovery modal and wire it into the providers page.
6. Add focused tests for URL normalization, duplicate detection, and candidate lifecycle.
7. Run typecheck/lint/build verification.

## Test Plan

Unit-level:

- URL normalization removes tracking params and normalizes trailing slashes.
- URL hash is stable.
- Duplicate provider URL updates existing candidate rather than creating a duplicate.
- Candidate approve creates a draft and marks candidate approved.
- Candidate ignore changes only the candidate status.

Integration/manual:

- Admin can open provider discovery modal from Providers.
- Google provider scan returns stored candidates or a clear source-specific error.
- Existing course URLs are marked existing.
- Approving a candidate creates a draft course.
- Public `/courses` and provider pages do not show candidates until the course is explicitly published.

Verification commands:

- `npm test` if tests are added to the existing test runner.
- `node --test <test-files>` for focused Node tests where applicable.
- `npm run lint`
- `npm run build`

## Rollout

Phase 1:

- Provider modal.
- Synchronous bounded scans.
- Candidate queue.
- Manual approve-to-draft.

Phase 2:

- Provider strategy configuration.
- Scheduled freshness checks.
- Candidate stale detection.
- Source reliability metrics.

Phase 3:

- AI-assisted classification and free-status evidence extraction.
- Human-reviewed batch import.
- Automated admin alerts when a top provider has low coverage.

## Open Questions

- Should Google discovery initially target Google Cloud Skills Boost, Grow with Google, Google AI, or all Google-owned learning domains?
- Should rejected candidates be retained forever for duplicate suppression, or retained for a fixed period?
- Should provider-specific source URLs be stored in a new `provider_discovery_sources` table now, or deferred until rules become editable?
