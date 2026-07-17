-- Migration 028: Add missing columns to drills table
-- source_url / source_type were dropped when 002_schema_updates recreated the table
-- Run manually in Supabase SQL Editor

ALTER TABLE public.drills
  ADD COLUMN IF NOT EXISTS source_url  text,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'original'
    CHECK (source_type IN ('original', 'ihs_import', 'social_import'));
