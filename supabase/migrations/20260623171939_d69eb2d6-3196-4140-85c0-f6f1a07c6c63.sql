
-- Enums
CREATE TYPE public.dryland_category AS ENUM ('stick_skills','shooting','strength_explosiveness');
CREATE TYPE public.dryland_difficulty AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE public.enrollment_role AS ENUM ('parent','coach');
CREATE TYPE public.enrollment_status AS ENUM ('active','paused','completed');
CREATE TYPE public.recommendation_status AS ENUM ('pending','accepted','dismissed');

-- Programs
CREATE TABLE public.dryland_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.dryland_category NOT NULL,
  difficulty public.dryland_difficulty NOT NULL,
  age_group_min int NOT NULL DEFAULT 8,
  age_group_max int NOT NULL DEFAULT 17,
  description text,
  session_count int NOT NULL DEFAULT 0,
  avg_session_minutes int NOT NULL DEFAULT 20,
  is_published boolean NOT NULL DEFAULT true,
  created_by_admin uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dryland_programs TO authenticated, anon;
GRANT ALL ON public.dryland_programs TO service_role;
ALTER TABLE public.dryland_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published programs" ON public.dryland_programs FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage programs" ON public.dryland_programs FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Weeks
CREATE TABLE public.dryland_program_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.dryland_programs(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dryland_program_weeks TO authenticated, anon;
GRANT ALL ON public.dryland_program_weeks TO service_role;
ALTER TABLE public.dryland_program_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view weeks" ON public.dryland_program_weeks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.dryland_programs p WHERE p.id = program_id AND p.is_published)
);
CREATE POLICY "Admins manage weeks" ON public.dryland_program_weeks FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Sessions
CREATE TABLE public.dryland_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.dryland_programs(id) ON DELETE CASCADE,
  week_number int NOT NULL DEFAULT 1,
  day_number int NOT NULL DEFAULT 1,
  name text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 20,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dryland_sessions TO authenticated, anon;
GRANT ALL ON public.dryland_sessions TO service_role;
ALTER TABLE public.dryland_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view sessions" ON public.dryland_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.dryland_programs p WHERE p.id = program_id AND p.is_published)
);
CREATE POLICY "Admins manage sessions" ON public.dryland_sessions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Exercises
CREATE TABLE public.dryland_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.dryland_sessions(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  name text NOT NULL,
  sets int,
  reps int,
  duration_seconds int,
  rest_seconds int DEFAULT 30,
  instruction_text text,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dryland_exercises TO authenticated, anon;
GRANT ALL ON public.dryland_exercises TO service_role;
ALTER TABLE public.dryland_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view exercises" ON public.dryland_exercises FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.dryland_sessions s
    JOIN public.dryland_programs p ON p.id = s.program_id
    WHERE s.id = session_id AND p.is_published
  )
);
CREATE POLICY "Admins manage exercises" ON public.dryland_exercises FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Enrollments
CREATE TABLE public.athlete_program_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.dryland_programs(id) ON DELETE CASCADE,
  enrolled_by uuid NOT NULL,
  enrolled_by_role public.enrollment_role NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  training_days jsonb NOT NULL DEFAULT '[1,3,5]'::jsonb,
  status public.enrollment_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_program_enrollments TO authenticated;
GRANT ALL ON public.athlete_program_enrollments TO service_role;
ALTER TABLE public.athlete_program_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parent manages own athlete enrollments" ON public.athlete_program_enrollments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid()));
CREATE POLICY "Coach can view + assign for their camp athletes" ON public.athlete_program_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.camps c ON c.id = r.camp_id
      WHERE r.attendee_id = athlete_id AND c.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.camps c ON c.id = r.camp_id
      WHERE r.attendee_id = athlete_id AND c.owner_id = auth.uid()
    )
  );

-- Completions
CREATE TABLE public.athlete_session_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.dryland_sessions(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES public.athlete_program_enrollments(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  duration_actual_seconds int,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_session_completions TO authenticated;
GRANT ALL ON public.athlete_session_completions TO service_role;
ALTER TABLE public.athlete_session_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parent manages own completions" ON public.athlete_session_completions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid()));
CREATE POLICY "Coach views completions for their athletes" ON public.athlete_session_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.camps c ON c.id = r.camp_id
      WHERE r.attendee_id = athlete_id AND c.owner_id = auth.uid()
    )
  );

-- Recommendations
CREATE TABLE public.program_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.dryland_programs(id) ON DELETE CASCADE,
  message text,
  status public.recommendation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_recommendations TO authenticated;
GRANT ALL ON public.program_recommendations TO service_role;
ALTER TABLE public.program_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages own recommendations" ON public.program_recommendations FOR ALL
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "Parent views athlete recommendations" ON public.program_recommendations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid()));
CREATE POLICY "Parent updates own athlete recommendations" ON public.program_recommendations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = athlete_id AND a.owner_id = auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_dryland_programs_uat BEFORE UPDATE ON public.dryland_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_enrollments_uat BEFORE UPDATE ON public.athlete_program_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_dryland_sessions_program ON public.dryland_sessions(program_id, display_order);
CREATE INDEX idx_dryland_exercises_session ON public.dryland_exercises(session_id, display_order);
CREATE INDEX idx_enrollments_athlete ON public.athlete_program_enrollments(athlete_id, status);
CREATE INDEX idx_completions_athlete ON public.athlete_session_completions(athlete_id, completed_at DESC);

