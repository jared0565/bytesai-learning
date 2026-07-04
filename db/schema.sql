PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner','admin')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('email','google','linkedin')),
  provider_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(provider, provider_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  dark_mode INTEGER NOT NULL DEFAULT 0,
  timezone TEXT DEFAULT 'Europe/London',
  learning_goal TEXT,
  preferred_format TEXT,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  website_url TEXT,
  affiliate_enabled INTEGER NOT NULL DEFAULT 0,
  affiliate_disclosure TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  provider_id TEXT,
  title TEXT NOT NULL,
  author_or_source TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('course','book','other_source','platform','path')),
  category TEXT,
  subcategory TEXT,
  level TEXT,
  primary_audience TEXT,
  focus_area TEXT,
  format_type TEXT,
  free_status TEXT,
  access_model TEXT,
  certification_type TEXT,
  duration_text TEXT,
  snippet TEXT,
  long_description TEXT,
  learning_outcomes_json TEXT,
  tags_json TEXT,
  official_link TEXT,
  destination_url TEXT,
  affiliate_url TEXT,
  is_affiliate INTEGER NOT NULL DEFAULT 0,
  affiliate_provider TEXT,
  disclosure_label TEXT,
  is_alison INTEGER NOT NULL DEFAULT 0,
  featured_priority INTEGER NOT NULL DEFAULT 0,
  popularity_score REAL NOT NULL DEFAULT 0,
  recent_views_30d INTEGER NOT NULL DEFAULT 0,
  unique_learners_30d INTEGER NOT NULL DEFAULT 0,
  starts_30d INTEGER NOT NULL DEFAULT 0,
  completion_rate REAL NOT NULL DEFAULT 0,
  enroll_count INTEGER,
  published_status TEXT NOT NULL DEFAULT 'draft' CHECK (published_status IN ('draft','published','archived')),
  last_verified_at TEXT,
  cover_image_url TEXT,
  cover_image_type TEXT,
  cover_image_prompt TEXT,
  cover_image_alt TEXT,
  cover_image_style_rule TEXT,
  meta_title TEXT,
  meta_description TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  twitter_card_type TEXT DEFAULT 'summary_large_image',
  canonical_url TEXT,
  share_image_prompt TEXT,
  quick_facts_json TEXT,
  who_its_for TEXT,
  what_to_take_next TEXT,
  original_source_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_course_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','started','completed')),
  started_at TEXT,
  last_opened_at TEXT,
  progress_percent REAL NOT NULL DEFAULT 0,
  current_position TEXT,
  completed_at TEXT,
  certificate_claimed_flag INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  course_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','start','save','share','affiliate_click','complete','chatbot_recommendation_click')),
  occurred_at TEXT NOT NULL,
  metadata_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS featured_course_rules (
  id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  rule_json TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curated_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  why_it_matters TEXT,
  what_changed TEXT,
  executive_implications TEXT,
  primary_course_rationale TEXT,
  primary_course_slug TEXT,
  related_course_slugs_json TEXT,
  source_references_json TEXT,
  editorial_review_status TEXT NOT NULL DEFAULT 'draft' CHECK (editorial_review_status IN ('draft','in_review','approved','rejected')),
  published_status TEXT NOT NULL DEFAULT 'draft' CHECK (published_status IN ('draft','published','archived')),
  meta_title TEXT,
  meta_description TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  og_image_alt TEXT,
  og_image_data_json TEXT,
  share_image_prompt TEXT,
  social_share_copy_json TEXT,
  social_share_copy_model TEXT,
  social_share_copy_generated_at TEXT,
  last_verified_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  generated_model TEXT,
  generated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT,
  user_id TEXT,
  started_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','bot')),
  content TEXT NOT NULL,
  courses_json TEXT,
  off_topic INTEGER NOT NULL DEFAULT 0,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chatbot_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_user ON chatbot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_time ON chatbot_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_session ON chatbot_messages(session_id, occurred_at);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'general',   -- 'general' | 'article'
  slug TEXT,                               -- article slug if type = 'article'
  page_url TEXT,
  sentiment TEXT,                          -- 'positive' | 'neutral' | 'negative'
  message TEXT,
  email TEXT,
  user_id TEXT,
  reviewed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_provider ON courses(provider_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_subcategory ON courses(subcategory);
CREATE INDEX IF NOT EXISTS idx_courses_published_status ON courses(published_status);
CREATE INDEX IF NOT EXISTS idx_courses_is_alison ON courses(is_alison);
CREATE INDEX IF NOT EXISTS idx_courses_featured_priority ON courses(featured_priority DESC);
CREATE INDEX IF NOT EXISTS idx_courses_popularity_score ON courses(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_course_discovery_jobs_provider_created ON course_discovery_jobs(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_discovery_jobs_status_created ON course_discovery_jobs(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_discovery_candidates_provider_hash ON course_discovery_candidates(provider_id, url_hash);
CREATE INDEX IF NOT EXISTS idx_course_discovery_candidates_provider_status_created ON course_discovery_candidates(provider_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_discovery_candidates_job ON course_discovery_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_course_events_course_id ON course_events(course_id);
CREATE INDEX IF NOT EXISTS idx_course_events_user_id ON course_events(user_id);
CREATE INDEX IF NOT EXISTS idx_course_events_type_time ON course_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_user_id ON user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_course_id ON user_course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_curated_pages_slug ON curated_pages(slug);
CREATE INDEX IF NOT EXISTS idx_curated_pages_published ON curated_pages(published_status);

-- Quiz tables
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'ai-knowledge',
  published_status TEXT NOT NULL DEFAULT 'published' CHECK (published_status IN ('draft','published','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
  topic_tags_json TEXT,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  quiz_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  answers_json TEXT,
  weak_topics_json TEXT,
  completed_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_difficulty ON quiz_questions(quiz_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_score ON quiz_attempts(quiz_id, score DESC);
