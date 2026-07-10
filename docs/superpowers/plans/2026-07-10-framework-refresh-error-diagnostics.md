# Framework Refresh Error Diagnostics

## Objective

Replace the generic "AI restructure failed" message with actionable admin-safe diagnostics when the curated framework refresh cannot call or parse the AI provider response.

## Root Cause

The live failure for `cp-JE7uMZYeBl` was reproduced against OpenRouter. The configured model `google/gemini-3.1-flash-lite-preview` returned HTTP 402 with `Insufficient credits`. The route collapsed all provider failures, JSON parse failures, and validation failures into `null`, so the UI showed only `AI restructure failed`.

## Changes

1. Change `aiRestructure` to return a typed result instead of `RestructuredPage | null`.
2. Map provider failures to safe messages:
   - 402: OpenRouter has insufficient credits.
   - 401/403: provider credentials/permissions problem.
   - 429: provider rate limit.
   - 5xx: provider unavailable.
   - timeout/network: provider request timed out or failed.
3. Keep raw provider bodies out of UI responses.
4. Preserve successful update behavior unchanged.

## Verification

Run `npm run build`.
