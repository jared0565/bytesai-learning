# Trend Engine: 24-hour window + more sources (2026-07-28)

## Problem

1. `MAX_AGE_DAYS = 14` in `rss-parser.ts` lets week-old articles surface as
   "trending". User wants a hard 24-hour window instead.
2. Only 13 RSS sources (`rss-sources.ts`) feed both the Trend Engine admin
   page and the cron-driven Article Generator (confirmed shared via graphite
   `imported-by`/`callers` — `src/app/api/admin/article-gen/route.ts` and
   `src/app/api/admin/trend-engine/route.ts` both call `fetchTrendingArticles`
   with `RSS_SOURCES`). Need more AI-scoped sources.

## Root-cause risk found during investigation

`parseDate()` (`rss-parser.ts:96-99`) silently falls back to `new
Date().toISOString()` for any article with a missing/malformed publish date.
At a 14-day window this was noise (audit finding #10). At 24 hours it
actively defeats the feature: undated articles would falsely pass the cutoff
AND collect the max recency score. Must fix in the same change or the whole
point of tightening the window is undermined.

## Live feed verification (curl, this session)

Confirmed reachable, return valid RSS/Atom, AI-topic-scoped by URL path (not
just domain — avoids diluting results with non-AI content from the same
site):
- `https://aws.amazon.com/blogs/machine-learning/feed/` (AWS ML Blog)
- `https://bair.berkeley.edu/blog/feed.xml` (BAIR — note: http:// links,
  matches existing `expectedDomain` substring check, do not "fix" to https)
- `https://techcrunch.com/category/artificial-intelligence/feed/` (TechCrunch AI)
- `https://news.mit.edu/rss/topic/artificial-intelligence2` (MIT News AI)

**Dead existing sources found (confirmed via curl, redirects followed):**
`anthropic` (404), `microsoft-ai` (410), `meta-ai` (404), `wired-ai` (404) —
all silently contributing zero articles today (fetch failure → `[]`, no
error surfaced). Searched for replacement feed URLs: no live RSS found for
Anthropic at any discoverable path; closest live replacements for Meta
(Newsroom) and Wired (general feed) are NOT AI-scoped (would pull PR/lifestyle
content, and there's no per-article topic filter to compensate). **Decision
(user confirmed): remove all 4 dead sources rather than replace with
off-topic feeds.** Net: 13 existing − 4 dead + 4 new verified = 13 sources,
all confirmed live and AI-scoped as of this session.

Rejected: NVIDIA blog, Google Research blog, MS Research blog — feeds are
live but their domains also carry non-AI content (gaming, general CS
research) and the source model has no per-article topic filter, only a
domain allowlist. Adding them would dilute results with off-topic items.
Import AI (Substack) rejected — weekly link-roundup format, not a discrete
news item; would generate incoherent "insight articles"; full-text
extraction candidates don't match Substack's markup either.
`venturebeat.com/ai/feed/` returns 308 in this environment — existing
`venturebeat-ai` category feed stays as-is (unaffected, already tier 2).
`stability.ai/news?format=rss` redirects to an HTML page, not a feed — skip.

## Changes

### `src/lib/rss-parser.ts`
1. Rename `MAX_AGE_DAYS = 14` → `MAX_AGE_HOURS = 24`, update the cutoff check
   to compare hours instead of days.
2. Fix `parseDate`: return `null` (not a "now" fallback) when the input is
   missing or unparseable. Caller (`parseFeed`) skips the article (`continue`)
   when `publishedAt` is null — same as the age-cutoff skip.
3. Clamp negative ages (future-dated / clock-skew items) to 0 rather than
   awarding them max recency implicitly (they'd already get max recency at 0,
   this just documents the intent and guards against a negative age silently
   passing an `ageDays > MAX_AGE_HOURS/24` check incorrectly).
4. Recompute `scoreArticle`'s recency tiers for a 24h window — the existing
   `<=3 days` / `<=7 days` tiers are unreachable once the hard cutoff is 24h.
   New tiers: `<=6h` (+15), `<=24h` (+10). (`<=1 day` tier removed — folded
   into `<=24h`.)

### `src/lib/rss-sources.ts`
Add 4 sources under a new "Tier 2 — additional AI-scoped feeds" grouping (or
extend existing Tier 2 list): AWS ML Blog, BAIR, TechCrunch AI, MIT News AI.
All tier 2 (reputable but not an official AI lab blog). 13 → 17 sources.

### `src/app/admin/trend-engine/page.tsx`
No hardcoded count left after the earlier batch-1 fix (`sourceCount` state
already reads from the GET response) — no change needed, verify it still
reads 17 after the source list grows.

## Verification

Extend `scripts/verify-trend-fill.entry.ts` (or a new
`scripts/verify-trend-window.entry.ts` sharing the same esbuild runner
pattern) with pure-function checks against exported helpers:
- 30-hours-ago article → excluded
- no-date article → excluded (not defaulted to now)
- future-dated article → included but not over-scored
- 20-hours-ago article → included, gets the <=24h recency bonus

Live smoke: re-run the curl loop from this session, but count items whose
`<pubDate>`/`<published>` falls within the last 24h per feed, across all 17
sources — confirms the window isn't so tight that normal weekday volume goes
to ~0.

## Explicitly out of scope

- Per-article topic filtering (would be needed to safely add NVIDIA/Google
  Research/MS Research) — not building this now, flagged in memory as a
  prerequisite for those sources.
- Changing how `article-gen`'s mode-B 404/409 error responses render in the
  admin UI as "quiet night" states — flagged separately, not required for
  this request.
