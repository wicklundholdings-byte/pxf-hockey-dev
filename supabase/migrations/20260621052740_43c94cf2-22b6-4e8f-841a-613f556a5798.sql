
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS sms_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_opt_in boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_sender_phone text,
  ADD COLUMN IF NOT EXISTS sms_sender_name text,
  ADD COLUMN IF NOT EXISTS sms_provider text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sms_signature text;

ALTER TABLE public.camps
  ADD COLUMN IF NOT EXISTS reminder_7day boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_1day boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_morning boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS absent_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS absent_alert_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS confirmation_sms boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  audience_type text NOT NULL DEFAULT 'all',
  audience_id text,
  channel_push boolean NOT NULL DEFAULT true,
  channel_email boolean NOT NULL DEFAULT true,
  channel_sms boolean NOT NULL DEFAULT false,
  scheduled_for timestamptz,
  sent_at timestamptz,
  reach integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broadcasts_owner_all" ON public.broadcasts
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER broadcasts_updated_at BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camp_id uuid REFERENCES public.camps(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel text NOT NULL,
  kind text NOT NULL,
  body text NOT NULL,
  subject text,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'queued',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduled_messages_due_idx
  ON public.scheduled_messages (status, scheduled_for);
CREATE INDEX IF NOT EXISTS scheduled_messages_owner_idx
  ON public.scheduled_messages (owner_id, scheduled_for DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_messages TO authenticated;
GRANT ALL ON public.scheduled_messages TO service_role;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_messages_owner_all" ON public.scheduled_messages
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
