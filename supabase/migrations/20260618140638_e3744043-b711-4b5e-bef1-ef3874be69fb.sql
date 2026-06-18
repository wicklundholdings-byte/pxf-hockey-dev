
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced', 'elite');
CREATE TYPE public.subscription_status_enum AS ENUM ('free', 'trialing', 'active', 'past_due', 'canceled');

-- ============= updated_at helper =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  subscription_status public.subscription_status_enum NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============= USER_ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============= has_role security definer =============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============= profile + default role trigger on signup =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- profile policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= DRILL CATEGORIES =============
CREATE TABLE public.drill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.drill_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.drill_categories TO authenticated;
GRANT ALL ON public.drill_categories TO service_role;
ALTER TABLE public.drill_categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_drill_categories_updated_at BEFORE UPDATE ON public.drill_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public read active categories" ON public.drill_categories FOR SELECT
  TO anon, authenticated USING (is_active = TRUE OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage categories" ON public.drill_categories FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= DRILLS =============
CREATE TABLE public.drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.drill_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  coaching_points TEXT,
  equipment_needed TEXT,
  difficulty_level public.difficulty_level,
  age_group TEXT,
  skill_focus TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.drills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.drills TO authenticated;
GRANT ALL ON public.drills TO service_role;
ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_drills_updated_at BEFORE UPDATE ON public.drills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_drills_category ON public.drills(category_id);
CREATE INDEX idx_drills_published ON public.drills(is_published);

CREATE POLICY "Public read published drills" ON public.drills FOR SELECT
  TO anon, authenticated USING (is_published = TRUE OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage drills" ON public.drills FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= TRAINING PROGRAMS =============
CREATE TABLE public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  level public.difficulty_level,
  age_group TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.training_programs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.training_programs TO authenticated;
GRANT ALL ON public.training_programs TO service_role;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_training_programs_updated_at BEFORE UPDATE ON public.training_programs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public read published programs" ON public.training_programs FOR SELECT
  TO anon, authenticated USING (is_published = TRUE OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage programs" ON public.training_programs FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= PROGRAM_DRILLS =============
CREATE TABLE public.program_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  drill_id UUID NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.program_drills TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.program_drills TO authenticated;
GRANT ALL ON public.program_drills TO service_role;
ALTER TABLE public.program_drills ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_program_drills_program ON public.program_drills(program_id);

CREATE POLICY "Public read program drills" ON public.program_drills FOR SELECT
  TO anon, authenticated USING (TRUE);
CREATE POLICY "Admins manage program drills" ON public.program_drills FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= USER_FAVORITES =============
CREATE TABLE public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_id UUID NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, drill_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT ALL ON public.user_favorites TO service_role;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites" ON public.user_favorites FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============= SUBSCRIPTIONS =============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status public.subscription_status_enum NOT NULL DEFAULT 'free',
  plan_name TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
