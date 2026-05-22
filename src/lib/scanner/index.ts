/**
 * Scanner registry and discovery exports.
 */

import type { D1Database } from '@/lib/db';
import { microsoftScanner } from './microsoft';
import type { CatalogScanner, ScanResult } from './types';
import { getProvidersWithSamples, discoverProviderCourses } from './discovery';

export * from './types';
export * from './discovery';

const registry = new Map<string, CatalogScanner>([
  [microsoftScanner.id, microsoftScanner],
]);

export function getScanner(id: string): CatalogScanner | undefined {
  return registry.get(id);
}

export function listScanners(): CatalogScanner[] {
  return Array.from(registry.values());
}

export async function runScan(
  providerId: string,
  opts: { limit: number; db: D1Database; url?: string }
): Promise<ScanResult | null> {
  const scanner = getScanner(providerId);
  if (!scanner) return null;

  const courses = await scanner.scan(opts);
  const newCount = courses.filter(c => c.status === 'new').length;
  const existingCount = courses.filter(c => c.status === 'existing').length;

  return {
    provider: scanner.name,
    total: courses.length,
    new: newCount,
    existing: existingCount,
    courses,
  };
}

/**
 * Discover courses for all providers that have existing courses.
 */
export async function discoverAll(
  db: D1Database,
  opts: { limit: number }
) {
  const providers = await getProvidersWithSamples(db);
  const results: Array<{
    provider: { id: string; name: string };
    catalogUrl: string | null;
    courses: Awaited<ReturnType<typeof discoverProviderCourses>>;
  }> = [];

  for (const provider of providers) {
    const catalogUrl = (await import('./discovery')).deriveCatalogUrl(provider);
    const courses = await discoverProviderCourses(provider, { ...opts, db });
    results.push({ provider: { id: provider.id, name: provider.name }, catalogUrl, courses });
  }

  return results;
}
