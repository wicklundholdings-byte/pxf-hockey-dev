-- Migration 029: game_events table for scoresheet stats
-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.game_events (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id         uuid REFERENCES public.tournament_games(id) ON DELETE CASCADE NOT NULL,
  event_type      text NOT NULL CHECK (event_type IN ('goal', 'penalty')),
  period          int,
  time_in_period  text,           -- "MM:SS"
  player_name     text,
  team            text CHECK (team IN ('home', 'away')),
  -- Goal-specific
  goal_type       text,           -- ES | PP | SH | PS | EN
  assist1         text,
  assist2         text,
  -- Penalty-specific
  infraction      text,
  duration_minutes int,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_events TO authenticated;

CREATE POLICY "Coaches manage game events"
  ON public.game_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_games tg
      JOIN public.tournaments t ON t.id = tg.tournament_id
      WHERE tg.id = game_events.game_id
        AND is_team_coach(t.team_id)
    )
  );

CREATE POLICY "Coaches insert game events"
  ON public.game_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournament_games tg
      JOIN public.tournaments t ON t.id = tg.tournament_id
      WHERE tg.id = game_id
        AND EXISTS (
          SELECT 1 FROM public.teams WHERE id = t.team_id AND coach_id = auth.uid()
        )
    )
  );
