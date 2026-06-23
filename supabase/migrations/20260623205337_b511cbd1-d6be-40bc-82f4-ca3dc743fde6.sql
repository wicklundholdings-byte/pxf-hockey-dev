
CREATE TYPE public.game_media_type AS ENUM ('photo','video');
CREATE TYPE public.game_media_label AS ENUM ('highlight','full_game','period_1','period_2','period_3','warmup','other');

CREATE TABLE public.game_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  media_type public.game_media_type NOT NULL,
  label public.game_media_label NOT NULL DEFAULT 'other',
  url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  caption text,
  athlete_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_media TO authenticated;
GRANT ALL ON public.game_media TO service_role;
ALTER TABLE public.game_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages team media"
ON public.game_media FOR ALL TO authenticated
USING (public.is_team_coach(team_id))
WITH CHECK (public.is_team_coach(team_id) AND uploaded_by = auth.uid());

CREATE POLICY "Team parents view media"
ON public.game_media FOR SELECT TO authenticated
USING (public.is_team_parent(team_id));

CREATE INDEX idx_game_media_event ON public.game_media(event_id, created_at DESC);
CREATE INDEX idx_game_media_team ON public.game_media(team_id, created_at DESC);

CREATE TABLE public.game_highlight_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  clip_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_highlight_reels TO authenticated;
GRANT ALL ON public.game_highlight_reels TO service_role;
ALTER TABLE public.game_highlight_reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages reels"
ON public.game_highlight_reels FOR ALL TO authenticated
USING (public.is_team_coach(team_id))
WITH CHECK (public.is_team_coach(team_id) AND created_by = auth.uid());

CREATE POLICY "Team parents view shared reels"
ON public.game_highlight_reels FOR SELECT TO authenticated
USING (is_shared AND public.is_team_parent(team_id));
