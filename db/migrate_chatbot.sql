-- Run this migration to add chatbot conversation tables
-- wrangler d1 execute bytesai-learning-db --remote --file=app/db/migrate_chatbot.sql

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
