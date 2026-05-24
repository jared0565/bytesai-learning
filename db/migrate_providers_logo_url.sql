-- Add logo_url column to providers table (was missing from initial schema)
ALTER TABLE providers ADD COLUMN logo_url TEXT;
