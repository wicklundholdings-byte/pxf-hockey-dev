-- ============================================================
-- Migration 020: Unified Locations System
-- Merges ice_rinks into coach_locations so one shared list
-- of venues (rinks, dryland facilities, etc.) populates
-- across camps, sessions, ice slots, and all other screens.
-- ============================================================

-- 1. Add color to coach_locations (was only on ice_rinks before)
ALTER TABLE public.coach_locations
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#00C4B4';

-- 2. Add location_id to ice_slots (FK → coach_locations)
--    Keep rink_id column for backwards compat — app no longer writes to it.
ALTER TABLE public.ice_slots
  ADD COLUMN IF NOT EXISTS location_id UUID
    REFERENCES public.coach_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ice_slots_location ON public.ice_slots(location_id);

-- 3. Copy ice_rinks rows into coach_locations (skip duplicates by name+coach)
INSERT INTO public.coach_locations (coach_id, name, address, color)
SELECT r.coach_id, r.name, r.address, r.color
FROM public.ice_rinks r
WHERE NOT EXISTS (
  SELECT 1 FROM public.coach_locations cl
  WHERE cl.coach_id = r.coach_id
    AND lower(cl.name) = lower(r.name)
);

-- 4. Back-fill ice_slots.location_id from the migrated coach_locations rows
UPDATE public.ice_slots s
SET location_id = cl.id
FROM public.ice_rinks r
JOIN public.coach_locations cl
  ON cl.coach_id = r.coach_id AND lower(cl.name) = lower(r.name)
WHERE s.rink_id = r.id
  AND s.location_id IS NULL;

-- 5. Ensure permissions (014 may have missed this on some projects)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_locations TO authenticated;
