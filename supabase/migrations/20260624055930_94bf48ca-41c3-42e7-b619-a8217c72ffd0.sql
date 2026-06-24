
CREATE OR REPLACE FUNCTION public.seed_dev_account(p_user_id uuid, p_tier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_id uuid;
  v_camp_id uuid;
  v_camp2_id uuid;
  v_team_id uuid;
  v_team2_id uuid;
  v_contact_id uuid;
  v_attendee_id uuid;
  v_event_id uuid;
  v_plan_id uuid;
  v_rink_id uuid;
  i int;
  j int;
BEGIN
  -- Clean prior dev data for this user (FK cascades handle children)
  DELETE FROM public.payouts WHERE owner_id = p_user_id;
  DELETE FROM public.ice_slots WHERE owner_id = p_user_id;
  DELETE FROM public.team_members WHERE owner_id = p_user_id;
  DELETE FROM public.camps WHERE owner_id = p_user_id;
  DELETE FROM public.teams WHERE coach_id = p_user_id;
  DELETE FROM public.attendees WHERE owner_id = p_user_id;
  DELETE FROM public.contacts WHERE owner_id = p_user_id;
  DELETE FROM public.rinks WHERE owner_id = p_user_id;

  -- Subscription
  INSERT INTO public.subscriptions (user_id, status, plan_name, current_period_end)
  VALUES (p_user_id, 'active',
    CASE p_tier
      WHEN 'parent' THEN 'Parent'
      WHEN 'association' THEN 'Association Coach'
      WHEN 'team' THEN 'Team Coach'
      WHEN 'elite' THEN 'Elite Coach'
      WHEN 'academy' THEN 'Academy'
      ELSE 'Parent'
    END,
    now() + interval '1 year')
  ON CONFLICT (user_id) DO UPDATE
    SET status = 'active', plan_name = EXCLUDED.plan_name,
        current_period_end = EXCLUDED.current_period_end;

  -- Role
  IF p_tier = 'parent' THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'user')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  IF p_tier = 'parent' THEN
    INSERT INTO public.contacts (owner_id, full_name, email)
    VALUES (p_user_id, 'Dev Parent', 'parent.dev@pxf.local')
    RETURNING id INTO v_contact_id;

    INSERT INTO public.attendees (owner_id, contact_id, full_name, birthday, position)
    VALUES (p_user_id, v_contact_id, 'Alex Dev', '2014-05-12', 'forward')
    RETURNING id INTO v_attendee_id;
    INSERT INTO public.attendees (owner_id, contact_id, full_name, birthday, position)
    VALUES (p_user_id, v_contact_id, 'Sam Dev', '2016-08-03', 'defense');

    INSERT INTO public.camps (owner_id, format, name, slug, status, start_date, end_date,
      price_cents, capacity, location_type, venue_name)
    VALUES (p_user_id, 'camp', 'Summer Skills Camp (Dev)',
      'dev-parent-camp-' || substr(p_user_id::text, 1, 8),
      'live', current_date + 7, current_date + 11, 24900, 30, 'venue', 'Dev Arena')
    RETURNING id INTO v_camp_id;

    INSERT INTO public.registrations (camp_id, contact_id, attendee_id, status, amount_cents)
    VALUES (v_camp_id, v_contact_id, v_attendee_id, 'paid', 24900);

    SELECT id INTO v_program_id FROM public.dryland_programs WHERE is_published = true LIMIT 1;
    IF v_program_id IS NULL THEN
      INSERT INTO public.dryland_programs (name, category, difficulty, description, session_count, avg_session_minutes)
      VALUES ('Dev Power Skating', 'stick_skills', 'beginner', 'Auto-seeded dev program', 12, 20)
      RETURNING id INTO v_program_id;
    END IF;
    INSERT INTO public.athlete_program_enrollments (athlete_id, program_id, enrolled_by, enrolled_by_role)
    VALUES (v_attendee_id, v_program_id, p_user_id, 'parent');

  ELSIF p_tier = 'association' THEN
    FOR i IN 1..3 LOOP
      INSERT INTO public.teams (coach_id, name, season, age_group, association_name)
      VALUES (p_user_id, 'Dev Association U' || (10 + i*2), '2026-27',
              'U' || (10 + i*2), 'Dev Hockey Association')
      RETURNING id INTO v_team_id;
      IF i = 1 THEN v_team2_id := v_team_id; END IF;

      FOR j IN 1..10 LOOP
        INSERT INTO public.team_players (team_id, display_name, jersey_number, position, added_by)
        VALUES (v_team_id, 'Player ' || j, j::text,
          CASE WHEN j <= 6 THEN 'forward' WHEN j <= 9 THEN 'defense' ELSE 'goalie' END,
          p_user_id);
      END LOOP;
    END LOOP;

    INSERT INTO public.team_events (team_id, event_type, title, event_date, start_time, end_time, venue, created_by)
    VALUES (v_team2_id, 'practice', 'Tuesday Skate', current_date + 2, '18:00', '19:30', 'Dev Arena', p_user_id);
    INSERT INTO public.team_events (team_id, event_type, opponent_name, home_away, event_date, start_time, end_time, venue, created_by)
    VALUES (v_team2_id, 'game', 'Dev Rivals', 'home', current_date + 5, '14:00', '15:30', 'Dev Arena', p_user_id);

  ELSIF p_tier = 'team' THEN
    FOR i IN 1..2 LOOP
      INSERT INTO public.teams (coach_id, name, season, age_group)
      VALUES (p_user_id, 'Dev Team ' || i, '2026-27', 'U14')
      RETURNING id INTO v_team_id;
      IF i = 1 THEN v_team2_id := v_team_id; END IF;

      FOR j IN 1..8 LOOP
        INSERT INTO public.team_players (team_id, display_name, jersey_number, added_by)
        VALUES (v_team_id, 'Player ' || j, j::text, p_user_id);
      END LOOP;
    END LOOP;

    INSERT INTO public.team_events (team_id, event_type, title, event_date, start_time, end_time, venue, created_by)
    VALUES (v_team2_id, 'practice', 'Skill Practice', current_date + 1, '17:00', '18:30', 'Dev Rink', p_user_id)
    RETURNING id INTO v_event_id;

    INSERT INTO public.practice_plans (team_id, event_id, coach_id, template_name)
    VALUES (v_team2_id, v_event_id, p_user_id, 'Tuesday Plan')
    RETURNING id INTO v_plan_id;

    INSERT INTO public.practice_plan_items (plan_id, item_type, note_text, duration_minutes, display_order)
    VALUES
      (v_plan_id, 'note', 'Warm-up: edges + crossovers', 10, 1),
      (v_plan_id, 'note', 'Stickhandling stations', 20, 2),
      (v_plan_id, 'note', 'Small area games', 30, 3),
      (v_plan_id, 'note', 'Cool down + stretch', 10, 4);

  ELSIF p_tier = 'elite' THEN
    INSERT INTO public.rinks (owner_id, name, address)
    VALUES (p_user_id, 'Dev Ice Center', '100 Dev Ave')
    RETURNING id INTO v_rink_id;

    FOR i IN 1..2 LOOP
      INSERT INTO public.camps (owner_id, format, name, slug, status, start_date, end_date,
        price_cents, capacity, location_type, venue_name)
      VALUES (p_user_id, 'camp', 'Elite Dev Camp ' || i,
        'dev-elite-camp-' || i || '-' || substr(p_user_id::text, 1, 6),
        'live', current_date + (i*7), current_date + (i*7) + 4, 39900, 40, 'venue', 'Dev Ice Center')
      RETURNING id INTO v_camp_id;
      IF i = 1 THEN v_camp2_id := v_camp_id; END IF;

      INSERT INTO public.camp_sessions (camp_id, session_date, start_time, end_time, sort_order)
      VALUES (v_camp_id, current_date + (i*7),     '09:00', '11:00', 0),
             (v_camp_id, current_date + (i*7) + 1, '09:00', '11:00', 1);

      INSERT INTO public.ice_slots (owner_id, rink_id, camp_id, slot_date, start_time, end_time)
      VALUES (p_user_id, v_rink_id, v_camp_id, current_date + (i*7), '09:00', '11:00');
    END LOOP;

    FOR j IN 1..8 LOOP
      INSERT INTO public.contacts (owner_id, full_name, email)
      VALUES (p_user_id, 'Parent ' || j, 'parent' || j || '.elite@dev.local')
      RETURNING id INTO v_contact_id;
      INSERT INTO public.attendees (owner_id, contact_id, full_name, position)
      VALUES (p_user_id, v_contact_id, 'Athlete ' || j,
              CASE WHEN j <= 5 THEN 'forward' WHEN j <= 7 THEN 'defense' ELSE 'goalie' END)
      RETURNING id INTO v_attendee_id;
      INSERT INTO public.registrations (camp_id, contact_id, attendee_id, status, amount_cents)
      VALUES (v_camp2_id, v_contact_id, v_attendee_id, 'paid', 39900);
    END LOOP;

    INSERT INTO public.payouts (owner_id, amount_cents, status, period_start, period_end, paid_at)
    VALUES (p_user_id, 250000, 'paid',    current_date - 30, current_date - 1, now() - interval '2 days'),
           (p_user_id, 180000, 'pending', current_date,      current_date + 14, NULL);

    INSERT INTO public.teams (coach_id, name, season)
    VALUES (p_user_id, 'Elite Demo Team', '2026-27')
    RETURNING id INTO v_team_id;
    INSERT INTO public.team_events (team_id, event_type, opponent_name, home_away, event_date, venue, created_by)
    VALUES (v_team_id, 'game', 'Demo Opponent', 'home', current_date - 1, 'Dev Ice Center', p_user_id)
    RETURNING id INTO v_event_id;
    INSERT INTO public.game_media (event_id, team_id, uploaded_by, media_type, label, url)
    VALUES
      (v_event_id, v_team_id, p_user_id, 'video', 'highlight', 'https://example.com/dev-highlight.mp4'),
      (v_event_id, v_team_id, p_user_id, 'video', 'period_1',  'https://example.com/dev-p1.mp4');

  ELSIF p_tier = 'academy' THEN
    INSERT INTO public.team_members (owner_id, title, status, email, permission_level)
    VALUES
      (p_user_id, 'Head Coach',      'active', 'coach1.academy@dev.local', 'coach'),
      (p_user_id, 'Assistant Coach', 'active', 'coach2.academy@dev.local', 'assistant'),
      (p_user_id, 'Team Manager',    'active', 'coach3.academy@dev.local', 'manager');

    FOR i IN 1..4 LOOP
      INSERT INTO public.teams (coach_id, name, season, age_group, association_name)
      VALUES (p_user_id, 'Academy Team ' || i, '2026-27',
              'U' || (10 + i*2), 'Dev Academy')
      RETURNING id INTO v_team_id;
      FOR j IN 1..12 LOOP
        INSERT INTO public.team_players (team_id, display_name, jersey_number, added_by)
        VALUES (v_team_id, 'Player ' || j, j::text, p_user_id);
      END LOOP;
    END LOOP;

    INSERT INTO public.camps (owner_id, format, name, slug, status, start_date, end_date,
      price_cents, capacity, location_type, venue_name)
    VALUES (p_user_id, 'camp', 'Academy Showcase',
      'dev-academy-camp-' || substr(p_user_id::text, 1, 8),
      'live', current_date + 14, current_date + 18, 49900, 60, 'venue', 'Academy Arena');

    INSERT INTO public.payouts (owner_id, amount_cents, status, period_start, period_end, paid_at)
    VALUES
      (p_user_id, 850000, 'paid',    current_date - 60, current_date - 31, now() - interval '20 days'),
      (p_user_id, 720000, 'paid',    current_date - 30, current_date - 1,  now() - interval '2 days'),
      (p_user_id, 410000, 'pending', current_date,      current_date + 14, NULL);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_dev_account(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_dev_account(uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.seed_dev_account(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.seed_dev_account(uuid, text) TO service_role;
