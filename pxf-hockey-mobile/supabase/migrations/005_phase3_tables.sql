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
