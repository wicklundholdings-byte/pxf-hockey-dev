
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE TABLE IF NOT EXISTS public.message_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_poll_votes TO authenticated;
GRANT ALL ON public.message_poll_votes TO service_role;

ALTER TABLE public.message_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view poll votes" ON public.message_poll_votes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND public.is_conversation_member(m.conversation_id, auth.uid())
  ));

CREATE POLICY "Members cast own poll vote" ON public.message_poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id AND public.is_conversation_member(m.conversation_id, auth.uid())
  ));

CREATE POLICY "Members change own poll vote" ON public.message_poll_votes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members remove own poll vote" ON public.message_poll_votes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_poll_votes;
