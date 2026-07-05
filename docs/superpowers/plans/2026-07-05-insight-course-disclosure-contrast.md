# Insight Course Disclosure Contrast Fix

## Objective
Fix the unreadable affiliate disclosure under the inline recommended course CTA on curated insight pages.

## Root Cause
- `CourseSpecTable` renders affiliate disclosure copy at `0.72rem` using `var(--text-muted)`.
- On the article aside background (`var(--bg-alt)`), `var(--text-muted)` has approximately 3.39:1 contrast, below the 4.5:1 target for small text.

## Plan
1. Add a focused regression test that requires the affiliate disclosure to use a dedicated class instead of raw muted inline styling.
2. Add a scoped CSS class with stronger text color and readable small-text sizing.
3. Update `CourseSpecTable` to use that class.
4. Run the focused test and the full existing test suite.
5. Report verification and deployment status separately.
