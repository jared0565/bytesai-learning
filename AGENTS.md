# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Deployment: Cloudflare Workers via @opennextjs/cloudflare

## CRITICAL: Webpack only — never Turbopack

The production build MUST use `next build --webpack`. This is enforced in `package.json`.

**DO NOT** remove `--webpack` from the build command or switch to Turbopack.

Turbopack (Next.js 16 default) produces chunk filenames (`[root-of-the-server]__hash._.js`) that are incompatible with OpenNext's chunk loader inside Cloudflare Workers. The result is `Failed to load chunk` errors and 500 on every route. This was debugged and fixed on 2026-04-01.

Other deployment rules:
- Use `middleware.ts`, not `proxy.ts` — OpenNext does not support the Next.js 16 proxy convention yet
- `export const runtime = 'edge'` is NOT needed — the Worker uses `nodejs_compat`
- `@cloudflare/next-on-pages` is deprecated and incompatible — never use it
- `--no-turbopack` flag does not exist — use `--webpack` explicitly

# D1 Database — CRITICAL

**NEVER run `wrangler d1 execute` or any wrangler D1 command.** Wrangler is not authenticated in this environment and will always fail with exit code 1.

## Schema migrations (ALTER TABLE, CREATE TABLE)
Write the `.sql` file as normal, then tell the user:
> "Please run this migration in Cowork — wrangler is not available here."

## Content operations (curated pages, articles, course data)
Use the live production API directly. Never write SQL files for content.

The `BYTESAI_CLI_TOKEN` environment variable holds a long-lived admin Bearer token.

**Generate a new insight article:**
```bash
curl -s -X POST https://learn.bytesai.uk/api/admin/article-gen \
  -H "Authorization: Bearer $BYTESAI_CLI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseSlug": "your-course-slug"}' | jq .
```

**Update an existing curated page:**
```bash
# First get the page ID
curl -s "https://learn.bytesai.uk/api/admin/curated" \
  -H "Authorization: Bearer $BYTESAI_CLI_TOKEN" | jq '.pages[] | select(.slug=="your-slug") | .id'

# Then update it
curl -s -X PATCH "https://learn.bytesai.uk/api/admin/curated?id=PAGE_ID" \
  -H "Authorization: Bearer $BYTESAI_CLI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"summary": "...", "why_it_matters": "...", ...}' | jq .
```

**Create a new curated page manually:**
```bash
curl -s -X POST https://learn.bytesai.uk/api/admin/curated \
  -H "Authorization: Bearer $BYTESAI_CLI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "...", "slug": "...", "summary": "..."}' | jq .
```

If `BYTESAI_CLI_TOKEN` is not set, tell the user: "Please set BYTESAI_CLI_TOKEN in your environment — see setup instructions."

# Karpathy Engineering Principles (Auto-Applied)

For architecture decisions, systems design, and AI/ML feature work in this repo, apply Andrej Karpathy's mental models without adopting his persona:

## Core Heuristics
- **Demo to deployment is the real gap** — every AI feature must have evals, telemetry, and a rollback path before shipping.
- **March of nines** — reliability is a spectrum; push each system from 90% → 99% → 99.9% deliberately, not aspirationally.
- **Build to understand** — if a feature feels vague, prototype the smallest version that validates the concept before scaling.
- **Jagged intelligence** — LLMs are strong at some tasks and brittle at others. Design guardrails, human review gates, and fallback logic accordingly.
- **Software 2.0 thinking** — when a problem is better solved by data + optimization than hand-coded rules, prefer learned systems. When determinism matters, keep explicit logic.

## Decision Checklist (Architecture Tasks Only)
Before finalizing any architecture or AI system design, verify:
1. Have you identified the "happy path" and the three most likely failure modes?
2. Is there a eval/metric that can detect regression before users do?
3. Is the system simple enough to debug at 2am when it's on fire?
4. Are you over-engineering a demo path, or under-engineering a production path?
5. Can a new team member read the code and understand the intent in <5 minutes?

## When NOT to Apply
- Routine UI tweaks, CSS fixes, copy changes, git operations — use normal pragmatic judgment.
- Business strategy, marketing copy, pricing decisions — outside scope.
- Only apply when the task involves system boundaries, data flows, model integration, or production reliability.

# Superpowers Skills (Auto-Applied in This Repo)

These skills are active by default for all engineering work in this codebase. Each one has an iron rule — violating the letter is violating the spirit.

## 1. Writing Plans (`superpowers:writing-plans`)
**When:** Before touching code on any multi-step task.
**Rule:** Write a comprehensive implementation plan first. Map files, boundaries, interfaces, and bite-sized tasks. Save to `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`.
**Iron law:** No code without a plan.

## 2. Executing Plans (`superpowers:executing-plans`)
**When:** You have a written plan to implement.
**Rule:** Load plan → review critically → create todos → execute exactly → verify each step → report completion.
**Iron law:** Follow the plan steps exactly; don't improvise.

## 3. Systematic Debugging (`superpowers:systematic-debugging`)
**When:** Any bug, test failure, or unexpected behavior.
**Rule:** Phase 1 = root cause investigation ONLY. No fixes until root cause is found. Phase 2 = fix + verify.
**Iron law:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.

## 4. Test-Driven Development (`superpowers:test-driven-development`)
**When:** New features, bug fixes, refactoring, behavior changes.
**Rule:** Write test → watch it fail → write minimal code to pass → refactor.
**Iron law:** If you didn't watch the test fail, you don't know if it tests the right thing.

