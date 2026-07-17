-- ============================================================
-- PXF Hockey — Migration 009: Profiles columns safety net
--
-- Ensures all profile columns expected by the mobile app exist.
-- These were added in 001_initial_schema.sql via ALTER TABLE,
-- but this migration acts as a safety net for any Supabase
-- project that ran an older schema variant.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role             TEXT;    -- 'elite' | 'team' | 'parent'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_name         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ DEFAULT NOW();

-- Ensure the coach_slug column added in migration 007 is present
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_slug TEXT UNIQUE;
