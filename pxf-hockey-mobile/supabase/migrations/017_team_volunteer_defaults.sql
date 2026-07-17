-- ============================================================
-- Migration 017: Team Volunteer Defaults
-- ============================================================
-- Stores per-team default volunteer positions that are
-- automatically posted when a new event matches the criteria.
--
-- apply_to values:
--   'home_game'     — only when a home game is created
--   'all_games'     — every game (home and away)
--   'all_practices' — every practice session
--
-- is_active: soft-disable a default without deleting it
-- sort_order: display order in the Defaults UI
-- ============================================================

CREATE TABLE IF NOT EXISTS public.team_volunteer_defaults (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  owner_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name   text        NOT NULL,
  spots_total int         NOT NULL DEFAULT 1 CHECK (spots_total >= 1),
  apply_to    text        NOT NULL CHECK (apply_to IN ('home_game', 'all_games', 'all_practices')),
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_volunteer_defaults_team_idx
  ON public.team_volunteer_defaults (team_id);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE public.team_volunteer_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_volunteer_defaults_own" ON public.team_volunteer_defaults;

CREATE POLICY "team_volunteer_defaults_own"
  ON public.team_volunteer_defaults FOR ALL
  USING     (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── Grants ──────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_volunteer_defaults TO authenticated;
