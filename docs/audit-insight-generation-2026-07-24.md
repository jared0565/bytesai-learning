# BytesAI Learning — Insight Generation Audit
**Audited:** 2026-07-24  
**Scope:** Article/insight generation pipeline, rendering layer, and engagement mechanisms  
**Auditor:** Claude Code  

---

## Executive Summary

The BytesAI Learning insight generation pipeline has a **strong editorial framework** (the Executive Briefing Standard in `docs/curation-framework.md`) but **suffers from a critical implementation gap**: the two primary generation paths (`/api/admin/article-gen` and `/api/admin/trend-engine`) use **inconsistent and contradictory prompts**. As a result, most auto-generated articles do not follow the framework's own rules for TL;DR bullets, quantified claims, risk+opportunity framing, or time-boxed action playbooks.

**Bottom line:** The *design* is excellent. The *execution* is leaky. Readers encounter dense paragraph prose where they expect scannable, quantified briefs. Engagement mechanisms exist but are passive and undersubscribed (0 article feedback submissions recorded).

---

## Production Data Snapshot

| Metric | Value |
|--------|-------|
| Total curated pages | 108 |
| Editorial review status | 100% `approved` (auto-approve likely ON) |
| Article feedback submissions | 0 |
| Published courses | 204 |

---

## Critical Findings

### 1. Two-Track Generation Creates Inconsistent Quality

**Files:** `src/app/api/admin/article-gen/route.ts` (lines 208–250) vs `src/app/api/admin/trend-engine/route.ts` (lines 28–59)

**Problem:** There are two independent generation pipelines:

- **`article-gen` (trend + course mode):** Uses the full Executive Briefing Standard — TL;DR bullets, quantified claims, risk+opportunity, `This week / This quarter / This year` actions, course rationale. **This is the correct prompt.**
- **`trend-engine` (RSS bulk mode):** Uses a much weaker prompt that asks for "flowing prose — no bullet points, no asterisks, no markdown" and does NOT request the framework fields. **This contradicts the framework.**

**Evidence:**

```ts
// trend-engine/route.ts lines 33-59 — explicitly forbids bullets
"Each field must be written as flowing prose — no bullet points, no asterisks, no markdown"
"summary: 2–3 sentences that hook the reader"
"executive_implications: 3–5 sentences of practical takeaways"
```

```ts
// article-gen/route.ts lines 232-235 — explicitly requires bullets
"summary: Start with 3–5 Markdown bullet lines (each starting with '- ')"
"executive_implications: A time-boxed action playbook using these exact Markdown headings"
```

**Impact:** Articles created via Trend Engine (the cron/auto path) arrive as wall-of-text drafts that an editor must rewrite from scratch. The framework was built specifically to avoid this.

**Fix:** Delete the `aiStructureArticle` prompt in `trend-engine/route.ts` and call the same `generateFromTrend` / `generateFromCourse` functions used in `article-gen/route.ts`. Unify on one prompt.

---

### 2. Summary Field Is Paragraph Prose, Not TL;DR Bullets

**File:** `src/app/api/admin/trend-engine/route.ts` line 46

**Problem:** The prompt instructs the model to produce "2–3 sentences" for the summary. The framework demands "3–5 Markdown bullet lines" with at least two containing specific numbers.

**Evidence from production:**

```
"Introducing Gemini 3.6 Flash..." — summary (DB):
"Google DeepMind has officially launched its new Gemini 3.6 Flash... 
marking a pivotal shift toward hyper-efficient AI agent development. 
These updates directly address the industry's demand for lower latency..."
```

This is two dense sentences. No bullets. No numbers.

**Impact:** The first thing a reader sees after the title is an abstract-style paragraph. Mobile readers bounce. The "20-second rule" (what changed / why it matters / what to do) is missed.

**Fix:** Change the prompt to explicitly require bullet formatting. Add a post-process validator that checks if `summary` starts with `- ` and contains at least one digit. If not, retry or flag for human rewrite.

