
DO $$ BEGIN CREATE TYPE public.team_event_type AS ENUM ('game','practice','team_event'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.team_home_away AS ENUM ('home','away','neutral'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.team_rsvp_response AS ENUM ('yes','no','maybe'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.team_attendance_status AS ENUM ('present','absent','late'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.team_invite_status AS ENUM ('pending','joined','resent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.practice_item_type AS ENUM ('session','drill','note'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  season text, division text, age_group text, association_name text,
  logo_url text, primary_color text, secondary_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages own teams" ON public.teams FOR ALL
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE TABLE public.team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES public.attendees(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  jersey_number text, position text,
  parent_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_players TO authenticated;
GRANT ALL ON public.team_players TO service_role;
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_team_coach(_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = _team_id AND coach_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.is_team_parent(_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_players tp
    WHERE tp.team_id = _team_id
      AND tp.parent_contact_id IN (SELECT public.current_user_contact_ids())
  );
$$;

CREATE POLICY "Parents view teams via player" ON public.teams FOR SELECT
  USING (public.is_team_parent(id));
CREATE POLICY "Coach manages roster" ON public.team_players FOR ALL
  USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));
CREATE POLICY "Parents view team roster" ON public.team_players FOR SELECT
  USING (public.is_team_parent(team_id));

CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  athlete_first_name text NOT NULL, athlete_last_name text NOT NULL,
  athlete_dob date, position text, jersey_number text,
  parent1_name text, parent1_email text, parent1_phone text,
  parent2_name text, parent2_email text,
  invite_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status public.team_invite_status NOT NULL DEFAULT 'pending',
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages invites" ON public.team_invites FOR ALL
  USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));

CREATE TABLE public.team_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type public.team_event_type NOT NULL,
  title text, opponent_name text, home_away public.team_home_away, venue text,
  event_date date NOT NULL, start_time time, end_time time, notes text,
  lineup_shared boolean NOT NULL DEFAULT false,
  rsvp_lock_minutes integer NOT NULL DEFAULT 120,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_events_team_date_idx ON public.team_events (team_id, event_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_events TO authenticated;
GRANT ALL ON public.team_events TO service_role;
ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages events" ON public.team_events FOR ALL
  USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));
CREATE POLICY "Parents view team events" ON public.team_events FOR SELECT
  USING (public.is_team_parent(team_id));

CREATE TABLE public.team_event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  team_player_id uuid NOT NULL REFERENCES public.team_players(id) ON DELETE CASCADE,
  parent_user_id uuid REFERENCES auth.users(id),
  response public.team_rsvp_response NOT NULL,
  note text,
  rsvp_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  responded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, team_player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_event_rsvps TO authenticated;
GRANT ALL ON public.team_event_rsvps TO service_role;
ALTER TABLE public.team_event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach reads rsvps" ON public.team_event_rsvps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.team_events e WHERE e.id = event_id AND public.is_team_coach(e.team_id)));
CREATE POLICY "Parents manage own rsvps" ON public.team_event_rsvps FOR ALL
  USING (EXISTS (SELECT 1 FROM public.team_players tp WHERE tp.id = team_player_id AND tp.parent_contact_id IN (SELECT public.current_user_contact_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_players tp WHERE tp.id = team_player_id AND tp.parent_contact_id IN (SELECT public.current_user_contact_ids())));

CREATE TABLE public.team_event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  team_player_id uuid NOT NULL REFERENCES public.team_players(id) ON DELETE CASCADE,
  status public.team_attendance_status NOT NULL,
  marked_by uuid REFERENCES auth.users(id),
  marked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, team_player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_event_attendance TO authenticated;
GRANT ALL ON public.team_event_attendance TO service_role;
ALTER TABLE public.team_event_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages attendance" ON public.team_event_attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM public.team_events e WHERE e.id = event_id AND public.is_team_coach(e.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_events e WHERE e.id = event_id AND public.is_team_coach(e.team_id)));
CREATE POLICY "Parent reads own athlete attendance" ON public.team_event_attendance FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.team_players tp WHERE tp.id = team_player_id AND tp.parent_contact_id IN (SELECT public.current_user_contact_ids())));

CREATE TABLE public.practice_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.team_events(id) ON DELETE CASCADE,
  template_name text,
  coach_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_plans TO authenticated;
GRANT ALL ON public.practice_plans TO service_role;
ALTER TABLE public.practice_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages plans" ON public.practice_plans FOR ALL
  USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));

