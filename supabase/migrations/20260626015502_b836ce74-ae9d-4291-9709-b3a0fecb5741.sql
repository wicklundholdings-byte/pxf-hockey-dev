
-- Private series support
CREATE TABLE public.private_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  athlete_name text NOT NULL,
  location text,
  location_id uuid REFERENCES public.rinks(id) ON DELETE SET NULL,
  pricing_mode text NOT NULL DEFAULT 'per_session' CHECK (pricing_mode IN ('per_session','flat')),
  per_session_fee_cents integer,
  flat_fee_cents integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_series TO authenticated;
GRANT ALL ON public.private_series TO service_role;
ALTER TABLE public.private_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their private series" ON public.private_series
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_private_series_updated_at BEFORE UPDATE ON public.private_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.private_sessions
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.private_series(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_private_sessions_series_id ON public.private_sessions(series_id);
