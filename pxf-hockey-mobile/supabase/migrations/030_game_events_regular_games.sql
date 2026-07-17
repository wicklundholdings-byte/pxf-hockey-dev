-- Migration 030: Extend game_events to support regular season games
-- Run in Supabase Dashboard → SQL Editor

-- 1. Make game_id nullable (was NOT NULL referencing tournament_games only)
ALTER TABLE public.game_events
  ALTER COLUMN game_id DROP NOT NULL;

-- 2. Add regular_game_id FK → games table
ALTER TABLE public.game_events
  ADD COLUMN IF NOT EXISTS regular_game_id uuid REFERENCES public.games(id) ON DELETE CASCADE;

-- 3. Enforce: must have exactly one of game_id or regular_game_id
ALTER TABLE public.game_events
  ADD CONSTRAINT game_events_one_game_required
  CHECK (
    (game_id IS NOT NULL AND regular_game_id IS NULL) OR
    (game_id IS NULL AND regular_game_id IS NOT NULL)
  );

-- 4. RLS policy for regular game events (SELECT/UPDATE/DELETE)
CREATE POLICY "Coaches manage regular game events"
  ON public.game_events FOR ALL
  USING (
    regular_game_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.teams t ON t.id = g.team_id
      WHERE g.id = game_events.regular_game_id
        AND t.coach_id = auth.uid()
    )
  );

-- 5. RLS policy for INSERT on regular game events
CREATE POLICY "Coaches insert regular game events"
  ON public.game_events FOR INSERT
  WITH CHECK (
    regular_game_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.teams t ON t.id = g.team_id
      WHERE g.id = regular_game_id
        AND t.coach_id = auth.uid()
    )
  );
