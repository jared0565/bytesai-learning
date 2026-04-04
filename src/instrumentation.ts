/**
 * Next.js instrumentation hook.
 * Local dev DB setup is handled by next.config.ts via initOpenNextCloudflareForDev().
 * This file is intentionally minimal for Cloudflare Workers compatibility.
 */
export async function register() {
  // no-op in production
}
