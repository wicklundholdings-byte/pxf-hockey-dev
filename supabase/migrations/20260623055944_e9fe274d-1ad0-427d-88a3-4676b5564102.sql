
-- Helper: effective owner for current user
CREATE OR REPLACE FUNCTION public.effective_owner_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.team_members
       WHERE member_user_id = auth.uid() AND status = 'active' LIMIT 1),
    auth.uid()
  );
$$;

-- RINKS
CREATE TABLE public.rinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  color text NOT NULL DEFAULT '#14b8a6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rinks TO authenticated;
GRANT ALL ON public.rinks TO service_role;
ALTER TABLE public.rinks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage rinks" ON public.rinks
  FOR ALL TO authenticated
  USING (owner_id = public.effective_owner_id())
  WITH CHECK (owner_id = public.effective_owner_id());
CREATE TRIGGER trg_rinks_updated BEFORE UPDATE ON public.rinks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ICE IMPORT BATCHES
CREATE TABLE public.ice_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  source_file_url text,
  source_file_name text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ice_import_batches TO authenticated;
GRANT ALL ON public.ice_import_batches TO service_role;
ALTER TABLE public.ice_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage batches" ON public.ice_import_batches
  FOR ALL TO authenticated
  USING (owner_id = public.effective_owner_id())
  WITH CHECK (owner_id = public.effective_owner_id());

-- ICE SLOTS
CREATE TABLE public.ice_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  batch_id uuid REFERENCES public.ice_import_batches(id) ON DELETE SET NULL,
  rink_id uuid REFERENCES public.rinks(id) ON DELETE SET NULL,
  booked_by_coach_id uuid,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  surface_type text NOT NULL DEFAULT 'full_ice',
  camp_id uuid REFERENCES public.camps(id) ON DELETE SET NULL,
  notes text,
  ambiguous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ice_slots TO authenticated;
GRANT ALL ON public.ice_slots TO service_role;
ALTER TABLE public.ice_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage slots" ON public.ice_slots
  FOR ALL TO authenticated
  USING (owner_id = public.effective_owner_id())
  WITH CHECK (owner_id = public.effective_owner_id());
CREATE TRIGGER trg_ice_slots_updated BEFORE UPDATE ON public.ice_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ice_slots_owner_date ON public.ice_slots(owner_id, slot_date);
CREATE INDEX idx_ice_slots_camp ON public.ice_slots(camp_id) WHERE camp_id IS NOT NULL;

-- Conflict trigger: prevent duplicate camp link and overlapping slot at same rink
CREATE OR REPLACE FUNCTION public.check_ice_slot_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.camp_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ice_slots
    WHERE owner_id = NEW.owner_id
      AND camp_id = NEW.camp_id
      AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'That ice time is already used by this camp';
  END IF;

  IF NEW.rink_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ice_slots
    WHERE owner_id = NEW.owner_id
      AND rink_id = NEW.rink_id
      AND slot_date = NEW.slot_date
      AND id <> NEW.id
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Overlapping ice slot already exists at this rink';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ice_slots_conflict
  BEFORE INSERT OR UPDATE ON public.ice_slots
  FOR EACH ROW EXECUTE FUNCTION public.check_ice_slot_conflicts();
