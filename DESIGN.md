---
name: BytesAI Learning
description: A curated discovery platform for verified-free AI courses, designed with editorial precision and human curation.
colors:
  editorial-violet: "oklch(0.52 0.20 258)"
  editorial-violet-hover: "oklch(0.57 0.22 258)"
  editorial-violet-soft: "oklch(0.94 0.04 258)"
  verified-teal: "oklch(0.65 0.15 195)"
  verified-teal-soft: "oklch(0.94 0.03 195)"
  attention-amber: "oklch(0.78 0.16 85)"
  attention-amber-soft: "oklch(0.95 0.04 85)"
  signal-emerald: "oklch(0.70 0.17 160)"
  signal-emerald-soft: "oklch(0.95 0.04 85)"
  caution-rose: "oklch(0.62 0.20 15)"
  cool-paper: "oklch(0.99 0.004 270)"
  cool-sheet: "oklch(0.975 0.006 270)"
  card-surface: "oklch(1.0 0.001 270)"
  card-surface-hover: "oklch(0.98 0.008 270)"
  ink: "oklch(0.18 0.015 270)"
  soft-ink: "oklch(0.44 0.012 270)"
  whisper: "oklch(0.62 0.008 270)"
  dark-paper: "oklch(0.14 0.020 270)"
  dark-card: "oklch(0.19 0.022 270)"
  dark-ink: "oklch(0.94 0.006 270)"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
  3xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.editorial-violet}"
    textColor: "white"
    rounded: "{rounded.full}"
    padding: "0.75rem 1.5rem"
  button-primary-hover:
    backgroundColor: "{colors.editorial-violet-hover}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0.75rem 1.5rem"
  card:
    backgroundColor: "{colors.card-surface}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.cool-sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.soft-ink}"
    rounded: "{rounded.full}"
    padding: "0.5rem 0.75rem"
  nav-link-active:
    backgroundColor: "{colors.editorial-violet-soft}"
    textColor: "{colors.editorial-violet}"
    rounded: "{rounded.full}"
    padding: "0.5rem 0.75rem"
---

# Design System: BytesAI Learning

## 1. Overview

**Creative North Star: "The Editor's Desk"**

BytesAI Learning is a curated discovery platform, and its interface should feel like a trusted editor has already done the sorting. The visual system is built around restraint, hierarchy, and clarity: generous whitespace, a single disciplined accent, and typography that does the communicating. Every surface reinforces that the product is making choices on the user's behalf — not aggregating everything and asking them to filter.

The design rejects the generic SaaS dark-mode clone, the cold blue/purple space aesthetic, the hero-metric landing page, and the marketplace chaos of catalogues. It also avoids Coursera's corporate heaviness and Udemy's visual noise. The result is a light-first, editorially precise environment where users can scan, compare, and act without friction.

**Key Characteristics:**
- Light default, dark by choice. Both themes use cool tinted neutrals with a single violet accent.
- One type family, Inter, used across display, body, and labels. Hierarchy comes from weight and scale, not font switching.
- Cards and containers sit on slightly lifted surfaces with soft shadows; depth is structural, not decorative.
- Touch targets are generous; motion is short, ease-out, and reserved for state feedback.
- The accent color is used sparingly. It carries primary actions, current navigation, and verified states — never decoration.

## 2. Colors

The palette is built on cool, barely-tinted neutrals with one saturated violet accent and a small set of semantic accents for verification, attention, success, and caution.

### Primary
- **Editorial Violet** (`oklch(0.52 0.20 258)`): Primary actions, links, active navigation, and verified badges. It is the only accent on most screens.
- **Editorial Violet Hover** (`oklch(0.57 0.22 258)`): Hover state for primary buttons and links.
- **Editorial Violet Soft** (`oklch(0.94 0.04 258)`): Subtle backgrounds for selected states, hover tints, and callout boxes.

### Secondary
- **Verified Teal** (`oklch(0.65 0.15 195)`): Certificate, verified, and informational states.
- **Verified Teal Soft** (`oklch(0.94 0.03 195)`): Background tint for teal-accented callouts.

