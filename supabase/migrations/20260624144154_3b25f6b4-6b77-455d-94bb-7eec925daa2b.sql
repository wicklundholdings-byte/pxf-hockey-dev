
ALTER TABLE public.dryland_videos
  ADD COLUMN IF NOT EXISTS total_seconds integer NOT NULL DEFAULT 0;

UPDATE public.dryland_videos
  SET total_seconds = GREATEST(duration_minutes, 1) * 60
  WHERE total_seconds = 0;

ALTER TABLE public.dryland_watch_progress
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dwp_team ON public.dryland_watch_progress(team_id);
CREATE INDEX IF NOT EXISTS idx_dwp_athlete_completed ON public.dryland_watch_progress(athlete_id, completed, last_watched_at);

CREATE OR REPLACE FUNCTION public.enforce_dryland_completion_threshold()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_total integer;
BEGIN
  SELECT total_seconds INTO v_total FROM public.dryland_videos WHERE id = NEW.video_id;
  IF v_total IS NULL OR v_total <= 0 THEN v_total := 1; END IF;
  IF NEW.watched_seconds >= (v_total * 0.9) THEN NEW.completed := true;
  ELSE NEW.completed := false; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dwp_enforce_completion ON public.dryland_watch_progress;
CREATE TRIGGER trg_dwp_enforce_completion
  BEFORE INSERT OR UPDATE ON public.dryland_watch_progress
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dryland_completion_threshold();

CREATE TABLE IF NOT EXISTS public.dryland_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL UNIQUE REFERENCES public.attendees(id) ON DELETE CASCADE,
  current_streak_weeks integer NOT NULL DEFAULT 0,
  longest_streak_weeks integer NOT NULL DEFAULT 0,
  last_active_week date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dryland_streaks TO authenticated;
GRANT ALL ON public.dryland_streaks TO service_role;

ALTER TABLE public.dryland_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View athlete streaks" ON public.dryland_streaks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Manage athlete streaks" ON public.dryland_streaks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid())
              OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_dryland_streaks_uat BEFORE UPDATE ON public.dryland_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_dryland_streak()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_this_week date := date_trunc('week', now())::date;
  v_last_week date := (date_trunc('week', now()) - interval '1 week')::date;
  v_prev date; v_current integer; v_longest integer;
BEGIN
  IF NEW.completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.completed IS TRUE THEN RETURN NEW; END IF;

  SELECT last_active_week, current_streak_weeks, longest_streak_weeks
    INTO v_prev, v_current, v_longest
    FROM public.dryland_streaks WHERE athlete_id = NEW.athlete_id;

  IF v_prev IS NULL THEN v_current := 1;
  ELSIF v_prev = v_this_week THEN v_current := COALESCE(v_current, 1);
  ELSIF v_prev = v_last_week THEN v_current := COALESCE(v_current, 0) + 1;
  ELSE v_current := 1;
  END IF;

  v_longest := GREATEST(COALESCE(v_longest, 0), v_current);

  INSERT INTO public.dryland_streaks (athlete_id, current_streak_weeks, longest_streak_weeks, last_active_week)
  VALUES (NEW.athlete_id, v_current, v_longest, v_this_week)
  ON CONFLICT (athlete_id) DO UPDATE
    SET current_streak_weeks = EXCLUDED.current_streak_weeks,
        longest_streak_weeks = EXCLUDED.longest_streak_weeks,
        last_active_week = EXCLUDED.last_active_week,
        updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dwp_bump_streak ON public.dryland_watch_progress;
CREATE TRIGGER trg_dwp_bump_streak
  AFTER INSERT OR UPDATE ON public.dryland_watch_progress
  FOR EACH ROW EXECUTE FUNCTION public.bump_dryland_streak();

CREATE OR REPLACE FUNCTION public.get_team_dryland_leaderboard(_team_id uuid, _since timestamptz)
RETURNS TABLE (
  athlete_id uuid,
  full_name text,
  athlete_position dryland_position,
  sessions_in_window integer,
  sessions_all_time integer,
  current_streak_weeks integer,
  longest_streak_weeks integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.id,
    a.full_name,
    a.preferred_position,
    COALESCE((SELECT count(*)::int FROM public.dryland_watch_progress w
              WHERE w.athlete_id = a.id AND w.completed = true AND w.last_watched_at >= _since), 0),
    COALESCE((SELECT count(*)::int FROM public.dryland_watch_progress w2
              WHERE w2.athlete_id = a.id AND w2.completed = true), 0),
    COALESCE(s.current_streak_weeks, 0),
    COALESCE(s.longest_streak_weeks, 0)
  FROM public.team_players tp
  JOIN public.attendees a ON a.id = tp.athlete_id
  LEFT JOIN public.dryland_streaks s ON s.athlete_id = a.id
  WHERE tp.team_id = _team_id AND tp.athlete_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_dryland_leaderboard(uuid, timestamptz) TO authenticated;