CREATE TABLE public.practice_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.practice_plans(id) ON DELETE CASCADE,
  item_type public.practice_item_type NOT NULL,
  session_id uuid, drill_id uuid REFERENCES public.drills(id),
  note_text text, duration_minutes integer,
  display_order integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_plan_items TO authenticated;
GRANT ALL ON public.practice_plan_items TO service_role;
ALTER TABLE public.practice_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages plan items" ON public.practice_plan_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.practice_plans p WHERE p.id = plan_id AND public.is_team_coach(p.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.practice_plans p WHERE p.id = plan_id AND public.is_team_coach(p.team_id)));

CREATE TABLE public.team_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.team_events(id) ON DELETE CASCADE,
  template_name text,
  positions jsonb NOT NULL DEFAULT '{}'::jsonb,
  shared boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_lineups TO authenticated;
GRANT ALL ON public.team_lineups TO service_role;
ALTER TABLE public.team_lineups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages lineups" ON public.team_lineups FOR ALL
  USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));
CREATE POLICY "Parents view shared lineups" ON public.team_lineups FOR SELECT
  USING (shared = true AND public.is_team_parent(team_id));

CREATE TABLE public.team_duties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
  duty_type text NOT NULL,
  assigned_to_parent_id uuid REFERENCES auth.users(id),
  is_open_signup boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_duties TO authenticated;
GRANT ALL ON public.team_duties TO service_role;
ALTER TABLE public.team_duties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages duties" ON public.team_duties FOR ALL
  USING (EXISTS (SELECT 1 FROM public.team_events e WHERE e.id = event_id AND public.is_team_coach(e.team_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_events e WHERE e.id = event_id AND public.is_team_coach(e.team_id)));
CREATE POLICY "Parents view duties" ON public.team_duties FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.team_events e WHERE e.id = event_id AND public.is_team_parent(e.team_id)));
CREATE POLICY "Parent claims open duty" ON public.team_duties FOR UPDATE
  USING (is_open_signup = true AND EXISTS (SELECT 1 FROM public.team_events e WHERE e.id = event_id AND public.is_team_parent(e.team_id)))
  WITH CHECK (assigned_to_parent_id = auth.uid());

CREATE TABLE public.team_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_player_id uuid NOT NULL REFERENCES public.team_players(id) ON DELETE CASCADE,
  season text,
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  penalty_minutes integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_player_id, season)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_stats TO authenticated;
GRANT ALL ON public.team_stats TO service_role;
ALTER TABLE public.team_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages stats" ON public.team_stats FOR ALL
  USING (public.is_team_coach(team_id)) WITH CHECK (public.is_team_coach(team_id));
CREATE POLICY "Parent reads own athlete stats" ON public.team_stats FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.team_players tp WHERE tp.id = team_player_id AND tp.parent_contact_id IN (SELECT public.current_user_contact_ids())));

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER team_events_updated_at BEFORE UPDATE ON public.team_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER team_lineups_updated_at BEFORE UPDATE ON public.team_lineups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER team_stats_updated_at BEFORE UPDATE ON public.team_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_team_rsvp_by_token(_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'rsvp_id', r.id, 'response', r.response, 'note', r.note,
    'event', jsonb_build_object('id', e.id, 'event_type', e.event_type, 'title', e.title,
      'opponent_name', e.opponent_name, 'home_away', e.home_away, 'venue', e.venue,
      'event_date', e.event_date, 'start_time', e.start_time),
    'team_name', t.name, 'player_name', tp.display_name
  ) INTO result
  FROM public.team_event_rsvps r
  JOIN public.team_events e ON e.id = r.event_id
  JOIN public.teams t ON t.id = e.team_id
  JOIN public.team_players tp ON tp.id = r.team_player_id
  WHERE r.rsvp_token = _token;
  IF result IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_team_rsvp(_token uuid, _response text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row public.team_event_rsvps%ROWTYPE;
BEGIN
  IF _response NOT IN ('yes','no','maybe') THEN RAISE EXCEPTION 'invalid response'; END IF;
  UPDATE public.team_event_rsvps
  SET response = _response::public.team_rsvp_response, note = _note, responded_at = now()
  WHERE rsvp_token = _token RETURNING * INTO row;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid token'; END IF;
  RETURN jsonb_build_object('response', row.response, 'responded_at', row.responded_at);
END;
$$;
