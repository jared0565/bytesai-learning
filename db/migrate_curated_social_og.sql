-- Migration: generated social Open Graph metadata for curated pages
-- Run this in Cowork. Wrangler D1 commands are not available in this environment.

ALTER TABLE curated_pages ADD COLUMN og_image_alt TEXT;
ALTER TABLE curated_pages ADD COLUMN og_image_data_json TEXT;
ALTER TABLE curated_pages ADD COLUMN social_share_copy_json TEXT;
ALTER TABLE curated_pages ADD COLUMN social_share_copy_model TEXT;
ALTER TABLE curated_pages ADD COLUMN social_share_copy_generated_at TEXT;
