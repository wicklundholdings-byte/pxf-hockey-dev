ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT;

CREATE TYPE public.email_marketing_provider AS ENUM ('mailchimp', 'klaviyo');

CREATE TABLE public.email_marketing_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider public.email_marketing_provider NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  api_key TEXT,
  api_server TEXT,
  account_name TEXT,
  list_id TEXT,
  list_name TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_marketing_connections TO authenticated;
GRANT ALL ON public.email_marketing_connections TO service_role;

ALTER TABLE public.email_marketing_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their own email marketing connections"
  ON public.email_marketing_connections
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_email_marketing_connections_updated_at
  BEFORE UPDATE ON public.email_marketing_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();