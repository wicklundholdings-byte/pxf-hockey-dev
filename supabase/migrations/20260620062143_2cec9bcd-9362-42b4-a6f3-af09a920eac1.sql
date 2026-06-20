ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes text;
CREATE INDEX IF NOT EXISTS contacts_owner_search_idx ON public.contacts (owner_id, full_name);
CREATE INDEX IF NOT EXISTS attendees_owner_idx ON public.attendees (owner_id);