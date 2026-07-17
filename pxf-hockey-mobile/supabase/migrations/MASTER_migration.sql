-- ============================================================
-- PXF HOCKEY — MASTER MIGRATION
-- Run this in Supabase SQL Editor → New Query → Run All
-- Order: 001_initial → 002_updates → 003_messages →
--        003_missing → 004_patch → 005_phase3
-- ============================================================

-- ═══ 001: INITIAL SCHEMA ══════════════════════════════
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

-- ═══ 002: SCHEMA UPDATES ══════════════════════════════
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

-- ═══ 003: MESSAGES ════════════════════════════════════
-- ============================================================
-- PXF Hockey — Migration 003: Messaging System
-- Run this in Supabase SQL Editor AFTER 002_schema_updates.sql
-- ============================================================

-- ─── MESSAGE THREADS ────────────────────────────────────────
-- A thread groups messages between participants.
-- kind: 'team' = broadcast to team, 'direct' = 1:1 between coach and player/parent
CREATE TABLE IF NOT EXISTS message_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL DEFAULT 'direct',    -- 'team' | 'direct'
  name        TEXT,                              -- display name for the thread (e.g. team name, or parent name)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MESSAGES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── THREAD PARTICIPANTS ─────────────────────────────────────
-- Tracks who is in a direct message thread
CREATE TABLE IF NOT EXISTS thread_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  UNIQUE(thread_id, user_id)
);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE message_threads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;

-- Coaches can see threads they own
CREATE POLICY "coaches_own_threads" ON message_threads
  FOR ALL USING (auth.uid() = coach_id);

-- Messages are visible to coach who owns the thread
CREATE POLICY "coaches_read_messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = messages.thread_id
        AND t.coach_id = auth.uid()
    )
  );

-- Participants can see their threads
CREATE POLICY "participants_own_rows" ON thread_participants
  FOR ALL USING (auth.uid() = user_id);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_threads_coach      ON message_threads(coach_id);
CREATE INDEX IF NOT EXISTS idx_threads_team       ON message_threads(team_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread    ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created   ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_thread ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_participants_user   ON thread_participants(user_id);

-- ─── TRIGGER: update thread.updated_at on new message ────────
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads SET updated_at = NOW() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_update_thread
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_timestamp();

-- ═══ 003: MISSING TABLES ══════════════════════════════
-- ============================================================
-- PXF Hockey — Migration 003: Missing Tables (Audit Patch)
-- Project: pxf-hockey-prod
-- Run this AFTER 001_schema.sql and 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- 1. SESSION SERIES
-- "3 Day Skating Flow" = Session 1 + Session 2 + Session 3
-- Applied to a camp in one tap from Playbook
-- ============================================================
CREATE TABLE public.session_series (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE public.session_series_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id   uuid REFERENCES public.session_series(id) ON DELETE CASCADE NOT NULL,
  session_id  uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  day_number  int NOT NULL,
  order_index int DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(series_id, day_number)
);

-- ============================================================
-- 2. USER FAVORITES
-- Coaches heart drills, sessions, plays, programs
-- "Favorites — all hearted content across Drills, Sessions, Camps"
-- ============================================================
CREATE TABLE public.user_favorites (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('drill', 'session', 'play', 'program', 'series')),
  content_id   uuid NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

-- ============================================================
-- 3. FAVORITE FOLDER ITEMS
-- "Folders — DB-backed flat folders per section (syncs across devices)"
-- Links any favorited content to a named folder
-- ============================================================
CREATE TABLE public.favorite_folder_items (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id    uuid REFERENCES public.favorite_folders(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('drill', 'session', 'play', 'program', 'series')),
  content_id   uuid NOT NULL,
  order_index  int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(folder_id, content_type, content_id)
);

-- ============================================================
-- 4. CAMP RSVPs
-- "Daily Attendance RSVP — parent confirms attendance the evening
-- before, inline on parent dashboard"
-- Separate from team event RSVPs — this is per camp session day
-- ============================================================
CREATE TABLE public.camp_rsvps (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_session_id uuid REFERENCES public.camp_sessions(id) ON DELETE CASCADE NOT NULL,
  athlete_id      uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  parent_user_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rsvp_status     text NOT NULL CHECK (rsvp_status IN ('yes', 'no', 'maybe')),
  responded_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(camp_session_id, athlete_id)
);

-- ============================================================
-- 5. ATHLETE CERTIFICATES
-- "Achievement certificates — coach issues, parent receives via email and app"
-- ============================================================
CREATE TABLE public.athlete_certificates (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id   uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  coach_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  camp_id      uuid REFERENCES public.camps(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text,
  image_url    text,
  issued_at    date NOT NULL DEFAULT CURRENT_DATE,
  notified_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- 6. STAFF AVAILABILITY
-- Web portal scheduling board: "Coaches with availability for that
-- time slot are shown in full color — unavailable coaches are greyed out"
-- ============================================================
CREATE TABLE public.staff_availability (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date         date NOT NULL,
  start_time   time,
  end_time     time,
  is_available boolean DEFAULT true,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, date, start_time)
);

-- ============================================================
-- 7. ADD assigned_staff_id TO ice_times
-- Scheduling board: owner drags a staff coach onto an ice slot
-- ============================================================
ALTER TABLE public.ice_times
  ADD COLUMN assigned_staff_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================
-- RLS POLICIES for new tables
-- ============================================================

-- Session Series
CREATE POLICY "Coaches manage their session series"
  ON public.session_series FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches manage series items"
  ON public.session_series_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.session_series s
      WHERE s.id = session_series_items.series_id
        AND s.coach_id = auth.uid()
    )
  );

