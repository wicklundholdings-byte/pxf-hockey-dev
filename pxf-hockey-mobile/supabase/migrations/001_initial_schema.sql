-- ============================================================
-- PXF Hockey — Initial Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── PROFILES (extends Supabase auth.users) ──────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;             -- 'elite' | 'team' | 'parent'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ─── TEAMS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  age_group     TEXT,                      -- 'U14', 'U16', etc.
  season        TEXT,                      -- '2026-27'
  color         TEXT DEFAULT '#00C4B4',    -- team accent color
  logo_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PLAYERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  jersey_number   TEXT,
  position        TEXT,                    -- 'Forward', 'Defense', 'Goalie'
  birth_year      INT,
  parent_name     TEXT,
  parent_email    TEXT,
  parent_user_id  UUID REFERENCES auth.users(id),   -- linked parent account
  notes           TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DRILLS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT,                      -- 'Skating', 'Shooting', 'Defense', etc.
  description   TEXT,
  duration_min  INT DEFAULT 10,
  diagram_url   TEXT,
  video_url     TEXT,
  is_template   BOOLEAN DEFAULT FALSE,     -- TRUE = PXF library drill
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SESSIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  session_date  TIMESTAMPTZ,
  duration_min  INT DEFAULT 60,
  location      TEXT,
  notes         TEXT,
  status        TEXT DEFAULT 'planned',    -- 'planned' | 'completed'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_drills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  drill_id      UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  position      INT DEFAULT 0,            -- order in session
  duration_min  INT,
  notes         TEXT
);

-- ─── EVENTS (ice times, games, tournaments) ──────────────────
CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  type          TEXT DEFAULT 'ice',        -- 'ice' | 'game' | 'tournament' | 'private' | 'camp'
  start_time    TIMESTAMPTZ,
  end_time      TIMESTAMPTZ,
  location      TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CAMPS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS camps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  start_date      DATE,
  end_date        DATE,
  price_cents     INT DEFAULT 0,
  max_spots       INT,
  location        TEXT,
  status          TEXT DEFAULT 'draft',    -- 'draft' | 'active' | 'full' | 'closed'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS camp_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  player_name     TEXT NOT NULL,
  parent_name     TEXT,
  parent_email    TEXT,
  parent_user_id  UUID REFERENCES auth.users(id),
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'cancelled'
  amount_cents    INT DEFAULT 0,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONTACTS (CRM) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  type          TEXT DEFAULT 'lead',       -- 'parent' | 'player' | 'lead'
  team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  notes         TEXT,
  status        TEXT DEFAULT 'active',     -- 'active' | 'inactive'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MESSAGES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BROADCASTS (coach → group messages) ─────────────────────
CREATE TABLE IF NOT EXISTS broadcasts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience      TEXT NOT NULL,             -- 'everyone' | 'parents' | 'players' | team name
  message       TEXT NOT NULL,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GAME FILM ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_film (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id     UUID REFERENCES players(id) ON DELETE SET NULL,
  team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  title         TEXT,
  category      TEXT DEFAULT 'General',    -- 'General' | 'Skills' | 'Game' | etc.
  storage_path  TEXT,                      -- Supabase Storage path
  thumbnail_url TEXT,
  duration_sec  INT,
  has_voiceover BOOLEAN DEFAULT FALSE,
  has_annotation BOOLEAN DEFAULT FALSE,
  uploaded_to_player BOOLEAN DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE players             ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_drills      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE camps               ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_film           ENABLE ROW LEVEL SECURITY;

-- Teams: coaches own their teams
CREATE POLICY "coaches_own_teams" ON teams
  FOR ALL USING (auth.uid() = coach_id);

-- Players: coaches see their players; linked parents see their child
CREATE POLICY "coaches_own_players" ON players
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "parents_see_child" ON players
  FOR SELECT USING (auth.uid() = parent_user_id);

-- Drills: coaches own their drills; everyone can read templates
CREATE POLICY "coaches_own_drills" ON drills
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "all_read_templates" ON drills
  FOR SELECT USING (is_template = TRUE);

-- Sessions
CREATE POLICY "coaches_own_sessions" ON sessions
  FOR ALL USING (auth.uid() = coach_id);

-- Session drills (access via session ownership)
CREATE POLICY "coaches_own_session_drills" ON session_drills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions s WHERE s.id = session_drills.session_id AND s.coach_id = auth.uid()
    )
  );

-- Events
CREATE POLICY "coaches_own_events" ON events
  FOR ALL USING (auth.uid() = coach_id);

-- Camps: coaches manage; parents can read active camps
CREATE POLICY "coaches_own_camps" ON camps
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "public_read_active_camps" ON camps
  FOR SELECT USING (status = 'active');

-- Camp registrations
CREATE POLICY "coaches_read_registrations" ON camp_registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM camps c WHERE c.id = camp_registrations.camp_id AND c.coach_id = auth.uid())
  );

CREATE POLICY "parents_own_registrations" ON camp_registrations
  FOR ALL USING (auth.uid() = parent_user_id);

-- Contacts
CREATE POLICY "coaches_own_contacts" ON contacts
  FOR ALL USING (auth.uid() = coach_id);

-- Messages: sender or recipient
CREATE POLICY "message_participants" ON messages
  FOR ALL USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Broadcasts
CREATE POLICY "coaches_own_broadcasts" ON broadcasts
  FOR ALL USING (auth.uid() = coach_id);

-- Game film
CREATE POLICY "coaches_own_film" ON game_film
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "players_see_their_film" ON game_film
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM players p WHERE p.id = game_film.player_id AND p.parent_user_id = auth.uid())
  );

-- ============================================================
-- INDEXES (performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_teams_coach        ON teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_players_team        ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_coach       ON players(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_coach      ON sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_team       ON sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_events_coach        ON events(coach_id);
CREATE INDEX IF NOT EXISTS idx_camps_coach         ON camps(coach_id);
CREATE INDEX IF NOT EXISTS idx_contacts_coach      ON contacts(coach_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient  ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_film_coach          ON game_film(coach_id);
CREATE INDEX IF NOT EXISTS idx_film_player         ON game_film(player_id);
