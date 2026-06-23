
ALTER TABLE public.messages
  ADD COLUMN athlete_media_id uuid REFERENCES public.athlete_media(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_athlete_media ON public.messages(athlete_media_id);
