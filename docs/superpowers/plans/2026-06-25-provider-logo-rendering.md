# Provider Logo Rendering

## Objective

Show each provider's actual stored logo on the public providers page, provider detail hero, and admin provider list. Keep the existing initials or building icon as the fallback when a provider has no `logo_url` or the image fails to load.

## Current Findings

- `providers.logo_url` already exists in the `Provider` model.
- Admin provider forms already support URL and upload workflows for `logo_url`.
- `ProviderLogo` currently ignores `logo_url` and renders only the hard-coded initials map or the generic `Building2` icon.
- The public providers page, provider detail page, and admin providers table already share `ProviderLogo`, so the rendering fix can stay centralized.
- `BYTESAI_CLI_TOKEN` is not set in this shell, so production logo population cannot be inspected or changed from here.
- Live verification after the first render fix showed the deployed page chunk was updated, but provider cards still SSR-rendered initials/icons. That indicates production provider rows either lack `logo_url` values or do not have them populated for the visible cards.
- `src/app/api/admin/provider-logos/route.ts` already uses Clearbit logo URLs and Google favicon URLs as the approved derivation strategy.

## Trust Boundaries And Risks

- Provider logos can be remote URLs or same-origin uploaded assets. Treat them as untrusted image URLs and render them only as image resources, never as HTML.
- Failed or missing images must degrade to the current stable representation, not broken image icons.
- Layout must not shift when the image loads or fails.
- Do not add a dependency for image fallback behavior.
- Do not change production provider data or run remote D1 SQL.

## Implementation Plan

1. Extend `ProviderLogo` with optional logo candidate URLs.
2. Render a constrained `<img>` first when a stored or derived logo candidate is present.
3. Track image load failure client-side and try the next candidate before falling back to the current initials/building representation.
4. Keep fixed dimensions, object-fit containment, accessible alt text, and a neutral logo surface that works in light and dark mode.
5. Add a shared provider-logo helper that returns candidates in this order: stored `logo_url`, Clearbit logo URL from `website_url`, Google favicon URL from `website_url`.
6. Pass provider logo candidates from the public providers page, provider detail page, and admin providers page.
7. Reuse the helper in the admin provider-logo route to keep derivation behavior synchronized.

## Verification

1. Run `npx tsc --noEmit`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Run `graphite -v build .` and `graphite check .`.
5. If feasible, run the app locally and inspect `/providers` with a provider that has `logo_url`; otherwise verify markup and fallback behavior through code and build output.