### Tertiary
- **Attention Amber** (`oklch(0.78 0.16 85)`): Affiliate disclosures, warnings, and Alison-specific calls-to-action.
- **Signal Emerald** (`oklch(0.70 0.17 160)`): Free labels, success states, and positive feedback.
- **Caution Rose** (`oklch(0.62 0.20 15)`): Errors, destructive actions, and negative feedback.

### Neutral
- **Cool Paper** (`oklch(0.99 0.004 270)`): Default page background.
- **Cool Sheet** (`oklch(0.975 0.006 270)`): Alternate sections, input backgrounds, and subtle panels.
- **Card Surface** (`oklch(1.0 0.001 270)`): Cards, modals, and elevated containers.
- **Card Surface Hover** (`oklch(0.98 0.008 270)`): Hover state for cards and interactive panels.
- **Ink** (`oklch(0.18 0.015 270)`): Primary text and headings.
- **Soft Ink** (`oklch(0.44 0.012 270)`): Secondary text, descriptions, and body copy.
- **Whisper** (`oklch(0.62 0.008 270)`): Muted labels, timestamps, and disabled text.

### Dark mode
- **Dark Paper** (`oklch(0.14 0.020 270)`): Default dark background.
- **Dark Card** (`oklch(0.19 0.022 270)`): Elevated surfaces in dark mode.
- **Dark Ink** (`oklch(0.94 0.006 270)`): Primary text in dark mode.

### Named Rules
**The One Accent Rule.** Editorial Violet is the only accent on 90% of any screen. Secondary semantic colors (teal, amber, emerald, rose) are reserved for specific states and never used as decorative variety.

**The Light-First Rule.** The default experience is light. Dark mode is a first-class variant, not the primary identity.

## 3. Typography

**Display Font:** Inter (with system-ui, -apple-system, sans-serif fallback)
**Body Font:** Inter (same stack)
**Label/Mono Font:** Inter (same stack; no separate mono family)

**Character:** A single, well-tuned sans-serif family carries the entire interface. Weight and scale create hierarchy; the voice is confident and uncluttered.

### Hierarchy
- **Display** (800 weight, `clamp(2rem, 5vw, 3rem)`, line-height 1.12): Hero headlines only. Used on the homepage hero and major landing pages.
- **Headline** (700 weight, `clamp(1.5rem, 3.5vw, 2.25rem)`, line-height 1.2): Page titles and major section headers.
- **Title** (700 weight, `clamp(1.25rem, 2.5vw, 1.75rem)`, line-height 1.3): Card titles, article section headings, and secondary page headings.
- **Body** (400 weight, `1rem`, line-height 1.7): Long-form reading and descriptions. Capped at 65–75ch for readability.
- **Label** (700 weight, `0.6875rem`, letter-spacing `0.04em`, uppercase): Badges, eyebrow labels, and metadata.

### Named Rules
**The One Voice Rule.** Inter handles every text role. Do not introduce a second font for display or decorative headings.

**The Measure Rule.** Body paragraphs in long-form contexts must not exceed 75ch. Wide running text is forbidden.

## 4. Elevation

The system uses soft structural depth. Surfaces rest flat by default and lift slightly on interaction. Shadows are ambient and subtle; they communicate state and layer order, not decoration. Depth is also conveyed through background tints (`cool-sheet`, `card-surface`) and 1px borders, so even without shadows the hierarchy is clear.

### Shadow Vocabulary
- **Ambient low** (`0 1px 2px oklch(0.25 0 0 / 0.04)`): Resting state for cards and small controls.
- **Ambient medium** (`0 2px 8px oklch(0.25 0 0 / 0.06), 0 1px 2px oklch(0.25 0 0 / 0.04)`): Card hover, dropdowns, and focused panels.
- **Ambient large** (`0 8px 24px oklch(0.25 0 0 / 0.08), 0 2px 8px oklch(0.25 0 0 / 0.04)`): Modals, chat panels, and cookie banners.
- **Focus glow** (`0 0 0 3px oklch(0.52 0.20 258 / 0.2)`): Focus-visible rings on interactive elements.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear as a response to state (hover, elevation, focus).

