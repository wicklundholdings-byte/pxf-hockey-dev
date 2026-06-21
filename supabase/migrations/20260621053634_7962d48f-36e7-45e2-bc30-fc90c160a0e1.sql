
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger text NOT NULL DEFAULT 'signup', -- signup | registration | post_camp | inactivity | manual
  trigger_camp_id uuid REFERENCES public.camps(id) ON DELETE SET NULL,
  inactivity_days integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sequences TO authenticated;
GRANT ALL ON public.email_sequences TO service_role;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own sequences" ON public.email_sequences
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_email_sequences_updated BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  delay_days integer NOT NULL DEFAULT 0,
  delay_hours integer NOT NULL DEFAULT 0,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sequence_steps TO authenticated;
GRANT ALL ON public.email_sequence_steps TO service_role;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own sequence steps" ON public.email_sequence_steps
  FOR ALL USING (EXISTS (SELECT 1 FROM public.email_sequences s WHERE s.id = sequence_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.email_sequences s WHERE s.id = sequence_id AND s.owner_id = auth.uid()));
CREATE TRIGGER trg_email_sequence_steps_updated BEFORE UPDATE ON public.email_sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.email_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active | completed | cancelled
  next_send_at timestamptz,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sequence_enrollments TO authenticated;
GRANT ALL ON public.email_sequence_enrollments TO service_role;
ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own enrollments" ON public.email_sequence_enrollments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.email_sequences s WHERE s.id = sequence_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.email_sequences s WHERE s.id = sequence_id AND s.owner_id = auth.uid()));
CREATE TRIGGER trg_email_sequence_enrollments_updated BEFORE UPDATE ON public.email_sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_seq_steps_seq ON public.email_sequence_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_seq_enroll_next ON public.email_sequence_enrollments(next_send_at) WHERE status = 'active';