---

### 3. No Post-Process Enforcement of Framework Rules

**File:** `src/app/api/admin/article-gen/route.ts` lines 252–278

**Problem:** The prompt sets rules (e.g. "at least two bullets must contain a specific number"), but there is **no code that validates** the model's output. If the model ignores the instruction, the article is saved as-is.

**Impact:** The framework becomes "best effort" rather than guaranteed. Over time, drift accumulates.

**Fix:** Add a lightweight `validateGeneratedArticle()` function that checks:
- `summary` starts with `- ` (bullet)
- `summary` contains at least one digit
- `executive_implications` contains `**This week**`, `**This quarter**`, `**This year**`
- `why_it_matters` contains at least one sentence with "risk" or "if ignored" framing
- `meta_description` ≤ 155 chars
- `title` ≤ 85 chars

If any check fails, retry the generation with a stricter system prompt once. If it still fails, save as `draft` with a flag for human review.

---

### 4. Trend-Engine Articles Never Link Courses

**File:** `src/app/api/admin/trend-engine/route.ts`

**Problem:** The trend-engine bulk creator inserts `primary_course_slug = NULL` for every article. It never searches Alison, never resolves courses, never writes a `primary_course_rationale`. Course linking only happens in `article-gen`.

**Impact:** 108 articles exist but many lack the core value proposition of BytesAI: "here is the news, and here is the free course that teaches the underlying skill." The discovery → learning loop is broken for bulk-generated content.

**Fix:** Port the `buildAlisonQuery`, `scrapeAlisonSearch`, `resolveAlisonCourse`, and course rotation logic from `article-gen/route.ts` into `trend-engine/route.ts`.

---

## High-Priority Findings

### 5. No Compelling Narrative Hook Above the Fold

**File:** `src/app/curated/[slug]/page.tsx` lines 164–199

**Problem:** The article page renders:
1. Title
2. Summary ( dense paragraph )
3. Byline (date + AI badge)

There is no **narrative hook** — no personal stake, no surprising fact, no "imagine if..." opener. The summary tries to do double duty as both hook and TL;DR, which makes it do neither well.

**Impact:** Readers who land from social or search hit a wall of text immediately. No visual breathing room. No curiosity gap.

**Fix:** Add a `lead` field (1 sentence, ≤ 30 words) between the title and summary. Example:

> "Your AI agent might be leaking your internal strategy to Google Search — and you wouldn't know it."

Store as `lead` in `curated_pages`. Generate it in the prompt: "Write a one-sentence lead that creates a curiosity gap or stakes a claim."

---

### 6. Categories Are Hidden From Readers

**File:** `src/app/curated/[slug]/page.tsx`

**Problem:** `categories_json` is parsed but never displayed on the article page. There are no clickable category tags, no "More in AI Governance" links, no breadcrumb taxonomy.

**Impact:** Readers finish an article and hit a dead end. No pathway to related content. No topic-based discovery.

**Fix:** Render category pills below the byline. Each pill links to `/categories/{slug}`. Also add a "Related insights in [Category]" section at the bottom.

---

### 7. Action Playbook Is Static Text — Not Interactive

**File:** `src/app/curated/[slug]/page.tsx` lines 232–237

**Problem:** `executive_implications` renders as Markdown text. The reader sees "**This week** — Pull a sample of queries..." but cannot:
- Check items off
- Save actions to a personal list
- Export to calendar/email

**Impact:** High-intent readers who want to act have no mechanism. The "This week" items are forgotten by the time they close the tab.

**Fix:**
- Parse the bullet list and render each action as a **checkable todo item** with localStorage persistence.
- Add an "Add to my learning plan" CTA next to the primary course.
- Export actions as a simple `.ics` or text block.

---

### 8. No Scroll-Depth or Dwell-Time Tracking