## 5. Verification Before Completion (`superpowers:verification-before-completion`)
**When:** About to claim work is complete, fixed, or passing.
**Rule:** Identify verification command → run it fresh → confirm output → THEN claim status.
**Iron law:** NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.

## 6. Receiving Code Review (`superpowers:receiving-code-review`)
**When:** Processing PR feedback or review comments.
**Rule:** Read → Understand → Verify against codebase → Evaluate technical soundness → Respond technically or push back → Implement one item at a time.
**Iron law:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## 7. Finishing a Development Branch (`superpowers:finishing-a-development-branch`)
**When:** Implementation is complete and tests pass; deciding how to integrate.
**Rule:** Verify tests → detect environment → present options (merge/PR/cleanup) → execute choice → clean up.
**Iron law:** Never present "we're done" without fresh test evidence.


## 8. Using Git Worktrees (superpowers:using-git-worktrees)
**When:** Starting feature work that needs isolation from the current workspace.
**Rule:** Detect existing isolation first → prefer native worktree tools → fall back to git worktree add only if no native tool exists.
**Iron law:** Never fight the harness — detect first, then use native, then fall back.

## 9. Subagent-Driven Development (superpowers:subagent-driven-development)
**When:** Executing an implementation plan with independent tasks in the current session.
**Rule:** Dispatch one fresh subagent per task with isolated context → two-stage review after each (spec compliance first, then code quality) → mark complete → move to next task without pausing.
**Iron law:** Fresh subagent per task + two-stage review = high quality, fast iteration. Do not pause to check in between tasks.

## 10. Dispatching Parallel Agents (superpowers:dispatching-parallel-agents)
**When:** Facing 2+ independent tasks/problems that can be worked on without shared state or sequential dependencies.
**Rule:** Group failures by domain → dispatch one agent per independent problem → let them work concurrently.
**Iron law:** Dispatch one agent per independent problem domain. Let them work concurrently.

## Exceptions (Ask Human Partner)
- Throwaway prototypes
- Generated/config-only changes
- One-liner fixes with no behavioral impact

# Impeccable Frontend Design Skill (Auto-Applied)

Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states.

## Activation Triggers
- Explicit: `$impeccable`, `$impeccable craft`, `$impeccable critique`, etc.
- Implicit: requests involving UX review, visual hierarchy, typography, layout, color, motion, micro-interactions, responsive behavior, accessibility, theming, or design system work.
- NOT triggered for backend-only or non-UI tasks.

## Available Commands
| Command | Purpose |
|---------|---------|
| `craft [feature]` | Shape, then build a feature end-to-end |
| `shape [feature]` | Plan UX/UI before writing code |
| `teach` | Set up PRODUCT.md and DESIGN.md context |
| `document` | Generate DESIGN.md from existing project code |
| `extract [target]` | Pull reusable tokens/components into design system |
| `critique [target]` | UX design review with heuristic scoring |
| `audit [target]` | Technical quality checks (a11y, perf, responsive) |
| `polish [target]` | Final quality pass before shipping |
| `bolder [target]` | Amplify safe or bland designs |
| `quieter [target]` | Tone down aggressive designs |
| `distill [target]` | Strip to essence, remove complexity |
| `harden [target]` | Production-ready: errors, i18n, edge cases |
| `onboard [target]` | First-run flows, empty states, activation |
| `animate [target]` | Purposeful animations and motion |
| `colorize [target]` | Strategic color to monochromatic UIs |
| `typeset [target]` | Typography hierarchy and fonts |
| `layout [target]` | Spacing, rhythm, and visual hierarchy |
| `delight [target]` | Personality and memorable touches |
| `overdrive [target]` | Push past conventional limits |
| `clarify [target]` | UX copy, labels, and error messages |
| `adapt [target]` | Different devices and screen sizes |
| `optimize [target]` | Diagnose and fix UI performance |
| `live` | Visual variant mode in browser |

## Preflight Requirements (Before Any Design Edit)
1. **Context** — PRODUCT.md / DESIGN.md loaded via `node .agents/skills/impeccable/scripts/load-context.mjs`
2. **Product** — PRODUCT.md exists and is meaningful (>200 chars, no `[TODO]`)
3. **Command reference** — matching reference loaded for sub-commands
4. **Shape** — user-confirmed shape brief for `craft` tasks
5. **Image** — visual probes generated or skipped with reason

If PRODUCT.md is missing/placeholder: run `$impeccable teach` first.
If DESIGN.md is missing: nudge once per session to run `$impeccable document`.

## Design Laws (Shared)
- Use OKLCH for color. Never `#000` or `#fff`.
- Pick a color strategy: Restrained / Committed / Full palette / Drenched.
- Theme (dark/light) needs a physical scene sentence — never default.
- Cap body line length at 65–75ch.
- Vary spacing for rhythm. Cards are lazy; nested cards are wrong.
- Don't animate CSS layout properties.
- Ease out with exponential curves (ease-out-quart / quint / expo).
- Every word earns its place. No em dashes.
- If someone could say "AI made that" without doubt, it failed.

## Absolute Bans
- Side-stripe borders as colored accent
- Gradient text (`background-clip: text`)
- Glassmorphism as default
- Hero-metric template
- Identical card grids
- Modal as first thought
