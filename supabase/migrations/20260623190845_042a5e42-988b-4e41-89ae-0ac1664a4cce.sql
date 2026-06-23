
CREATE TABLE public.game_lineups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid references public.team_events(id) on delete cascade,
  positions jsonb not null default '{}'::jsonb,
  pp_units jsonb not null default '{}'::jsonb,
  pk_units jsonb not null default '{}'::jsonb,
  scratches jsonb not null default '[]'::jsonb,
  template_name text,
  is_shared boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_lineups TO authenticated;
GRANT ALL ON public.game_lineups TO service_role;
ALTER TABLE public.game_lineups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages game_lineups" ON public.game_lineups FOR ALL
  USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));
CREATE POLICY "Team parents view shared lineups" ON public.game_lineups FOR SELECT
  USING (is_shared = true AND public.is_team_parent(team_id));

CREATE TABLE public.game_plans (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.team_events(id) on delete cascade,
  opponent_notes text,
  our_gameplan text,
  matchups jsonb not null default '[]'::jsonb,
  drill_ids jsonb not null default '[]'::jsonb,
  video_clip_ids jsonb not null default '[]'::jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_plans TO authenticated;
GRANT ALL ON public.game_plans TO service_role;
ALTER TABLE public.game_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages game_plans" ON public.game_plans FOR ALL
  USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));

CREATE TABLE public.coach_game_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  event_id uuid not null references public.team_events(id) on delete cascade,
  pep_talk text,
  period_notes jsonb not null default '{}'::jsonb,
  post_game_notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_game_notes TO authenticated;
GRANT ALL ON public.coach_game_notes TO service_role;
ALTER TABLE public.coach_game_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages coach_game_notes" ON public.coach_game_notes FOR ALL
  USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));

CREATE TRIGGER game_lineups_updated_at BEFORE UPDATE ON public.game_lineups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER game_plans_updated_at BEFORE UPDATE ON public.game_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER coach_game_notes_updated_at BEFORE UPDATE ON public.coach_game_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
