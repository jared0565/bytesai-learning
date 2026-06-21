# BytesAI Curation Framework: The Executive Briefing Standard

Every curated insight on BytesAI Learning is an editorial brief for a busy practitioner, leader, or learner. It must answer three questions in the first 20 seconds:

1. **What changed?**
2. **Why does it matter to me?**
3. **What should I do about it?**

This framework codifies the standard so it can be applied by humans, by the article generator, and by the regeneration pipeline.

## The five-part standard

### 1. Executive TL;DR first

The `summary` field must open with 3–5 Markdown bullets that give the reader the headline story before they read a paragraph. Each bullet should be one line and at least one must contain a specific number, benchmark size, or named entity.

What to include:
- The concrete change or finding.
- The quantified impact (or the gap if a number is unavailable).
- The risk/opportunity frame.
- The first action a reader should take.
- Optional: who the finding applies to.

Example (good):

```markdown
- Deep-research agents that search the open web while reading internal documents leak sensitive facts through outbound queries.
- Training purely for performance increased full-information leakage from 34.0% to 51.7% in the MosaicLeaks benchmark.
- Privacy-Aware Deep Research (PA-DR) cut leakage to 9.9% while still raising task success from 48.7% to 58.7%.
- Security teams should treat agent query logs as a new data-loss surface.
```

After the bullets, add one short framing sentence (≤25 words) that anchors the topic for the reader.

### 2. Quantified claims only

Replace vague intensifiers with specifics. If you do not have a number, name the benchmark, the sample size, the authors, or the institution.

| Avoid | Prefer |
|---|---|
| “significant increase” | “from 34.0% to 51.7%” |
| “more than two-thirds” | “leakage fell by 24.1 percentage points to 9.9%” |
| “worsens the problem” | “increased answer/full-information leakage to 51.7%” |
| “a large benchmark” | “1,001 multi-hop research tasks” |
| “recent research shows” | “ServiceNow, arXiv:2605.30727” |

If a number is genuinely unavailable, say so explicitly: *“The paper does not report a public benchmark size for this secondary result.”*

### 3. Risk + opportunity framing

`why_it_matters` must describe both sides:
- **Risk:** What bad thing happens if the reader ignores this? Make it concrete to their role or organisation.
- **Opportunity:** What becomes possible if they act on it? Name the capability, cost reduction, or competitive edge.

Example structure:

> “For AI practitioners and security teams, the mosaic effect is a board-level exposure. Individual web queries from a research agent can look harmless, but in aggregate they reconstruct private strategy, metrics, and customer facts. The opportunity is that privacy-aware training now exists: agents can perform better *and* leak less, turning compliance from a drag on performance into a product differentiator.”

### 4. Time-boxed action playbook

`executive_implications` must split recommendations into three horizons so a reader knows what to do Monday morning versus next year:

- **This week** — audit, detect, or classify. Low-cost, immediate visibility.
- **This quarter** — evaluate, pilot, or run a benchmark. Requires some planning.
- **This year** — embed in lifecycle, change vendor requirements, or build infrastructure.

Use those exact headings in Markdown:

```markdown
**This week**
- Pull a sample of queries from any research agent with internal-doc access.
- Classify them for specificity (projects, metrics, customers, dates).

**This quarter**
- Run the open MosaicLeaks benchmark against your agent.
- Identify which internal documents produce the most revealing query patterns.

**This year**
- Add privacy rewards to your RL or fine-tuning pipeline.
- Build a query-sanitisation gate before public search APIs.
```

### 5. Verified, multi-source provenance

Every claim must be traceable. The generation pipeline stores source references automatically. Human editors must ensure:
- The primary source is named in the first paragraph.
- At least one corroborating authoritative source is cited (arXiv, official blog, regulator, reputable outlet).
- Course recommendations are on-theme. If no suitable free course exists, flag the gap instead of inserting an irrelevant link.

Source references are stored as JSON in `source_references_json`:

```json
[
  { "title": "MosaicLeaks: Privacy Risks in Querying-in-the-Open for Deep Research Agents (arXiv:2605.30727)", "url": "https://arxiv.org/abs/2605.30727" },
  { "title": "MosaicLeaks: Can your research agent keep a secret? (Hugging Face blog)", "url": "https://huggingface.co/blog/ServiceNow/mosaicleaks" }
]
```

## Field-by-field guidance

| Field | Role | Standard |
|---|---|---|
| `title` | Headline | Specific, under 85 chars, editorially reframed from source. |
| `summary` | Executive TL;DR + framing | 3–5 bullets + 1 sentence. Contains numbers. |
| `why_it_matters` | Stakes | Risk + opportunity, one concrete use-case, one honest limitation. |
| `what_changed` | Mechanism | What works, what changed, quantified results, current limitation. |
| `executive_implications` | Playbook | This week / This quarter / This year actions. |
| `primary_course_rationale` | On-ramp | Who the course is for, what they learn, honest limitation, why it fits this article. Empty if no course is linked. |
| `meta_description` | SEO | Under 155 chars, factual, keyword-rich. |
| `categories_json` | Taxonomy | 1–3 categories from the approved list that reflect content, not just title. |

