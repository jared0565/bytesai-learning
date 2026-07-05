# Native Social Image Workflow

## Objective
Make social posting resilient when platform link-card unfurling fails by giving admins a native-image workflow for insight sharing.

## Architecture Decision
- Do not store PNG bytes in D1 insight rows. D1 should hold metadata and text, not multi-megabyte binary assets.
- Use the existing `/api/og?type=article&slug=...` PNG renderer as the image source.
- In the share composer, provide:
  - Copy image to clipboard, for platforms that accept pasted images in the composer.
  - Download image card, for manual upload.
  - Copy text + link, preserving existing workflow.
- Future hardening can persist generated cards to R2 and store only the R2 URL in `curated_pages`.

## Constraints
- X/LinkedIn/Facebook web share intent URLs do not provide a reliable way to attach an uploaded image file.
- Any true direct posting/upload integration requires platform OAuth scopes, API review, token storage, rate-limit handling, and an audit trail.
- Keep this change client-side and scoped to the existing share composer.

## Plan
1. Add shared image clipboard/download helpers to curated share components.
2. Show native-image guidance for X, LinkedIn, and Facebook, not only Facebook.
3. Keep “Open platform” behavior, but pair it with copy/download image actions.
4. Add focused regression tests for the composer source.
5. Run the test suite and deploy through GitHub Actions.