-- User Favorites
CREATE POLICY "Users manage their own favorites"
  ON public.user_favorites FOR ALL
  USING (user_id = auth.uid());

-- Favorite Folder Items
CREATE POLICY "Coaches manage their folder items"
  ON public.favorite_folder_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.favorite_folders f
      WHERE f.id = favorite_folder_items.folder_id
        AND f.coach_id = auth.uid()
    )
  );

-- Camp RSVPs
CREATE POLICY "Parents manage camp RSVPs for their athletes"
  ON public.camp_rsvps FOR ALL
  USING (parent_user_id = auth.uid());

CREATE POLICY "Coaches can view camp RSVPs for their camps"
  ON public.camp_rsvps FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR is_camp_coach((SELECT camp_id FROM public.camp_sessions WHERE id = camp_rsvps.camp_session_id))
  );

-- Athlete Certificates
CREATE POLICY "Coaches manage certificates they issued"
  ON public.athlete_certificates FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Parents can view their athlete's certificates"
  ON public.athlete_certificates FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_certificates.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- Staff Availability
CREATE POLICY "Coaches manage availability for their staff"
  ON public.staff_availability FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Staff can view and update their own availability"
  ON public.staff_availability FOR ALL
  USING (user_id = auth.uid() OR coach_id = auth.uid());

-- Updated triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.session_series FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ═══ 004: V1 PATCH ════════════════════════════════════
-- ============================================================
-- PXF Hockey — Migration 004: V1 App Schema Patch
-- Adds columns the mobile app expects that were missing
-- from the initial schema design
-- ============================================================

-- ============================================================
-- SESSIONS: add missing columns
-- ============================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_complete          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_duration_minutes int,
  ADD COLUMN IF NOT EXISTS date                 date,
  ADD COLUMN IF NOT EXISTS time                 time,
  ADD COLUMN IF NOT EXISTS main_focus           text[];

-- ============================================================
-- DRILLS: add missing columns
-- ============================================================
ALTER TABLE public.drills
  ADD COLUMN IF NOT EXISTS is_published     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'elite'));

-- ============================================================
-- DRILL CATEGORIES: add 'title' as alias for 'name'
-- (app queries drill_categories(title) via Supabase join)
-- ============================================================
ALTER TABLE public.drill_categories
  ADD COLUMN IF NOT EXISTS title text;

UPDATE public.drill_categories SET title = name WHERE title IS NULL;

-- ═══ 005: PHASE 3 — GAMES/TOURNAMENTS/ATTENDANCE ═════
-- ============================================================
-- PXF Hockey — Phase 3 Tables
-- Games, Tournaments, Attendance, RSVP, Dryland Programs
-- Run after 001_initial_schema.sql
-- ============================================================

-- ─── GAMES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  opponent      TEXT NOT NULL,
  game_date     DATE NOT NULL,
  game_time     TIME,
  location      TEXT,
  home_away     TEXT DEFAULT 'home',   -- 'home' | 'away' | 'neutral'
  home_score    INT,
  away_score    INT,
  status        TEXT DEFAULT 'upcoming', -- 'upcoming' | 'live' | 'final'
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GAME PLANS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_notes  TEXT,
  our_game_plan   TEXT,
  key_matchups    TEXT,
  period1_notes   TEXT,
  period2_notes   TEXT,
  period3_notes   TEXT,
  postgame_notes  TEXT,
  is_shared       BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GAME LINEUPS ─────────────────────────────────────────────