## Approved categories

See `src/lib/classify-article.ts` for the canonical list. Do not invent new categories outside the approved set:

- AI Governance
- AI Safety
- Foundation Models
- AI Tooling
- AI Workflow
- Ethics & Bias
- Regulation & Compliance
- Technical Implementation
- Research & Models
- AI in Business

## Voice and banned phrases

Voice:
- Operator, not consultant. Write like you are explaining to a competent colleague who is short on time.
- Plain English. No jargon without immediate definition.
- Active voice where possible.

Banned phrases and clichés:
- force multiplier
- unprecedented
- game-changing
- transformational
- cutting-edge
- revolutionary
- robust
- holistic
- paradigm shift
- leverage (as verb)
- synergy
- seamlessly
- bridge the gap
- digital transformation
- unlock value
- move the needle (without numbers)
- thought leadership (self-referential)

Also avoid vague intensifiers unless paired with a number:
- significant, substantial, dramatic, major, considerable, meaningful, impressive

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Generic hook with no numbers | Reader cannot assess urgency. | Add the headline metric in the first bullet. |
| Strategic platitudes | Tells reader to “invest in AI” without specifics. | Split into This week / This quarter / This year. |
| Off-topic course link | Destroys trust; looks like random affiliate stuffing. | Flag gap or search for a directly relevant course. |
| Single source | Reader cannot verify or corroborate. | Add one authoritative secondary source. |
| No failure mode | Sounds like marketing, not analysis. | Include one honest limitation or risk. |
| Long dense paragraphs | Mobile readers bounce. | Use bullets, short paragraphs, and section headings. |

## Example: full-field rewrite

**Topic:** MosaicLeaks research-agent privacy leak

**Title:** `MosaicLeaks: Can Your Research Agent Keep a Secret? A C-Suite Briefing`

**Summary (TL;DR):**

```markdown
- Deep-research agents that search the open web while reading your internal documents are leaking sensitive facts — often without triggering any obvious alarm.
- The mosaic effect means individual queries can look harmless, but together they reveal private strategy, metrics, or research intent.
- Training agents purely for performance makes the problem worse: leakage rose from 34.0% to 51.7% in the study.
- Privacy-Aware Deep Research (PA-DR) fixes the trade-off: task success improved from 48.7% to 58.7% while answer/full-information leakage dropped from 34.0% to 9.9%.
- Leaders should treat outbound agent query logs as a new data-exposure surface and add privacy rewards to their RL training pipeline.

Enterprise AI agents increasingly combine private documentation and public web tools, creating a privacy gap that traditional DLP tools do not cover.
```

**Why it matters:**

> Enterprise AI agents are increasingly given access to both private documentation and public web tools. When an agent formulates a web query, it naturally includes context from the documents it has just read. A single query like “Q3 churn rate for mid-market SaaS in 2024” may look generic; combined with earlier queries about your product roadmap and customer segments, it becomes a reconstructible fingerprint of your internal data. The MosaicLeaks benchmark is the first large-scale test of this risk. For security and AI leaders, the upside is that privacy-aware training can now be a performance enabler, not just a compliance tax.

**What changed:**

> The MosaicLeaks benchmark — built by ServiceNow researchers and published on arXiv — contains 1,001 multi-hop research tasks that force agents to interleave private enterprise documents with public web search. The researchers measured leakage at three levels: intent leakage, answer leakage, and full-information leakage. Standard “do not leak” prompts helped only marginally. Worse, optimising purely for task success increased answer/full-information leakage to 51.7% — performance gains came at a direct privacy cost. The proposed fix, Privacy-Aware Deep Research (PA-DR), uses reinforcement learning with two rewards: task success and a learned privacy classifier. On Qwen3-4B-Instruct, PA-DR raised chain success from 48.7% to 58.7% while cutting answer/full-information leakage from 34.0% to 9.9%.

**Executive implications:**

```markdown
**This week**
- Pull a sample of queries from any research agent that has access to internal docs.
- Classify them for specificity: do they name internal projects, metrics, customers, or dates?
- Check whether your current “do not leak” prompt has any measurable effect.

**This quarter**
- Run a MosaicLeaks-style evaluation on your agent using the open benchmark.
- Identify which internal documents or workflows produce the most revealing query patterns.

**This year**
- Add privacy rewards to your agent RL or fine-tuning pipeline. If you are not training your own model, demand this capability from your agent vendor.
- Build a query-sanitisation gate that strips or generalises identifying details before they hit public search APIs.
```

## How this framework is maintained

- **Source of truth:** this file (`docs/curation-framework.md`).
- **Applied by:** article generator prompts, regeneration prompt, admin editor hints, and human review.
- **Updated via:** PR that changes this file and the corresponding prompts/UI in the same commit.
- **Reviewed quarterly** against reader feedback scores and editorial audit logs.
