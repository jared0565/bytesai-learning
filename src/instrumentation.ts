/**
 * Next.js instrumentation hook — runs once when the server starts.
 * In local dev: sets up a local SQLite D1 adapter so all DB calls work
 * without Cloudflare Workers runtime.
 */
export async function register() {
  // Only in Node.js runtime (not edge), only in development
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NODE_ENV !== 'production'
  ) {
    const { setupLocalDB } = await import('./lib/local-d1');
    await setupLocalDB();
  }
}
