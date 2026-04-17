-- Visitor analytics: sessions, page views, CTA click tracking
-- Run in Cowork (wrangler d1 execute)

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  user_id TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  duration_seconds INTEGER,
  referrer TEXT,
  user_agent TEXT,
  started_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  path TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES visitor_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cta_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  user_id TEXT,
  cta_type TEXT NOT NULL CHECK (cta_type IN ('sign_in', 'get_started', 'create_account')),
  path TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES visitor_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor ON visitor_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_started ON visitor_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country ON visitor_sessions(country);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_occurred ON page_views(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_events_session ON cta_events(session_id);
CREATE INDEX IF NOT EXISTS idx_cta_events_type ON cta_events(cta_type);
