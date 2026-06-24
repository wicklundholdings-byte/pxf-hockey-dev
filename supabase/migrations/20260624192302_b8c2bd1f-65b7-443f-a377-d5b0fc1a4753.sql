
-- Result enum
DO $$ BEGIN
  CREATE TYPE public.game_result_type AS ENUM ('win','loss','ot_win','ot_loss','so_win','so_loss');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- game_results: one row per game event
CREATE TABLE IF NOT EXISTS public.game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.team_events(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_score int NOT NULL DEFAULT 0,
  opponent_score int NOT NULL DEFAULT 0,
  result public.game_result_type,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_results TO authenticated;
GRANT ALL ON public.game_results TO service_role;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own team results" ON public.game_results
  FOR ALL TO authenticated
  USING (public.is_team_coach(team_id))
  WITH CHECK (public.is_team_coach(team_id));
CREATE POLICY "Team parents read results" ON public.game_results
  FOR SELECT TO authenticated
  USING (public.is_team_parent(team_id));

CREATE TRIGGER trg_game_results_updated_at
  BEFORE UPDATE ON public.game_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- game_player_stats: skater stats per game
CREATE TABLE IF NOT EXISTS public.game_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_player_id uuid REFERENCES public.team_players(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES public.attendees(id) ON DELETE SET NULL,
  goals int NOT NULL DEFAULT 0,
  assists int NOT NULL DEFAULT 0,
  points int GENERATED ALWAYS AS (goals + assists) STORED,
  penalty_minutes int NOT NULL DEFAULT 0,
  plus_minus int NOT NULL DEFAULT 0,
  shots_on_goal int NOT NULL DEFAULT 0,
  toi text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, team_player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_player_stats TO authenticated;
GRANT ALL ON public.game_player_stats TO service_role;
ALTER TABLE public.game_player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own team player stats" ON public.game_player_stats
  FOR ALL TO authenticated
  USING (public.is_team_coach(team_id))
  WITH CHECK (public.is_team_coach(team_id));
CREATE POLICY "Team parents read player stats" ON public.game_player_stats
  FOR SELECT TO authenticated
  USING (public.is_team_parent(team_id));

CREATE TRIGGER trg_game_player_stats_updated_at
  BEFORE UPDATE ON public.game_player_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_gps_team ON public.game_player_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_gps_event ON public.game_player_stats(event_id);
CREATE INDEX IF NOT EXISTS idx_gps_player ON public.game_player_stats(team_player_id);

-- game_goalie_stats: goalie stats per game
CREATE TABLE IF NOT EXISTS public.game_goalie_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_player_id uuid REFERENCES public.team_players(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES public.attendees(id) ON DELETE SET NULL,
  saves int NOT NULL DEFAULT 0,
  goals_against int NOT NULL DEFAULT 0,
  shutout boolean NOT NULL DEFAULT false,
  decision text, -- 'W' | 'L' | 'OTL' | 'SOL' | null
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, team_player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_goalie_stats TO authenticated;
GRANT ALL ON public.game_goalie_stats TO service_role;
ALTER TABLE public.game_goalie_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own team goalie stats" ON public.game_goalie_stats
  FOR ALL TO authenticated
  USING (public.is_team_coach(team_id))
  WITH CHECK (public.is_team_coach(team_id));
CREATE POLICY "Team parents read goalie stats" ON public.game_goalie_stats
  FOR SELECT TO authenticated
  USING (public.is_team_parent(team_id));

CREATE TRIGGER trg_game_goalie_stats_updated_at
  BEFORE UPDATE ON public.game_goalie_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ggs_team ON public.game_goalie_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_ggs_event ON public.game_goalie_stats(event_id);
