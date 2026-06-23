
DO $$ BEGIN
  CREATE TYPE public.device_provider AS ENUM ('apple_health','whoop','garmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.combine_category AS ENUM (
    'speed_power','jumping_explosiveness','shot_power','shot_speed','agility_circuits','recovery_wellness'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- coach_marketing_settings
CREATE TABLE public.coach_marketing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  meta_pixel_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_marketing_settings TO authenticated;
GRANT SELECT ON public.coach_marketing_settings TO anon;
GRANT ALL ON public.coach_marketing_settings TO service_role;
ALTER TABLE public.coach_marketing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach manages own marketing" ON public.coach_marketing_settings
  FOR ALL TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "public read pixel" ON public.coach_marketing_settings
  FOR SELECT TO anon USING (true);
CREATE TRIGGER trg_cms_updated BEFORE UPDATE ON public.coach_marketing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- athlete_device_connections
CREATE TABLE public.athlete_device_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  provider public.device_provider NOT NULL,
  access_token text,
  refresh_token text,
  last_synced_at timestamptz,
  resting_hr numeric,
  hrv numeric,
  sleep_score numeric,
  recovery_score numeric,
  daily_strain numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_device_connections TO authenticated;
GRANT ALL ON public.athlete_device_connections TO service_role;
ALTER TABLE public.athlete_device_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device conn parent or coach" ON public.athlete_device_connections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      JOIN public.registrations r ON r.attendee_id = a.id
      LEFT JOIN public.camps c ON c.id = r.camp_id
      WHERE a.id = athlete_id
        AND (r.contact_id IN (SELECT public.current_user_contact_ids()) OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendees a
      JOIN public.registrations r ON r.attendee_id = a.id
      WHERE a.id = athlete_id
        AND r.contact_id IN (SELECT public.current_user_contact_ids())
    )
  );
CREATE TRIGGER trg_adc_updated BEFORE UPDATE ON public.athlete_device_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- drills: social source
ALTER TABLE public.drills
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_credit text;

-- combine_tests
CREATE TABLE public.combine_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  category public.combine_category NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  hardware_source text,
  tested_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combine_tests TO authenticated;
GRANT ALL ON public.combine_tests TO service_role;
ALTER TABLE public.combine_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combine tests parent or coach" ON public.combine_tests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      JOIN public.registrations r ON r.attendee_id = a.id
      LEFT JOIN public.camps c ON c.id = r.camp_id
      WHERE a.id = athlete_id
        AND (r.contact_id IN (SELECT public.current_user_contact_ids()) OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendees a
      JOIN public.registrations r ON r.attendee_id = a.id
      LEFT JOIN public.camps c ON c.id = r.camp_id
      WHERE a.id = athlete_id
        AND (r.contact_id IN (SELECT public.current_user_contact_ids()) OR c.owner_id = auth.uid())
    )
  );
CREATE INDEX idx_combine_tests_athlete_cat ON public.combine_tests (athlete_id, category, tested_at DESC);

-- combine_public_shares (created before combine_scores so policy can reference it)
CREATE TABLE public.combine_public_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combine_public_shares TO authenticated;
GRANT SELECT ON public.combine_public_shares TO anon;
GRANT ALL ON public.combine_public_shares TO service_role;
ALTER TABLE public.combine_public_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share managed by parent" ON public.combine_public_shares
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      JOIN public.registrations r ON r.attendee_id = a.id
      WHERE a.id = athlete_id AND r.contact_id IN (SELECT public.current_user_contact_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendees a
      JOIN public.registrations r ON r.attendee_id = a.id
      WHERE a.id = athlete_id AND r.contact_id IN (SELECT public.current_user_contact_ids())
    )
  );
CREATE POLICY "public resolves share by token" ON public.combine_public_shares
  FOR SELECT TO anon USING (revoked_at IS NULL);

-- combine_scores
CREATE TABLE public.combine_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  category public.combine_category NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 1000),
  percentile numeric CHECK (percentile >= 0 AND percentile <= 100),
  global_rank integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combine_scores TO authenticated;
GRANT SELECT ON public.combine_scores TO anon;
GRANT ALL ON public.combine_scores TO service_role;
ALTER TABLE public.combine_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combine scores parent or coach" ON public.combine_scores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      JOIN public.registrations r ON r.attendee_id = a.id
      LEFT JOIN public.camps c ON c.id = r.camp_id
      WHERE a.id = athlete_id
        AND (r.contact_id IN (SELECT public.current_user_contact_ids()) OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (true);
CREATE POLICY "public read scores via share" ON public.combine_scores
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.combine_public_shares s
      WHERE s.athlete_id = combine_scores.athlete_id AND s.revoked_at IS NULL
    )
  );
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.combine_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
