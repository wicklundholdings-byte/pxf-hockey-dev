-- ============================================================
-- Migration 016: Team Staff Contacts + Volunteer Positions
-- ============================================================
-- team_staff_contacts: Name-based staff per team (no app login required)
--   Separate from team_staff (which requires user accounts for app access)
--   Common roles: head_coach, assistant_coach, manager, safety, trainer, other
--
-- team_positions: Volunteer/job postings on sessions or games
--   entity_type: 'session' | 'game'
--   spots_total: max number of volunteers for this role
--
-- position_signups: Who signed up (coach can add manually; parents self-serve later)
-- ============================================================

-- ── team_staff_contacts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_staff_contacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  owner_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  role        text        NOT NULL DEFAULT 'assistant_coach',
  email       text,
  phone       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_staff_contacts_team_idx
  ON public.team_staff_contacts (team_id);

-- ── team_positions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_positions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  owner_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type  text        NOT NULL CHECK (entity_type IN ('session', 'game')),
  entity_id    uuid        NOT NULL,
  role_name    text        NOT NULL,
  spots_total  int         NOT NULL DEFAULT 1 CHECK (spots_total >= 1),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_positions_entity_idx
  ON public.team_positions (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS team_positions_team_idx
  ON public.team_positions (team_id);

-- ── position_signups ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.position_signups (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id  uuid        NOT NULL REFERENCES public.team_positions(id) ON DELETE CASCADE,
  team_id      uuid        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  signup_name  text        NOT NULL,
  parent_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  signed_up_at timestamptz NOT NULL DEFAULT now(),
  -- Prevent duplicate account-based signups
  UNIQUE NULLS NOT DISTINCT (position_id, parent_id)
);

CREATE INDEX IF NOT EXISTS position_signups_position_idx
  ON public.position_signups (position_id);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.team_staff_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_positions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_signups     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_staff_contacts_own" ON public.team_staff_contacts;
DROP POLICY IF EXISTS "team_positions_own"       ON public.team_positions;
DROP POLICY IF EXISTS "position_signups_own"     ON public.position_signups;

CREATE POLICY "team_staff_contacts_own"
  ON public.team_staff_contacts FOR ALL
  USING     (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "team_positions_own"
  ON public.team_positions FOR ALL
  USING     (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "position_signups_own"
  ON public.position_signups FOR ALL
  USING     (team_id IN (SELECT id FROM public.teams WHERE coach_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT id FROM public.teams WHERE coach_id = auth.uid()));

-- ── Grants ─────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_staff_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_positions       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.position_signups     TO authenticated;
