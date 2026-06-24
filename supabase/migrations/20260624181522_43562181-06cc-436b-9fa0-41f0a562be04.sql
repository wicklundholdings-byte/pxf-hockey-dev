
ALTER TABLE public.game_plans ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.game_parent_publish (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.team_events(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  share_lineup boolean NOT NULL DEFAULT false,
  share_gameplan boolean NOT NULL DEFAULT false,
  share_systems boolean NOT NULL DEFAULT false,
  share_message boolean NOT NULL DEFAULT false,
  public_gameplan_text text,
  public_systems_text text,
  coach_message text,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_parent_publish TO authenticated;
GRANT ALL ON public.game_parent_publish TO service_role;

ALTER TABLE public.game_parent_publish ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage publish settings for their team"
  ON public.game_parent_publish FOR ALL
  TO authenticated
  USING (public.is_team_coach(team_id))
  WITH CHECK (public.is_team_coach(team_id));

CREATE POLICY "Team parents read publish settings"
  ON public.game_parent_publish FOR SELECT
  TO authenticated
  USING (public.is_team_parent(team_id));

CREATE TRIGGER update_game_parent_publish_updated_at
  BEFORE UPDATE ON public.game_parent_publish
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_game_parent_publish_team ON public.game_parent_publish(team_id);
