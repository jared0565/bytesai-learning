// KV cache client — Cloudflare KV binding
// KV is only used for: featured cache, trending snapshot, provider list, chatbot routing cache
// D1 is always source of truth

export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number; expiration?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

export async function getKV(): Promise<KVNamespace | null> {
  // Local dev: no KV available
  const localKV = (globalThis as Record<string, unknown>).KV as KVNamespace | undefined;
  if (localKV) return localKV;

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    return (env as Record<string, unknown>).KV as KVNamespace | undefined ?? null;
  } catch {
    return null;
  }
}

// ─── Cache keys ───────────────────────────────────────────────────────

export const CacheKey = {
  featuredCourses: 'featured:homepage',
  trending: (limit: number) => `trending:${limit}`,
  providers: 'providers:all',
  categories: 'categories:all',
  courseDetail: (slug: string) => `course:${slug}`,
  curatedPages: 'curated:published',
  chatbotRules: 'chatbot:rules',
} as const;

// TTLs in seconds
export const TTL = {
  featured: 300,       // 5 minutes
  trending: 300,       // 5 minutes
  providers: 3600,     // 1 hour
  categories: 3600,    // 1 hour
  courseDetail: 1800,  // 30 minutes
  curated: 600,        // 10 minutes
  chatbotRules: 600,   // 10 minutes
} as const;

// ─── Typed helpers ────────────────────────────────────────────────────

export async function cacheGet<T>(kv: KVNamespace | null, key: string): Promise<T | null> {
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(kv: KVNamespace | null, key: string, value: unknown, ttl: number): Promise<void> {
  if (!kv) return;
  try {
    await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
  } catch {
    // Non-fatal — D1 is source of truth
  }
}

export async function cacheDelete(kv: KVNamespace | null, key: string): Promise<void> {
  if (!kv) return;
  try {
    await kv.delete(key);
  } catch {
    // Non-fatal
  }
}

export async function cacheClear(kv: KVNamespace | null, prefix: string): Promise<void> {
  if (!kv) return;
  try {
    const list = await kv.list({ prefix });
    await Promise.all(list.keys.map(k => kv.delete(k.name)));
  } catch {
    // Non-fatal
  }
}