-- Stores each slot in a lineup (even strength / PP / PK)
CREATE TABLE IF NOT EXISTS game_lineups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lineup_type   TEXT DEFAULT 'even',   -- 'even' | 'pp' | 'pk'
  line_number   INT NOT NULL,          -- 1-4 for forwards, 1-3 for D
  position      TEXT NOT NULL,         -- 'LW','C','RW','LD','RD','G','Backup'
  player_id     UUID REFERENCES players(id) ON DELETE SET NULL,
  player_name   TEXT,                  -- fallback if no player_id
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TOURNAMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  location      TEXT,
  start_date    DATE,
  end_date      DATE,
  status        TEXT DEFAULT 'upcoming', -- 'upcoming' | 'in_progress' | 'complete'
  entry_fee_cents INT DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TOURNAMENT GAMES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_games (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent        TEXT NOT NULL,
  game_date       DATE,
  game_time       TIME,
  location        TEXT,
  home_score      INT,
  away_score      INT,
  result          TEXT,                -- '3-1 WIN' | '2-4 LOSS' | null
  game_type       TEXT DEFAULT 'pool', -- 'pool' | 'quarter' | 'semi' | 'final'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ATTENDANCE RECORDS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES sessions(id) ON DELETE CASCADE,
  game_id       UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'unknown', -- 'present' | 'absent' | 'late' | 'unknown'
  notes         TEXT,
  marked_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, player_id),
  UNIQUE(game_id, player_id)
);

-- ─── EVENT RSVPS ─────────────────────────────────────────────
-- Parents RSVP for their child to sessions or games
CREATE TABLE IF NOT EXISTS event_rsvps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  game_id         UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  parent_user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'none', -- 'yes' | 'no' | 'maybe' | 'none'
  responded_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, player_id),
  UNIQUE(game_id, player_id)
);

-- ─── TRAINING PROGRAMS (Dryland) ─────────────────────────────
CREATE TABLE IF NOT EXISTS training_programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT DEFAULT 'General', -- 'Stick Skills' | 'Shooting' | 'Strength & Explosiveness'
  level           TEXT DEFAULT 'All',     -- 'Beginner' | 'Intermediate' | 'Advanced' | 'All'
  age_group       TEXT DEFAULT 'All',     -- 'U10' | 'U12' | 'U14' | 'U16' | 'All'
  duration_weeks  INT DEFAULT 4,
  sessions_per_week INT DEFAULT 3,
  thumbnail_url   TEXT,
  is_published    BOOLEAN DEFAULT TRUE,
  is_pxf_library  BOOLEAN DEFAULT TRUE,   -- PXF-curated vs coach-created
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROGRAM DRILLS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS program_drills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  drill_id        UUID REFERENCES drills(id) ON DELETE SET NULL,
  title           TEXT,                  -- fallback if no drill_id
  description     TEXT,
  video_url       TEXT,
  week_number     INT NOT NULL DEFAULT 1,
  day_number      INT NOT NULL DEFAULT 1,
  sort_order      INT DEFAULT 0,
  sets            INT,
  reps            INT,
  duration_min    INT
);

-- ─── ATHLETE PROGRAM ENROLLMENTS ─────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_program_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  player_id       UUID REFERENCES players(id) ON DELETE CASCADE,
  parent_user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT DEFAULT 'active', -- 'active' | 'paused' | 'complete'
  current_week    INT DEFAULT 1,
  current_day     INT DEFAULT 1,
  enrolled_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ATHLETE SESSION NOTES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_session_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,
  title         TEXT,
  notes         TEXT,
  rating        INT CHECK (rating BETWEEN 1 AND 5),
  is_shared     BOOLEAN DEFAULT FALSE,  -- TRUE = visible to parent
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE games                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_plans                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_lineups                ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_games            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_drills              ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_session_notes       ENABLE ROW LEVEL SECURITY;

-- Games
CREATE POLICY "coaches_own_games" ON games
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "parents_see_team_games" ON games
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.team_id = games.team_id AND p.parent_user_id = auth.uid()
    )
  );

-- Game plans
CREATE POLICY "coaches_own_game_plans" ON game_plans
  FOR ALL USING (auth.uid() = coach_id);

-- Game lineups
CREATE POLICY "coaches_own_lineups" ON game_lineups
  FOR ALL USING (auth.uid() = coach_id);

