-- Migration 013: Add location column to camps (was missing from live DB)
ALTER TABLE camps ADD COLUMN IF NOT EXISTS location TEXT;
