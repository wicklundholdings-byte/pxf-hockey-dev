-- ============================================================
-- PXF Hockey — Schema Updates Migration 002
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- ─── DRILL CATEGORIES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drill_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DROP AND RECREATE DRILLS with correct schema ────────────
-- (safe to do early; no data yet)
DROP TABLE IF EXISTS session_drills;
DROP TABLE IF EXISTS drills;

CREATE TABLE drills (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = PXF library drill
  category_id        UUID REFERENCES drill_categories(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  short_description  TEXT,
  difficulty_level   TEXT DEFAULT 'Intermediate',  -- 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite'
  age_group          TEXT DEFAULT 'U13+',           -- 'U9+' | 'U11+' | 'U13+' | 'U15+'
  duration_minutes   INT DEFAULT 10,
  equipment_needed   TEXT[],
  coaching_points    TEXT[],
  diagram_url        TEXT,
  video_url          TEXT,
  is_published       BOOLEAN DEFAULT FALSE,         -- TRUE = visible to all coaches
  is_template        BOOLEAN DEFAULT FALSE,         -- legacy compat
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Re-create session_drills with sort_order
CREATE TABLE session_drills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  drill_id    UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  sort_order  INT DEFAULT 0,
  duration_min INT,
  notes       TEXT
);

-- ─── UPDATE SESSIONS TABLE ───────────────────────────────────
-- Add columns the app expects (rename user_id → coach_id handled below)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS time TEXT;              -- 'HH:MM'
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS skill_level TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_duration_minutes INT DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS main_focus TEXT[];
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT FALSE;

-- coach_id already exists from migration 001, so sessions is correct on that front.
-- The app was incorrectly using 'user_id'; we'll fix the app code to use 'coach_id'.

-- ─── DRILL FAVORITES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drill_favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_id   UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, drill_id)
);

-- ─── FAVORITE FOLDERS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorite_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorite_folder_drills (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES favorite_folders(id) ON DELETE CASCADE,
  drill_id  UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  UNIQUE(folder_id, drill_id)
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE drill_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills               ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_drills       ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_favorites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_folders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_folder_drills ENABLE ROW LEVEL SECURITY;

-- drill_categories: public read
CREATE POLICY "public_read_categories" ON drill_categories
  FOR SELECT USING (TRUE);

-- drills: published drills are public; coaches own their private drills
CREATE POLICY "public_read_published_drills" ON drills
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "coaches_own_drills" ON drills
  FOR ALL USING (auth.uid() = coach_id);

-- session_drills: tied to session ownership
CREATE POLICY "coaches_own_session_drills" ON session_drills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_drills.session_id
        AND s.coach_id = auth.uid()
    )
  );

-- favorites: users own their own
CREATE POLICY "users_own_favorites" ON drill_favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_folders" ON favorite_folders
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_folder_drills" ON favorite_folder_drills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM favorite_folders f
      WHERE f.id = favorite_folder_drills.folder_id
        AND f.user_id = auth.uid()
    )
  );

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drills_category      ON drills(category_id);
CREATE INDEX IF NOT EXISTS idx_drills_coach         ON drills(coach_id);
CREATE INDEX IF NOT EXISTS idx_drills_published     ON drills(is_published);
CREATE INDEX IF NOT EXISTS idx_session_drills_sess  ON session_drills(session_id);
CREATE INDEX IF NOT EXISTS idx_session_drills_drill ON session_drills(drill_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user       ON drill_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_drills_folder ON favorite_folder_drills(folder_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date        ON sessions(date);

-- ─── UPDATE CONTACTS TABLE ──────────────────────────────────
-- Add richer CRM fields the screen expects
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'lead';      -- 'lead' | 'interested' | 'enrolled' | 'alumni'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS player_name TEXT;               -- linked player display name
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_spent_cents INT DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source TEXT;                    -- 'instagram' | 'referral' | 'google' | etc.

-- Contact notes (separate table for history)
CREATE TABLE IF NOT EXISTS contact_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_contact_notes" ON contact_notes
  FOR ALL USING (auth.uid() = coach_id);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id);

-- ─── SEED: PXF Drill Categories ──────────────────────────────
INSERT INTO drill_categories (title, description, sort_order) VALUES
  ('Skating',       'Edge work, power strides, crossovers, transitions',        1),
  ('Puck Control',  'Stickhandling, dekes, tight turns with the puck',          2),
  ('Passing',       'Tape-to-tape, saucer passes, one-touch passing drills',    3),
  ('Shooting',      'Wrist shot, snap shot, slap shot, one-timers',             4),
  ('Defense',       'Gap control, angling, D-zone coverage, puck battles',      5),
  ('Goalie',        'Butterfly, positioning, rebound control, breakaways',      6),
  ('Systems',       'Power play, penalty kill, zone entries, breakouts',        7),
  ('Conditioning',  'Edge circuits, explosive starts, game-speed skating',      8)
ON CONFLICT DO NOTHING;
