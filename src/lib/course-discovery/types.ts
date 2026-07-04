import type { Course, D1Database, Provider } from '@/lib/db';

export type DiscoveryJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type DiscoveryCandidateStatus = 'new' | 'existing' | 'approved' | 'ignored' | 'rejected' | 'stale' | 'failed';
export type DiscoveryReviewAction = 'ignore' | 'reject' | 'restore';

export interface CourseDiscoveryJob {
  id: string;
  provider_id: string;
  admin_user_id: string;
  status: DiscoveryJobStatus;
  strategy_id: string;
  source_url: string | null;
  requested_limit: number;
  found_count: number;
  new_count: number;
  existing_count: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseDiscoveryCandidate {
  id: string;
  job_id: string;
  provider_id: string;
  normalized_url: string;
  url_hash: string;
  title: string;
  description: string | null;
  image_url: string | null;
  detected_content_type: string | null;
  detected_level: string | null;
  free_evidence: string | null;
  confidence: number;
  status: DiscoveryCandidateStatus;
  existing_course_id: string | null;
  source_url: string | null;
  raw_json: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_course_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscoveryCandidateInput {
  title: string;
  url: string;
  description?: string | null;
  imageUrl?: string | null;
  detectedContentType?: string | null;
  detectedLevel?: string | null;
  freeEvidence?: string | null;
  confidence?: number;
  raw?: Record<string, unknown> | null;
}

export interface DiscoveryInput {
  db: D1Database;
  provider: Provider;
  sampleCourses: Pick<Course, 'id' | 'slug' | 'title' | 'official_link' | 'destination_url'>[];
  sourceUrl: string | null;
  limit: number;
}

export interface DiscoveryStrategy {
  id: string;
  label: string;
  canHandle(provider: Provider): boolean;
  getDefaultSourceUrl(input: Omit<DiscoveryInput, 'db' | 'limit' | 'sourceUrl'>): string | null;
  discover(input: DiscoveryInput): Promise<DiscoveryCandidateInput[]>;
}

export interface CandidateCounts {
  total: number;
  new: number;
  existing: number;
  approved: number;
  ignored: number;
  rejected: number;
  stale: number;
  failed: number;
}

export interface ExistingCourseMatch {
  id: string;
  slug: string;
}

export interface RunDiscoveryOptions {
  strategyId?: string;
  sourceUrl?: string | null;
  limit?: number;
}

export interface RunDiscoveryResult {
  provider: Pick<Provider, 'id' | 'slug' | 'name' | 'website_url' | 'logo_url'>;
  job: CourseDiscoveryJob;
  counts: CandidateCounts;
  candidates: CourseDiscoveryCandidate[];
}
