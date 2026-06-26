
CREATE TABLE public.private_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME,
  duration_minutes INTEGER,
  location TEXT,
  fee_cents INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_sessions TO authenticated;
GRANT ALL ON public.private_sessions TO service_role;

ALTER TABLE public.private_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own private sessions"
  ON public.private_sessions FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE INDEX private_sessions_owner_date_idx ON public.private_sessions(owner_id, session_date);

CREATE TRIGGER update_private_sessions_updated_at
  BEFORE UPDATE ON public.private_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
