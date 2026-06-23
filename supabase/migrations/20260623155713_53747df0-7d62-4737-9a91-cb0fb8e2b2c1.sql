
CREATE TABLE public.athlete_health_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL UNIQUE REFERENCES public.attendees(id) ON DELETE CASCADE,
  allergies jsonb NOT NULL DEFAULT '{"categories": [], "notes": ""}'::jsonb,
  medications text,
  conditions text,
  physician_name text,
  physician_phone text,
  emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  insurance_info jsonb,
  clearance_doc_url text,
  needs_encryption boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_health_profiles TO authenticated;
GRANT ALL ON public.athlete_health_profiles TO service_role;

ALTER TABLE public.athlete_health_profiles ENABLE ROW LEVEL SECURITY;

-- Parents manage their own athletes' health profile
CREATE POLICY "Parents manage own athlete health"
  ON public.athlete_health_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = athlete_health_profiles.athlete_id
        AND a.contact_id IN (SELECT public.current_user_contact_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = athlete_health_profiles.athlete_id
        AND a.contact_id IN (SELECT public.current_user_contact_ids())
    )
  );

-- Coaches/owners read health for athletes they own (RLS-scoped read for Coach/Manager/Owner roles)
CREATE POLICY "Coaches read athlete health"
  ON public.athlete_health_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = athlete_health_profiles.athlete_id
        AND (a.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE TRIGGER update_athlete_health_profiles_updated_at
  BEFORE UPDATE ON public.athlete_health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_health_profiles_athlete ON public.athlete_health_profiles(athlete_id);
