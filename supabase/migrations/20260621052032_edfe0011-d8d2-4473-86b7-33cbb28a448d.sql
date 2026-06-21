
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'manual';

ALTER TABLE public.waitlist_entries
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  recipient_phone text,
  recipient_name text,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'mock',
  scheduled_for timestamptz,
  sent_at timestamptz,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  camp_id uuid REFERENCES public.camps(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage sms_logs"
  ON public.sms_logs
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS sms_logs_owner_idx ON public.sms_logs(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sms_logs_camp_idx ON public.sms_logs(camp_id);

CREATE TRIGGER update_sms_logs_updated_at
  BEFORE UPDATE ON public.sms_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
