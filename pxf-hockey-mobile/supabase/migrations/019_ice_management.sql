-- ============================================================
-- Migration 019: Ice Management
-- Tables: ice_rinks, ice_contracts, ice_slots
-- Teams: add is_business flag + division
-- ============================================================

-- ── Teams: business flag ─────────────────────────────────────────────────────
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS is_business  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS division     TEXT;

-- ── Ice Rinks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ice_rinks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  address     TEXT,
  color       TEXT        NOT NULL DEFAULT '#00C4B4',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ice_rinks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ice_rinks_coach" ON public.ice_rinks;
CREATE POLICY "ice_rinks_coach" ON public.ice_rinks
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_ice_rinks_coach ON public.ice_rinks(coach_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ice_rinks TO authenticated;

-- ── Ice Contracts ────────────────────────────────────────────────────────────
-- A "contract" is a purchased block of ice (one PDF import or manual group).
CREATE TABLE IF NOT EXISTS public.ice_contracts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  rink_id     uuid        REFERENCES public.ice_rinks(id) ON DELETE SET NULL,
  pool_type   TEXT        NOT NULL DEFAULT 'business'
                CHECK (pool_type IN ('business', 'team')),
  team_id     uuid        REFERENCES public.teams(id) ON DELETE SET NULL,
  source      TEXT        NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual', 'ai_import')),
  notes       TEXT,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ice_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ice_contracts_coach" ON public.ice_contracts;
CREATE POLICY "ice_contracts_coach" ON public.ice_contracts
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_ice_contracts_coach ON public.ice_contracts(coach_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ice_contracts TO authenticated;

-- ── Ice Slots ────────────────────────────────────────────────────────────────
-- One row per booked ice block.
-- pool_type = 'business' → camps / privates / open sessions
-- pool_type = 'team'     → team practices / games (team_id required)
-- allocated_to_* links to the camp/session/game/private that uses this ice.
CREATE TABLE IF NOT EXISTS public.ice_slots (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id         uuid        REFERENCES public.ice_contracts(id) ON DELETE SET NULL,
  rink_id             uuid        REFERENCES public.ice_rinks(id) ON DELETE SET NULL,
  pool_type           TEXT        NOT NULL DEFAULT 'business'
                        CHECK (pool_type IN ('business', 'team')),
  team_id             uuid        REFERENCES public.teams(id) ON DELETE SET NULL,
  slot_date           DATE        NOT NULL,
  start_time          TIME        NOT NULL,
  end_time            TIME        NOT NULL,
  -- allocation (null = unlinked)
  allocated_to_type   TEXT        CHECK (allocated_to_type IN ('camp', 'session', 'game', 'private')),
  allocated_to_id     uuid,
  allocated_to_name   TEXT,       -- denormalised for fast display
  notes               TEXT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

ALTER TABLE public.ice_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ice_slots_coach" ON public.ice_slots;
CREATE POLICY "ice_slots_coach" ON public.ice_slots
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_ice_slots_coach ON public.ice_slots(coach_id);
CREATE INDEX IF NOT EXISTS idx_ice_slots_date  ON public.ice_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_ice_slots_pool  ON public.ice_slots(coach_id, pool_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ice_slots TO authenticated;
