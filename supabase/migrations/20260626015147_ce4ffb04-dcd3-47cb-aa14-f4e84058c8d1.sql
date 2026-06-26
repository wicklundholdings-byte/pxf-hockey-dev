
ALTER TABLE public.rinks
  ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'rink',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS cost_per_hour_cents integer;

ALTER TABLE public.rinks
  DROP CONSTRAINT IF EXISTS rinks_location_type_check;
ALTER TABLE public.rinks
  ADD CONSTRAINT rinks_location_type_check
  CHECK (location_type IN ('rink','gym','outdoor','other'));

ALTER TABLE public.private_sessions
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.rinks(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Elite staff can view owner rinks" ON public.rinks;
CREATE POLICY "Elite staff can view owner rinks"
ON public.rinks FOR SELECT
TO authenticated
USING (owner_id = public.elite_owner_for(auth.uid()));