**File:** `src/components/ui/CuratedViewTracker.tsx` (not read but referenced)

**Problem:** View tracking (`CuratedViewTracker`) likely fires a single pageview event. There is no measurement of:
- How far readers scroll
- Which sections they spend time on
- Where they drop off

**Impact:** You cannot tell whether the `why_it_matters` section is actually read, or if readers bail after the summary.

**Fix:** Implement a lightweight scroll-depth tracker (25%, 50%, 75%, 100%) using an IntersectionObserver on each `<section>`. Send events to `course_events` with `event_type = 'scroll'`.

---

### 9. Social Share Copy Is Underpowered

**File:** `src/app/api/admin/article-gen/route.ts` lines 401–500

**Problem:** The LinkedIn copy is just `title + summary + tagline`. It doesn't use LinkedIn-native formatting (line breaks, bold claims, emojis for scanability). Twitter copy is a plain sentence.

**Impact:** Share rates are low because the copy doesn't feel native to each platform.

**Fix:** Rewrite the social package prompt with platform-native patterns:
- **Twitter/X:** Hook → stat → implication → CTA. Use line breaks for scanability.
- **LinkedIn:** Bold first line (opinion or stat) → 2-3 short paragraphs → question to drive comments.
- **WhatsApp:** Conversational, one-line hook + link preview.
- Add emoji usage rules (max 1–2 per platform, relevant to topic).

---

### 10. Title Is Not Editorially Reframed

**File:** Production DB (sample articles)

**Problem:** Article titles are frequently the source headline verbatim: "Introducing Gemini 3.6 Flash, 3.5 Flash-Lite, and 3.5 Flash Cyber." The framework says "Specific, under 85 chars, editorially reframed from source."

**Impact:** Source headlines are often press-release speak. They don't create urgency or curiosity.

**Fix:** Strengthen the prompt instruction: "Do NOT use the source title verbatim. Reframe it as a specific claim or question a practitioner would care about. Under 70 characters."

Add post-process validation: `title.length <= 85`.

---

## Medium-Priority Findings

### 11. No "Read Time" Estimation

**Impact:** Readers use read-time as a mental commitment gauge. Without it, they can't decide whether to start.

**Fix:** Calculate `Math.ceil(wordCount / 200)` and display it in the byline.

---

### 12. Source References Buried at Bottom

**File:** `src/app/curated/[slug]/page.tsx` lines 263–284

**Problem:** Sources are endnotes. The framework says "The primary source must be named in the first paragraph." The rendered page does not do this.

**Fix:** Add an inline citation in the `what_changed` or `summary` section: "Source: [Name] ([url])". Keep the endnotes section, but also surface sources contextually.

---

### 13. No Pull Quotes or Visual Breaks

**File:** `src/app/curated/[slug]/page.tsx`

**Problem:** Long sections of text have no visual hierarchy. No pull quotes, no highlighted stats, no inline `blockquote` styling.

**Fix:** Extract the first sentence containing a number from `why_it_matters` and render it as a large pull quote between sections. Style `blockquote` elements in `MarkdownContent`.

---

### 14. Article Helpfulness Feedback Has Zero Submissions

**File:** `src/components/ui/ArticleHelpfulness.tsx`

**Problem:** The component exists and is well-designed, but **0 feedback records exist** for type = 'article'. This suggests either:
- Very low traffic to curated pages
- The component appears too late (only at bottom)
- Users don't understand the value of clicking

**Fix:**
- Move the thumbs-up/down prompt inline — e.g., after each major section, ask "Was this section clear?"
- Add a "Save for later" button as an alternative engagement action.
- Surface a "Most helpful this week" badge on high-rated articles.

---

### 15. Temperature Too High for Factual Content

**File:** `src/app/api/admin/article-gen/route.ts` line 264

**Problem:** `temperature: 0.72` for article generation. This is creative-writing territory. For factual editorial content grounded in RSS sources, this increases hallucination risk and causes drift from the framework.