-- Tournaments
CREATE POLICY "coaches_own_tournaments" ON tournaments
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "parents_see_team_tournaments" ON tournaments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.team_id = tournaments.team_id AND p.parent_user_id = auth.uid()
    )
  );

-- Tournament games
CREATE POLICY "coaches_own_tournament_games" ON tournament_games
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "parents_see_tournament_games" ON tournament_games
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      JOIN players p ON p.team_id = t.team_id
      WHERE t.id = tournament_games.tournament_id AND p.parent_user_id = auth.uid()
    )
  );

-- Attendance
CREATE POLICY "coaches_own_attendance" ON attendance_records
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "parents_see_child_attendance" ON attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = attendance_records.player_id AND p.parent_user_id = auth.uid()
    )
  );

-- RSVPs
CREATE POLICY "parents_own_rsvps" ON event_rsvps
  FOR ALL USING (auth.uid() = parent_user_id);

CREATE POLICY "coaches_read_rsvps" ON event_rsvps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = event_rsvps.session_id AND s.coach_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM games g WHERE g.id = event_rsvps.game_id AND g.coach_id = auth.uid())
  );

-- Training programs (public read for published)
CREATE POLICY "public_read_training_programs" ON training_programs
  FOR SELECT USING (is_published = TRUE);

-- Program drills (readable if program is readable)
CREATE POLICY "public_read_program_drills" ON program_drills
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM training_programs tp WHERE tp.id = program_drills.program_id AND tp.is_published = TRUE)
  );

-- Enrollments
CREATE POLICY "parents_own_enrollments" ON athlete_program_enrollments
  FOR ALL USING (auth.uid() = parent_user_id);

-- Athlete session notes: coaches own, parents see shared
CREATE POLICY "coaches_own_athlete_notes" ON athlete_session_notes
  FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "parents_see_shared_notes" ON athlete_session_notes
  FOR SELECT USING (
    is_shared = TRUE AND
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = athlete_session_notes.player_id AND p.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_games_coach           ON games(coach_id);
CREATE INDEX IF NOT EXISTS idx_games_team            ON games(team_id);
CREATE INDEX IF NOT EXISTS idx_games_date            ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_coach     ON tournaments(coach_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_team      ON tournaments(team_id);
CREATE INDEX IF NOT EXISTS idx_tourn_games_tourn     ON tournament_games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session    ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_game       ON attendance_records(game_id);
CREATE INDEX IF NOT EXISTS idx_attendance_player     ON attendance_records(player_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_session          ON event_rsvps(session_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_game             ON event_rsvps(game_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_parent           ON event_rsvps(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_program_drills        ON program_drills(program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_parent    ON athlete_program_enrollments(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_program   ON athlete_program_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_athlete_notes_coach   ON athlete_session_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_athlete_notes_player  ON athlete_session_notes(player_id);

-- ============================================================
-- SEED: PXF Dryland Training Programs
-- ============================================================

INSERT INTO training_programs (title, description, category, level, age_group, duration_weeks, sessions_per_week)
VALUES
  (
    'Stick Skills Foundations',
    'Build puck control and hands-on-ice basics. Stickhandling, dekes, and 1v1 moves for developing players.',
    'Stick Skills', 'Beginner', 'U12', 4, 3
  ),
  (
    'Power Shot Program',
    'Maximize shot power and release speed. Combines wrist shot mechanics, weight transfer, and blade snap technique.',
    'Shooting', 'Intermediate', 'U14', 6, 3
  ),
  (
    'Explosive Edge & Speed',
    'Off-ice explosive training for hockey athletes. Plyometrics, lateral quickness, and first-step speed.',
    'Strength & Explosiveness', 'Advanced', 'U16', 8, 4
  ),
  (
    'Dryland Skating Mechanics',
    'Build skating power and edge work off the ice. Focus on stride mechanics, crossover strength, and backward skating.',
    'Stick Skills', 'Intermediate', 'All', 4, 3
  ),
  (
    'Sniper Finishing',
    'Improve scoring in tight. One-timers, tips, redirects, and net-front presence drills.',
    'Shooting', 'Advanced', 'U16', 4, 3
  )
ON CONFLICT DO NOTHING;

-- ═══ STORAGE: game_film bucket policy ═════════════════

-- Allow authenticated coaches to upload to their own folder
INSERT INTO storage.buckets (id, name, public)
VALUES ('game_film', 'game_film', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "coaches_upload_film" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game_film' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "coaches_read_own_film" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'game_film' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "coaches_delete_own_film" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'game_film' AND auth.uid()::text = (storage.foldername(name))[1]);
