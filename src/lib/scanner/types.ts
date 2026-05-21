/**
 * Scanner types — shared across all provider catalog scanners.
 */

import type { D1Database } from '@/lib/db';

export interface ScannedCourse {
  title: string;
  url: string;
  status: 'new' | 'existing';
  existingSlug?: string;
  meta?: {
    title: string | null;
    description: string | null;
    image: string | null;
  };
}

export interface CatalogScanner {
  id: string;          // provider slug
  name: string;        // display name
  catalogUrl: string;  // human-readable catalog page
  scan(opts: { limit: number; db: D1Database; url?: string }): Promise<ScannedCourse[]>;
}

export interface ScanResult {
  provider: string;
  total: number;
  new: number;
  existing: number;
  courses: ScannedCourse[];
}
