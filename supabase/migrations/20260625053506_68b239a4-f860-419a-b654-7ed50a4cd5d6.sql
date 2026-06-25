ALTER TYPE public.conversation_type ADD VALUE IF NOT EXISTS 'team_group';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conversations_team_id ON public.conversations(team_id);