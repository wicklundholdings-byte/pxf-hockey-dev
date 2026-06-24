
-- Enums
DO $$ BEGIN CREATE TYPE public.dryland_video_category AS ENUM ('stickhandling','shooting','strength_fitness','synthetic_ice','mobility_flexibility'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.dryland_position AS ENUM ('player','goalie','both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.dryland_program_season AS ENUM ('fall_winter','spring','summer','year_round'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.dryland_program_status AS ENUM ('coming_soon','active'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Attendees: preferred position memory
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS preferred_position public.dryland_position NOT NULL DEFAULT 'player';

-- Extend dryland_programs (schema only; no UI yet)
ALTER TABLE public.dryland_programs ADD COLUMN IF NOT EXISTS season public.dryland_program_season;
ALTER TABLE public.dryland_programs ADD COLUMN IF NOT EXISTS position public.dryland_position;
ALTER TABLE public.dryland_programs ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.dryland_programs ADD COLUMN IF NOT EXISTS status public.dryland_program_status NOT NULL DEFAULT 'active';
ALTER TABLE public.dryland_programs ADD COLUMN IF NOT EXISTS launch_label text;

-- dryland_videos
CREATE TABLE IF NOT EXISTS public.dryland_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category public.dryland_video_category NOT NULL,
  position public.dryland_position NOT NULL DEFAULT 'both',
  age_group text,
  difficulty public.dryland_difficulty NOT NULL DEFAULT 'beginner',
  duration_minutes integer NOT NULL DEFAULT 15,
  instructor_name text,
  video_url text,
  thumbnail_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dryland_videos TO authenticated;
GRANT ALL ON public.dryland_videos TO service_role;
ALTER TABLE public.dryland_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View published videos" ON public.dryland_videos FOR SELECT TO authenticated USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage videos" ON public.dryland_videos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_dryland_videos_uat BEFORE UPDATE ON public.dryland_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- dryland_program_sessions (link table, schema only)
CREATE TABLE IF NOT EXISTS public.dryland_program_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.dryland_programs(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.dryland_videos(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dryland_program_sessions TO authenticated;
GRANT ALL ON public.dryland_program_sessions TO service_role;
ALTER TABLE public.dryland_program_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View program sessions" ON public.dryland_program_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage program sessions" ON public.dryland_program_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- dryland_watch_progress
CREATE TABLE IF NOT EXISTS public.dryland_watch_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.dryland_videos(id) ON DELETE CASCADE,
  watched_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dryland_watch_progress TO authenticated;
GRANT ALL ON public.dryland_watch_progress TO service_role;
ALTER TABLE public.dryland_watch_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own watch progress" ON public.dryland_watch_progress FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid()));
CREATE TRIGGER trg_dryland_watch_progress_uat BEFORE UPDATE ON public.dryland_watch_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 6 placeholder videos
INSERT INTO public.dryland_videos (title, category, position, age_group, difficulty, duration_minutes, instructor_name, thumbnail_url, video_url, is_featured, published_at)
VALUES
  ('Quick Hands Stickhandling Circuit','stickhandling','player','U12','beginner',15,'Coach Reilly','https://images.unsplash.com/photo-1515703407324-5f51c2ee0a1b?w=800','', true,  now() - interval '2 days'),
  ('Snap Shot Power Builder','shooting','player','U14','intermediate',20,'Coach Mason','https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800','', false, now() - interval '4 days'),
  ('Explosive Lower Body Strength','strength_fitness','player','U16','intermediate',30,'Coach Vidal','https://images.unsplash.com/photo-1554284126-aa88f22d8b74?w=800','', false, now() - interval '6 days'),
  ('Slipboard Footwork Flow','synthetic_ice','goalie','U12','beginner',15,'Coach Park','https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800','', true,  now() - interval '1 days'),
  ('Goalie Mobility & Hip Openers','mobility_flexibility','goalie','U14','beginner',10,'Coach Park','https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800','', false, now() - interval '3 days'),
  ('Goalie Core & Stability','strength_fitness','goalie','U16','advanced',20,'Coach Vidal','https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800','', false, now() - interval '5 days');
