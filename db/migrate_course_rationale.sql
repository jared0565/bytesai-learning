-- Migration: add primary_course_rationale to curated_pages
-- Run: wrangler d1 execute bytesai-learning --remote --file=db/migrate_course_rationale.sql

ALTER TABLE curated_pages ADD COLUMN primary_course_rationale TEXT;