**Fix:** Drop to `temperature: 0.45` for the article body. Use `0.72` only for the social package (where creative flair is appropriate).

---

### 16. Max Tokens Too Tight for Full Framework Output

**File:** `src/app/api/admin/article-gen/route.ts` line 265

**Problem:** `max_tokens: 1800` must cover: title, summary (with bullets), why_it_matters, what_changed, executive_implications (with subheadings), primary_course_rationale, meta_description, categories JSON. At ~0.75 words/token, that's ~1350 words. The framework example alone exceeds this.

**Impact:** Content gets truncated or sections are written thin.

**Fix:** Increase to `max_tokens: 2800` or split into two model calls:
1. Generate article body (title, summary, why_it_matters, what_changed, executive_implications, primary_course_rationale)
2. Generate meta/social package (meta_description, categories, og data, social copy)

---

## Low-Priority / Quick Wins

### 17. No "Next Article" Recommendation

**Fix:** After the Sources section, add "Next read: [related article title]" based on shared categories.

### 18. No Article-Level Difficulty Indicator

**Fix:** Infer difficulty from category + level vocabulary. Add a badge: "5-min read · Beginner-friendly" or "Technical deep-dive".

### 19. OG Image Lacks Visual Differentiation

**File:** `src/app/api/og/route.ts`

**Problem:** All article OG cards look similar. The category-based accent color exists, but the layout is identical.

**Fix:** Add a subtle icon or pattern per category to the OG render. e.g., a shield icon for Governance, a brain icon for Foundation Models.

### 20. Auto-Approve Bypasses Editorial Review

**File:** `src/app/api/admin/article-gen/route.ts` lines 563–566

**Problem:** When `article_gen_auto_approve` is `true`, articles skip `editorial_review_status = 'draft'` and go straight to `'approved'`. Since 100% of articles are approved, this setting is likely on.

**Fix:** Turn auto-approve OFF. Add an admin dashboard widget showing "% of articles approved without human review" as a warning metric.

---

## Recommended Implementation Priority

### Phase 1 — Fix the Core Pipeline (Week 1)
1. **Unify prompts:** Make `trend-engine` use the same `generateFromTrend` prompt as `article-gen`.
2. **Add validation:** Post-process validator for framework compliance.
3. **Lower temperature + raise tokens:** `0.45` temp, `2800` tokens for body generation.
4. **Fix course linking in trend-engine:** Port Alison resolution logic.

### Phase 2 — Improve the Reading Experience (Week 2)
5. **Add `lead` field:** One-sentence hook above summary.
6. **Show categories:** Render clickable category pills.
7. **Add read-time estimate:** Simple word-count heuristic.
8. **Add next-article recommendation:** Category-based.

### Phase 3 — Deepen Engagement (Week 3–4)
9. **Interactive action playbook:** Checkable todos, export.
10. **Scroll-depth tracking:** Section-level IntersectionObserver.
11. **Pull quotes:** Auto-extract stat sentences as visual breaks.
12. **Better social copy:** Platform-native formatting rules.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/admin/article-gen/route.ts` | Add validation, adjust temp/tokens, add `lead` to prompt |
| `src/app/api/admin/trend-engine/route.ts` | Replace `aiStructureArticle` with shared `generateFromTrend`, add course linking |
| `src/app/curated/[slug]/page.tsx` | Add `lead` render, category pills, read time, next-article |
| `src/components/ui/ArticleHelpfulness.tsx` | Add inline section-level feedback, save-for-later |
| `src/app/api/og/route.ts` | Add category icons to OG render |
| `src/lib/rss-parser.ts` | Add `autoFillPageFromArticle` deprecation note (superseded by AI generation) |
| `docs/curation-framework.md` | Add `lead` field guidance, social copy platform rules |
| DB migration | Add `lead TEXT NULL` to `curated_pages` |

---

*Audit complete.*