-- ===== SEED 3 programs =====
DO $$
DECLARE
  v_sample_video text := 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  p_stick uuid := gen_random_uuid();
  p_shoot uuid := gen_random_uuid();
  p_strength uuid := gen_random_uuid();
  s_id uuid;
  i int;
  j int;
  session_names text[];
BEGIN
  -- Stick Skills
  INSERT INTO public.dryland_programs (id, name, category, difficulty, age_group_min, age_group_max, description, session_count, avg_session_minutes)
  VALUES (p_stick, 'Stick Skills Starter', 'stick_skills', 'beginner', 8, 13,
    'Build soft, quick hands at home. Daily handles, dekes, and reaction work using only a stick and a ball.', 4, 20);
  session_names := ARRAY['Soft Hands Base','Toe Drags & Pulls','Reaction Handles','Game-Speed Combo'];
  FOR i IN 1..4 LOOP
    INSERT INTO public.dryland_sessions (id, program_id, week_number, day_number, name, duration_minutes, display_order)
    VALUES (gen_random_uuid(), p_stick, ((i-1)/3)+1, ((i-1)%3)+1, session_names[i], 20, i) RETURNING id INTO s_id;
    FOR j IN 1..6 LOOP
      INSERT INTO public.dryland_exercises (session_id, display_order, name, sets, reps, rest_seconds, instruction_text, video_url)
      VALUES (s_id, j,
        (ARRAY['Stationary Handles','Wide Dribbles','Toe Drag Pulls','Figure 8','Quick Hands','Deke Combo'])[j],
        3, 20, 20,
        'Stay low, eyes up. Quality reps over speed — focus on soft puck contact.',
        v_sample_video);
    END LOOP;
  END LOOP;

  -- Shooting
  INSERT INTO public.dryland_programs (id, name, category, difficulty, age_group_min, age_group_max, description, session_count, avg_session_minutes)
  VALUES (p_shoot, 'Shooting Foundations', 'shooting', 'beginner', 10, 16,
    'Develop a quick, accurate release. Daily reps emphasizing weight transfer, snap, and follow-through.', 4, 25);
  session_names := ARRAY['Wrist Shot Mechanics','Snap Release','Catch & Shoot','One-Timer Setup'];
  FOR i IN 1..4 LOOP
    INSERT INTO public.dryland_sessions (id, program_id, week_number, day_number, name, duration_minutes, display_order)
    VALUES (gen_random_uuid(), p_shoot, ((i-1)/3)+1, ((i-1)%3)+1, session_names[i], 25, i) RETURNING id INTO s_id;
    FOR j IN 1..6 LOOP
      INSERT INTO public.dryland_exercises (session_id, display_order, name, sets, reps, rest_seconds, instruction_text, video_url)
      VALUES (s_id, j,
        (ARRAY['Form Shots','Weight Transfer','Snap Release','Quick Catch','Off-Foot Shot','Target Practice'])[j],
        4, 10, 30,
        'Load bottom hand, transfer weight to lead foot, punch through the puck, finish low.',
        v_sample_video);
    END LOOP;
  END LOOP;

  -- Strength & Explosiveness
  INSERT INTO public.dryland_programs (id, name, category, difficulty, age_group_min, age_group_max, description, session_count, avg_session_minutes)
  VALUES (p_strength, 'Explosive Athlete Base', 'strength_explosiveness', 'intermediate', 11, 17,
    'Build the engine. Bodyweight strength, jumps, and core work that translates directly to skating power.', 4, 30);
  session_names := ARRAY['Lower Body Power','Core & Stability','Upper Body Push/Pull','Full Body Explosive'];
  FOR i IN 1..4 LOOP
    INSERT INTO public.dryland_sessions (id, program_id, week_number, day_number, name, duration_minutes, display_order)
    VALUES (gen_random_uuid(), p_strength, ((i-1)/3)+1, ((i-1)%3)+1, session_names[i], 30, i) RETURNING id INTO s_id;
    FOR j IN 1..6 LOOP
      INSERT INTO public.dryland_exercises (session_id, display_order, name, sets, reps, duration_seconds, rest_seconds, instruction_text, video_url)
      VALUES (s_id, j,
        (ARRAY['Squat Jumps','Lunges','Plank Hold','Push-Ups','Lateral Bounds','Burpees'])[j],
        3, 12,
        CASE WHEN j = 3 THEN 45 ELSE NULL END,
        45,
        'Explode through the movement. Control the landing. Reset before the next rep.',
        v_sample_video);
    END LOOP;
  END LOOP;
END $$;
