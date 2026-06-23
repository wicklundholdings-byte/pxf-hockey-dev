CREATE TYPE public.accounting_provider AS ENUM ('quickbooks', 'xero');

CREATE TABLE public.accounting_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider public.accounting_provider NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  realm_id TEXT,
  tenant_id TEXT,
  account_name TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_connections TO authenticated;
GRANT ALL ON public.accounting_connections TO service_role;

ALTER TABLE public.accounting_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their own accounting connections"
  ON public.accounting_connections
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_accounting_connections_updated_at
  BEFORE UPDATE ON public.accounting_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();