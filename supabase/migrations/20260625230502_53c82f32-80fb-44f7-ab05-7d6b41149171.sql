
-- Session rate on staff
ALTER TABLE public.elite_staff_coaches
  ADD COLUMN IF NOT EXISTS session_rate_cents integer NOT NULL DEFAULT 0;

-- Cost per hour on ice slots
ALTER TABLE public.ice_slots
  ADD COLUMN IF NOT EXISTS cost_per_hour_cents integer;

-- Assignments
DO $$ BEGIN
  CREATE TYPE public.staff_session_source AS ENUM ('camp_session','team_event');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.staff_session_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.elite_staff_coaches(id) ON DELETE CASCADE,
  source_type public.staff_session_source NOT NULL,
  source_id uuid NOT NULL,
  session_date date NOT NULL,
  rate_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS staff_session_assignments_owner_date_idx
  ON public.staff_session_assignments (owner_id, session_date);
CREATE INDEX IF NOT EXISTS staff_session_assignments_staff_date_idx
  ON public.staff_session_assignments (staff_id, session_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_session_assignments TO authenticated;
GRANT ALL ON public.staff_session_assignments TO service_role;
ALTER TABLE public.staff_session_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own staff assignments"
  ON public.staff_session_assignments
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Staff reads own assignments"
  ON public.staff_session_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.elite_staff_coaches s
            WHERE s.id = staff_id AND s.staff_user_id = auth.uid())
  );

-- Manual monthly ice cost overrides
CREATE TABLE IF NOT EXISTS public.ice_cost_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, month_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ice_cost_overrides TO authenticated;
GRANT ALL ON public.ice_cost_overrides TO service_role;
ALTER TABLE public.ice_cost_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own ice cost overrides"
  ON public.ice_cost_overrides
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP TRIGGER IF EXISTS ice_cost_overrides_set_updated_at ON public.ice_cost_overrides;
CREATE TRIGGER ice_cost_overrides_set_updated_at
  BEFORE UPDATE ON public.ice_cost_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
