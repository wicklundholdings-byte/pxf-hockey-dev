-- Migration 014: Coach locations table
-- Stores arenas/rinks coaches frequently use so they can be
-- selected from a dropdown when creating camps, sessions, etc.

CREATE TABLE IF NOT EXISTS coach_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coach_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_locations" ON coach_locations
  FOR ALL USING (auth.uid() = coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_locations_coach ON coach_locations(coach_id);
