# BytesAI Curation Strategy

This document describes how BytesAI Learning produces, reviews, and maintains curated insight articles. It references the **Executive Briefing Standard** defined in [`docs/curation-framework.md`](./curation-framework.md).

## Purpose

BytesAI Learning is a discovery platform for verified-free AI courses. Curated insights are the editorial layer that explains *why* a course, paper, or trend matters right now. They must stand alone as useful briefs and point readers to relevant learning resources without forcing irrelevant links.

## Audience and tone

Primary readers:
- AI practitioners and engineers evaluating tools.
- Team leads and managers making adoption decisions.
- Learners trying to understand which AI developments affect their career.

Tone: operator voice, evidence-based, no hype. See the framework for banned phrases and style rules.

## The curation workflow

```
Source discovery
      ↓
Article generation (trend or manual/course mode)
      ↓
Initial AI classification + course linking
      ↓
Editorial review (human)
      ↓
Publish / schedule / archive
      ↓
Periodic regeneration or retirement
```

### 1. Source discovery

Sources come from:
- Trending AI news via RSS feeds (`src/lib/rss-parser.ts`, `src/lib/rss-sources.ts`).
- Manual admin selection of an Alison course.
- Direct submission by the editorial team.

Every article must have a primary source. The trend engine also searches DuckDuckGo for corroborating sources before generation.

### 2. Article generation

Generation is handled by `POST /api/admin/article-gen`:
- **Trend mode:** picks the top unprocessed RSS article, finds a congruent Alison course, fetches corroborating sources, then calls the AI writer.
- **Manual/course mode:** admin specifies an Alison course; the writer produces an insight about the course topic, supported by web search references.

Both modes now follow the Executive Briefing Standard:
- `summary` opens with 3–5 TL;DR bullets plus one framing sentence.
- `why_it_matters` frames risk + opportunity.
- `what_changed` quantifies the development.
- `executive_implications` uses This week / This quarter / This year.
- `primary_course_rationale` is written only when a course is linked and is on-theme.
- Sources are stored in `source_references_json`.

### 3. AI classification and course linking

After generation:
- `src/lib/classify-article.ts` assigns 1–3 categories from the approved list.
- The trend engine links a congruent Alison course using query rotation logic to avoid always recommending the same course.
- If no suitable course is found, the article is saved without a course link and the rationale field is left empty.

A course is “congruent” when a reader of the article would plausibly enrol to learn the underlying skill or domain. Off-topic courses must be removed in editorial review.

### 4. Editorial review

Every generated article enters `editorial_review_status = 'draft'` (or `'approved'` if auto-approve is enabled). Review checks:

1. **Framework compliance:** Does the summary start with TL;DR bullets? Are claims quantified? Are actions time-boxed?
2. **Factual accuracy:** Are numbers supported by the source references? Is the primary source authoritative?
3. **Course fit:** Is the linked course directly relevant? If not, remove it or search for a better match.
4. **Voice:** No banned phrases, no consultant clichés, one honest limitation included.
5. **SEO:** Title under 85 chars, meta description under 155 chars.
6. **Category accuracy:** Categories reflect article content, not just title.

Only set `editorial_review_status = 'approved'` when all checks pass. Publishing (`published_status = 'published'`) is a separate deliberate action.

### 5. Publishing and distribution

After approval:
- Set `published_status = 'published'`.
- Share via the article’s share panel to X, LinkedIn, Facebook, WhatsApp. Platform-optimised copy is generated for each channel.
- Monitor referrer diversity. If traffic is concentrated in one source, cross-post to others.

### 6. Regeneration and retirement

The regeneration pipeline (`POST /api/admin/curated/regenerate`) re-fetches source text and re-structures existing articles. Use it to:
- Backfill missing framework fields on older articles.
- Update articles after a major framework change.
- Refresh stale articles where the source URL is still live.

Regeneration preserves categories if already set and follows the same Executive Briefing Standard as new generation.

Articles should be archived (`published_status = 'archived'`) when:
- The underlying development is no longer current and regeneration cannot save it.
- The primary source is dead or retracted.
- A newer, more accurate insight supersedes it.

## Roles and responsibilities

| Role | Responsibility |
|---|---|
| Trend engine | Discovers sources, links courses, generates first drafts. |
| AI writer | Produces structured output that follows the framework. |
| Classifier | Assigns categories from the approved list. |
| Human editor | Verifies facts, ensures course fit, approves for publish. |
| Admin / publisher | Sets published status, shares, monitors analytics. |
| Platform | Stores source references, audit logs, view metrics, and helpfulness scores. |

## Quality metrics

Track monthly:
- % of generated articles that open with TL;DR bullets in `summary`.
- % of `executive_implications` that contain all three time horizons.
- % of published articles with ≥2 source references.
- % of published articles with an on-theme primary course.
- Average helpfulness rating by article.
- Referrer diversity for published articles.

Target for all metrics: ≥80% after framework rollout, trending toward 90%.

## Retroactive application

To apply the framework to existing articles:

1. Go to **Admin > Curated > Regenerate** and run the batch regenerator. It processes articles with missing or stale fields and rewrites them using the new prompt.
2. Alternatively, call the API directly:

```bash
curl -s -X POST https://learn.bytesai.uk/api/admin/curated/regenerate \
  -H "Authorization: Bearer $BYTESAI_CLI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids":["cp-xxx","cp-yyy"]}' | jq .
```

3. Review regenerated articles before publishing. The pipeline does not auto-publish.

## Updating this strategy

- Framework changes start in `docs/curation-framework.md`.
- Prompt changes in `src/app/api/admin/article-gen/route.ts` and `src/app/api/admin/curated/regenerate/route.ts` must mirror framework updates.
- Admin UI hints in `src/app/admin/curated/EditCuratedPageModal.tsx` must be updated when field guidance changes.
- Announce framework changes to the editorial team before regenerating existing content.
