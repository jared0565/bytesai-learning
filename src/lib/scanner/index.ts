/**
 * Scanner registry — all supported provider scanners.
 */

import type { D1Database } from '@/lib/db';
import { microsoftScanner } from './microsoft';
import type { CatalogScanner, ScanResult } from './types';

export * from './types';

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