## 5. Components

### Buttons
- **Shape:** Fully rounded pill (`border-radius: 9999px`).
- **Primary:** Editorial Violet background, white text, padding `0.75rem 1.5rem`, font-weight 600.
- **Hover / Focus:** Background shifts to Editorial Violet Hover; focus ring appears via `box-shadow: 0 0 0 3px oklch(0.52 0.20 258 / 0.2)`.
- **Outline:** Transparent background, 1.5px border in neutral, primary ink text. Hover darkens border to Editorial Violet and adds a soft violet tint.
- **Ghost:** Transparent background, soft ink text. Hover adds a cool-sheet background.
- **Sizes:** Standard and small (`btn-sm`: `0.5rem 1rem`, smaller font).

### Chips / Badges
- **Style:** Inline-flex, fully rounded pill, uppercase label typography, 1px semantic border.
- **Variants:** Free (emerald), Affiliate (amber), Certificate (teal), Level (violet), New (solid violet).
- **State:** Badges are read-only. They do not have hover states.

### Cards / Containers
- **Corner Style:** `16px` radius (`rounded-lg`), reduced to `12px` on mobile.
- **Background:** Card Surface.
- **Shadow Strategy:** Ambient low at rest, ambient medium on hover.
- **Border:** 1px solid neutral border.
- **Internal Padding:** `1.5rem` desktop, `1rem` mobile.

### Inputs / Fields
- **Style:** Cool Sheet background, 1.5px neutral border, `12px` radius, `0.75rem 1rem` padding.
- **Focus:** Border shifts to Editorial Violet, focus glow appears.
- **Error:** Border color changes to Caution Rose.
- **Placeholder:** Whisper color.

### Navigation
- **Style:** Top bar, 64px height, Card Surface background, 1px bottom border.
- **Typography:** Small sans labels, soft ink by default.
- **Default / Hover / Active:** Default is transparent with soft ink text; hover/active gains Editorial Violet Soft background and Editorial Violet text. Pill-shaped.
- **Mobile:** Collapses to a bottom navigation bar on screens ≤768px, with a floating chat bubble action.

### Course Card (Signature Component)
- **Shape:** `16px` radius card with a top header band carrying category icon, provider name, and category label.
- **Header band:** Uses a category-specific gradient (e.g., violet for LLMs, teal for governance), but gradients are confined to this component only.
- **Body:** Badges (level, free, certificate), title, snippet, provider, and a footer link.
- **Hover:** Lifts with ambient medium shadow and border hover color.

## 6. Do's and Don'ts

### Do:
- **Do** cap body paragraphs at 65–75ch in any reading context.
- **Do** use Editorial Violet as the only accent on most screens.
- **Do** use the fully rounded pill shape for primary and outline buttons.
- **Do** ensure every interactive element has a visible `:focus-visible` state.
- **Do** use reduced-motion fallbacks for any animation.
- **Do** use semantic colors only for their named purpose: emerald for free/success, amber for affiliate/warnings, teal for verified/info, rose for errors.
- **Do** maintain 44×44px minimum touch targets on mobile.

### Don't:
- **Don't** use gradient text or background-clip text for headings.
- **Don't** use glassmorphism as a default surface treatment.
- **Don't** use hero-metric templates (big number + small label + gradient accent).
- **Don't** use side-stripe borders greater than 1px as a colored accent on cards or callouts.
- **Don't** use identical card grids with icon + heading + text as the default layout pattern.
- **Don't** decorate with gradients, glows, or animations that do not carry meaning.
- **Don't** use display fonts or decorative typefaces for UI labels, buttons, or data.
- **Don't** build dark mode with cold blue/purple space aesthetics or neon accents.
- **Don't** create marketplace-style visual chaos; the curation should feel edited, not aggregated.
- **Don't** use tiny uppercase tracked eyebrows above every section heading.
