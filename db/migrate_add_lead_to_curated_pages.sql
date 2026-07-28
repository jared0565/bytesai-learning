-- BytesAI Learning — Add `lead` column to curated_pages (2026-07-24)
-- A one-sentence curiosity hook rendered above the article summary.

ALTER TABLE curated_pages ADD COLUMN lead TEXT NULL;
