# Plan: Redesign CuratedSharePanel with platform tabs

**Date:** 2026-06-21  
**Scope:** `src/components/ui/CuratedSharePanel.tsx`

## Goal

Improve the share modal UX for the "cross-post to other platforms" tip:
- Make the generated copy preview much taller and easier to read.
- Replace the stacked platform list + single preview with **tabs for each platform**.
- Each tab shows its platform-specific generated copy in a tall textarea.
- Keep copy/link actions per platform.

## Proposed UX

1. Clicking **Share this insight** opens the existing modal.
2. Inside the modal, a horizontal tab bar shows:
   - X / Twitter
   - LinkedIn
   - WhatsApp
   - Facebook
3. The selected tab is highlighted with the platform brand color.
4. Below the tabs:
   - **Tall textarea** (min 180px, ~10+ rows for LinkedIn) containing the generated copy.
   - Character count badge.
   - Action buttons: **Copy text + link**, **Open [platform]**, **Regenerate**.
   - Link preview card (kept, shown under the textarea).
   - Platform-specific guidance (e.g. LinkedIn note, Facebook native image tip).
5. Growth tips remain at the bottom.

## Implementation

### File changes

| File | Change |
|---|---|
| `src/components/ui/CuratedSharePanel.tsx` | Replace platform grid with tabs; increase textarea rows/height; restructure layout so preview is prominent. |

### Layout changes

Current:
- Platform grid (2 columns) at top.
- Link preview below.
- Generated copy area below (textarea rows=5 for X, 14 for LinkedIn).
- Growth tips at bottom.

New:
- Horizontal tab bar at top.
- Tall generated copy textarea immediately below tabs.
- Link preview card to the side or below, smaller.
- Actions under textarea.
- Platform-specific guidance inline.
- Growth tips at bottom.

### Visual details

- Modal max-width: keep 560px or bump to 640px.
- Textarea: min-height 180px, rows 8 (X/WhatsApp/Facebook) / 16 (LinkedIn).
- Tabs: pill-style, brand color underline/border when active.
- Preserve all existing functionality: share URLs, copy, regenerate, image download, short URL.

### Accessibility

- Tabs use `role="tablist"`, `role="tab"`, `aria-selected`.
- Keyboard navigation nice-to-have but not required for MVP.

## Verification

- `next build --webpack` passes.
- Modal opens from article page and admin page.
- Each tab loads/generates platform copy.
- Copy + link and Open platform buttons work.
- LinkedIn textarea is tall and readable.
