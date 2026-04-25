CREATE TABLE IF NOT EXISTS short_links (
  code       TEXT    PRIMARY KEY,
  target_url TEXT    NOT NULL,
  hit_count  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS short_links_target_url ON short_links(target_url);
