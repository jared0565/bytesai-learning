# Plan: Executive Briefing Framework for Curated Articles

**Date:** 2026-06-21  
**Scope:** Curation strategy, article-generation pipeline, regeneration pipeline, and admin editor guidance for all future (and optionally retroactive) curated insight pages.  
**Goal:** Codify the quality leap applied to the MosaicLeaks rewrite into a reusable framework, then wire it into the systems that produce and edit curated articles so every new article meets the same executive-grade standard by default.

## Background

The manual rewrite of *“MosaicLeaks: Can your research agent keep a secret?”* produced a clear before/after improvement:

| Dimension | Before | After |
|---|---|---|
| Lead | Narrative hook, no numbers | Executive TL;DR with 4 headline metrics |
| Specificity | “more than two-thirds” | “34.0% → 9.9%”, “48.7% → 58.7%” |
| Action items | Generic “audit your agents” | Time-boxed This week / This quarter / This year playbook |
| Sources | Single HF blog link | arXiv paper + HF blog |
| Course fit | Off-topic safety course | Flagged for review to match privacy/RL topic |

That improvement should not depend on a one-off human rewrite. It should become the default output of the article generator, the regeneration pipeline, and the admin editor guidance.

## Proposed framework: The BytesAI Executive Briefing Standard

A five-part quality standard for every curated insight:

1. **Executive TL;DR first** — 3–5 bullets. Must contain at least one specific number or named benchmark, the risk/opportunity frame, and the first action.
2. **Quantified claims only** — Replace vague intensifiers (“significant”, “more than two-thirds”, “worsens”) with the exact figure, benchmark size, or named entity. If a number is unavailable, state the gap explicitly.
3. **Risk + opportunity framing** — Explain why the topic exposes the reader (or their organisation) and how the proposed approach/solution turns that exposure into advantage.
4. **Time-boxed action playbook** — Split recommendations into three horizons: *This week* (audit/detect), *This quarter* (evaluate/pilot), *This year* (embed in lifecycle/vendor demands).
5. **Verified, multi-source provenance** — Primary source plus at least one corroborating authoritative source (paper, official blog, regulator, reputable outlet). Course recommendation must be on-theme; if none exists, flag it instead of inserting an irrelevant link.

Supporting style rules (already partly in place):
- Operator voice, no consultant clichés.
- One honest limitation or failure mode per article.
- Markdown tables allowed for benchmark comparisons.
- Max 85-char titles, ≤155-char meta descriptions.
- Course rationale stays editorial, not promotional.

## Files to change

| File | Change |
|---|---|
| `docs/curation-framework.md` | New framework document (source of truth). |
| `docs/curation-strategy.md` | New strategy doc linking framework to workflows (generate, review, regenerate, publish). |
| `src/app/api/admin/article-gen/route.ts` | Update both `generateFromTrend` and `generateFromCourse` prompts to output an Executive TL;DR and follow the framework field-by-field. |
| `src/app/api/admin/curated/regenerate/route.ts` | Update `aiRestructure` prompt to produce the same five-part structure and quality rules. |
| `src/app/admin/curated/EditCuratedPageModal.tsx` | Update field labels, placeholders, and hints to match framework language (TL;DR, quantified claims, time-boxed actions, etc.). |
| `src/lib/classify-article.ts` | No structural change; verify categories still cover framework topics (yes). |

## Implementation steps

### 1. Write framework and strategy documents
- Create `docs/curation-framework.md` with the five-part standard, field-by-field guidance, banned phrases, and example rewrite.
- Create `docs/curation-strategy.md` describing how the framework is applied at each stage: generation, regeneration, human review, and manual creation.
- Keep docs plain Markdown so they render in GitHub and can be pasted into prompts.

### 2. Update article-generation prompts
In `src/app/api/admin/article-gen/route.ts`:
- Add an `executive_tl_dr` field to `GeneratedArticle` interface and persist it in the DB (or, if we want to avoid schema change, map it into the start of `summary`).
- **Decision:** Map TL;DR into `summary` as a Markdown bulleted lead-in to avoid a schema migration. The rendered page already shows `summary` as the lead paragraph; a short bullet block reads well there and requires no DB change or UI refactor.
- Update both prompts to require:
  - `summary` starting with 3–5 TL;DR bullets, then a 1-sentence framing line.
  - `why_it_matters` containing the risk + opportunity frame.
  - `what_changed` quantifying the development/benchmark.
  - `executive_implications` as the time-boxed playbook (This week / This quarter / This year).
  - `primary_course_rationale` only written when a course is linked; if no course fits, set to empty string.
  - Multi-source provenance: cite the primary source and any corroborating reference in the body where relevant.
- Extend banned-phrases list with generic intensifiers: “significant”, “substantial”, “more than”, “worsens”, “improves dramatically” unless paired with a number.

### 3. Update regeneration/restructure prompt
In `src/app/api/admin/curated/regenerate/route.ts`:
- Rewrite `aiRestructure` prompt to produce the same five-part structure.
- Because regeneration works from existing raw content, instruct it to extract or preserve any numbers already present and surface them in TL;DR and `what_changed`.
- Keep output JSON shape unchanged (summary, why_it_matters, what_changed, executive_implications, meta_description) but the content of `summary` now begins with TL;DR bullets.

### 4. Update admin editor UI guidance
In `src/app/admin/curated/EditCuratedPageModal.tsx`:
- Change Summary placeholder/hint to mention TL;DR bullets + framing sentence.
- Change Why it matters placeholder to mention risk + opportunity.
- Change What changed placeholder to mention exact figures/benchmarks.
- Change Key implications placeholder to mention This week / This quarter / This year.
- Change Course rationale hint to mention on-theme requirement and flag-if-irrelevant.
- Add a small inline “Framework” link or tooltip referencing `docs/curation-framework.md` so editors can open the standard.

### 5. Verification
- Run `next build --webpack` and confirm no TypeScript or build errors.
- Generate a test article via the existing CLI/admin endpoint and inspect output for TL;DR bullets, quantified claims, and time-boxed actions.
- Run the regenerate endpoint on one existing article and inspect output.
- Confirm admin editor hints render correctly and the existing article display still handles multi-line summary content.

## Open decisions

1. **Schema change for TL;DR?** → Decision: avoid schema change; embed TL;DR in `summary` as Markdown bullets. Lower risk, no migration, works with current UI.
2. **Retroactive application?** → Offer the existing `/api/admin/curated/regenerate` batch run to restructure existing articles, but do not auto-run without explicit admin trigger. Document this in `docs/curation-strategy.md`.
3. **Framework enforcement beyond prompts?** → Start with prompt + UI guidance; no new validation middleware in this iteration. Future iteration can add a linter or scoring API.

## Risks / failure modes

| Failure mode | Mitigation |
|---|---|
| Model ignores new prompt instructions and reverts to old style | Add explicit JSON field ordering, repeat instructions, include examples in prompt. |
| Summary becomes too long with TL;DR bullets | Cap each bullet to one line; total summary still preferred under 120 words of prose after bullets. |
| Regeneration loses article nuance | Regen always uses existing source URL + original summary as fallback; framework is additive, not a blank rewrite. |
| Editors find new placeholders restrictive | Keep hints as guidance, not validation; allow override. |

## Success metrics

- Generated articles include TL;DR bullets in `summary` ≥80% of the time (manual spot-check of next 10 generations).
- `executive_implications` contains time-horizon keywords (“this week”, “this quarter”, “this year”) ≥80% of the time.
- No off-topic Alison course recommendations are accepted without editorial override.
