PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS course_discovery_jobs (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  admin_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  strategy_id TEXT NOT NULL,
  source_url TEXT,
  requested_limit INTEGER NOT NULL DEFAULT 25,
  found_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  existing_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_course_discovery_jobs_provider_created
  ON course_discovery_jobs(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_discovery_jobs_status_created
  ON course_discovery_jobs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS course_discovery_candidates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  detected_content_type TEXT,
  detected_level TEXT,
  free_evidence TEXT,
  confidence REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('new','existing','approved','ignored','rejected','stale','failed')),
  existing_course_id TEXT,
  source_url TEXT,
  raw_json TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_course_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES course_discovery_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  FOREIGN KEY (existing_course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_course_id) REFERENCES courses(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_discovery_candidates_provider_hash
  ON course_discovery_candidates(provider_id, url_hash);

CREATE INDEX IF NOT EXISTS idx_course_discovery_candidates_provider_status_created
  ON course_discovery_candidates(provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_discovery_candidates_job
  ON course_discovery_candidates(job_id);
