CREATE OR REPLACE FUNCTION public.seed_dev_account(p_user_id uuid, p_tier text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_program_id uuid;
  v_camp_id uuid;
  v_camp2_id uuid;
  v_team_id uuid;
  v_team2_id uuid;
  v_contact_id uuid;
  v_attendee_id uuid;
  v_event_id uuid;
  v_past_game_id uuid;
  v_plan_id uuid;
  v_rink_id uuid;
  v_coach_id uuid;
  v_player_id uuid;
  v_tp_id uuid;
  v_player_video_ids uuid[];
  v_goalie_video_ids uuid[];
  v_player_video_count int;
  v_goalie_video_count int;
  v_vid uuid;
  v_vid_secs int;
  v_pos text;
  v_dryland_pos dryland_position;
  v_session_count int;
  v_max_sessions int;
  v_day_offset int;
  i int;
  j int;
  k int;
  names text[] := ARRAY['Mason Carter','Liam Brooks','Noah Reilly','Ethan Walsh','Lucas Tremblay',
                        'Owen Mercer','Caleb Ross','Jaxon Hayes','Riley Tanaka','Connor Park',
                        'Hayden Cole','Eli Sanchez','Brody Nguyen','Logan Pearce'];
  session_counts int[] := ARRAY[18, 15, 14, 12, 11, 10, 9, 8, 7, 6, 5, 4, 2, 16];
BEGIN
  DELETE FROM public.payouts WHERE owner_id = p_user_id;
  DELETE FROM public.ice_slots WHERE owner_id = p_user_id;
  DELETE FROM public.team_members WHERE owner_id = p_user_id;
  DELETE FROM public.camps WHERE owner_id = p_user_id;
  DELETE FROM public.teams WHERE coach_id = p_user_id;
  DELETE FROM public.attendees WHERE owner_id = p_user_id;
  DELETE FROM public.contacts WHERE owner_id = p_user_id;
  DELETE FROM public.rinks WHERE owner_id = p_user_id;

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

  IF p_tier = 'parent' THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'user') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  SELECT COALESCE(array_agg(id ORDER BY created_at), ARRAY[]::uuid[])
    INTO v_player_video_ids
    FROM public.dryland_videos WHERE position = 'player' AND is_published = true;
  SELECT COALESCE(array_agg(id ORDER BY created_at), ARRAY[]::uuid[])
    INTO v_goalie_video_ids
    FROM public.dryland_videos WHERE position = 'goalie' AND is_published = true;
  v_player_video_count := COALESCE(array_length(v_player_video_ids, 1), 0);
  v_goalie_video_count := COALESCE(array_length(v_goalie_video_ids, 1), 0);

  IF p_tier = 'parent' THEN
    INSERT INTO public.contacts (owner_id, full_name, email)
    VALUES (p_user_id, 'Dev Parent', 'parent.dev@pxf.local')
    RETURNING id INTO v_contact_id;

    INSERT INTO public.attendees (owner_id, contact_id, full_name, birthday, position, preferred_position, jersey_number)
    VALUES (p_user_id, v_contact_id, 'Alex Dev', '2014-05-12', 'forward', 'player', '17')
    RETURNING id INTO v_attendee_id;

    SELECT u.id INTO v_coach_id FROM auth.users u WHERE lower(u.email) = 'team.dev@pxf.local' LIMIT 1;
    IF v_coach_id IS NOT NULL THEN
      SELECT id INTO v_team_id FROM public.teams
        WHERE coach_id = v_coach_id AND name = 'Lightning U14' LIMIT 1;
      IF v_team_id IS NOT NULL THEN
        INSERT INTO public.team_players (team_id, athlete_id, display_name, jersey_number, position, parent_contact_id, added_by)
        VALUES (v_team_id, v_attendee_id, 'Alex Dev', '17', 'forward', v_contact_id, v_coach_id);

        v_max_sessions := LEAST(v_player_video_count, 8);
        FOR k IN 1..v_max_sessions LOOP
          v_vid := v_player_video_ids[k];
          SELECT total_seconds INTO v_vid_secs FROM public.dryland_videos WHERE id = v_vid;
          INSERT INTO public.dryland_watch_progress (athlete_id, video_id, watched_seconds, last_watched_at, team_id)
          VALUES (v_attendee_id, v_vid, GREATEST((v_vid_secs * 0.95)::int, 60),
                  now() - ((k * 4) || ' days')::interval, v_team_id)
          ON CONFLICT (athlete_id, video_id) DO UPDATE
            SET watched_seconds = EXCLUDED.watched_seconds,
                last_watched_at = EXCLUDED.last_watched_at,
                team_id = EXCLUDED.team_id;
        END LOOP;
      END IF;
    END IF;

    INSERT INTO public.attendees (owner_id, contact_id, full_name, birthday, position, preferred_position, jersey_number)
    VALUES (p_user_id, v_contact_id, 'Sam Dev', '2016-08-03', 'goalie', 'goalie', '31')
    RETURNING id INTO v_attendee_id;

    IF v_team_id IS NOT NULL THEN
      INSERT INTO public.team_players (team_id, athlete_id, display_name, jersey_number, position, parent_contact_id, added_by)
      VALUES (v_team_id, v_attendee_id, 'Sam Dev', '31', 'goalie', v_contact_id, v_coach_id);

      v_max_sessions := LEAST(v_goalie_video_count, 5);
      FOR k IN 1..v_max_sessions LOOP
        v_vid := v_goalie_video_ids[k];
        SELECT total_seconds INTO v_vid_secs FROM public.dryland_videos WHERE id = v_vid;
        INSERT INTO public.dryland_watch_progress (athlete_id, video_id, watched_seconds, last_watched_at, team_id)
        VALUES (v_attendee_id, v_vid, GREATEST((v_vid_secs * 0.95)::int, 60),
                now() - ((k * 5) || ' days')::interval, v_team_id)
        ON CONFLICT (athlete_id, video_id) DO UPDATE
          SET watched_seconds = EXCLUDED.watched_seconds,
              last_watched_at = EXCLUDED.last_watched_at,
              team_id = EXCLUDED.team_id;
      END LOOP;
    END IF;

    INSERT INTO public.camps (owner_id, format, name, slug, status, start_date, end_date,
      price_cents, capacity, location_type, venue_name)
    VALUES (p_user_id, 'camp', 'Summer Skills Camp (Dev)',
      'dev-parent-camp-' || substr(p_user_id::text, 1, 8),
      'live', current_date + 7, current_date + 11, 24900, 30, 'venue', 'Dev Arena')
    RETURNING id INTO v_camp_id;
    INSERT INTO public.registrations (camp_id, contact_id, attendee_id, status, amount_cents)
    VALUES (v_camp_id, v_contact_id, v_attendee_id, 'paid', 24900);

    SELECT id INTO v_program_id FROM public.dryland_programs WHERE is_published = true LIMIT 1;
    IF v_program_id IS NOT NULL THEN
      INSERT INTO public.athlete_program_enrollments (athlete_id, program_id, enrolled_by, enrolled_by_role)
      VALUES (v_attendee_id, v_program_id, p_user_id, 'parent');
    END IF;

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
    INSERT INTO public.teams (coach_id, name, season, age_group)
    VALUES (p_user_id, 'Lightning U14', '2026-27', 'U14')
    RETURNING id INTO v_team_id;
    v_team2_id := v_team_id;

    FOR i IN 1..14 LOOP
      IF i <= 8 THEN v_pos := 'forward'; v_dryland_pos := 'player';
      ELSIF i <= 12 THEN v_pos := 'defense'; v_dryland_pos := 'player';
      ELSE v_pos := 'goalie'; v_dryland_pos := 'goalie';
      END IF;

      INSERT INTO public.attendees (owner_id, full_name, position, preferred_position, jersey_number, birthday)
      VALUES (p_user_id, names[i], v_pos, v_dryland_pos, i::text, '2011-01-01'::date + ((i*23) || ' days')::interval)
      RETURNING id INTO v_player_id;

      INSERT INTO public.team_players (team_id, athlete_id, display_name, jersey_number, position, added_by)
      VALUES (v_team_id, v_player_id, names[i], i::text, v_pos, p_user_id)
      RETURNING id INTO v_tp_id;

      INSERT INTO public.team_stats (team_id, team_player_id, season, goals, assists, penalty_minutes, games_played)
      VALUES (v_team_id, v_tp_id, '2026-27',
        CASE WHEN v_pos = 'goalie' THEN 0 ELSE (i * 2) % 11 END,
        CASE WHEN v_pos = 'goalie' THEN 0 ELSE (i * 3) % 14 END,
        (i % 6) * 2, 12);

      v_session_count := session_counts[i];
      IF v_dryland_pos = 'goalie' THEN
        v_max_sessions := LEAST(v_session_count, v_goalie_video_count);
      ELSE
        v_max_sessions := LEAST(v_session_count, v_player_video_count);
      END IF;

      FOR j IN 1..v_max_sessions LOOP
        IF v_dryland_pos = 'goalie' THEN
          v_vid := v_goalie_video_ids[j];
        ELSE
          v_vid := v_player_video_ids[j];
        END IF;
        SELECT total_seconds INTO v_vid_secs FROM public.dryland_videos WHERE id = v_vid;
        v_day_offset := (j - 1) * 5 + ((i + j) % 3);
        INSERT INTO public.dryland_watch_progress (athlete_id, video_id, watched_seconds, last_watched_at, team_id)
        VALUES (v_player_id, v_vid,
                GREATEST((v_vid_secs * 0.95)::int, 60),
                now() - (v_day_offset || ' days')::interval - ((j * 17) || ' minutes')::interval,
                v_team_id)
        ON CONFLICT (athlete_id, video_id) DO UPDATE
          SET watched_seconds = EXCLUDED.watched_seconds,
              last_watched_at = EXCLUDED.last_watched_at,
              team_id = EXCLUDED.team_id;
      END LOOP;

      IF v_session_count >= 8 THEN
        INSERT INTO public.dryland_streaks (athlete_id, current_streak_weeks, longest_streak_weeks, last_active_week)
        VALUES (v_player_id,
                LEAST(GREATEST(v_session_count / 3, 1), 6),
                LEAST(GREATEST(v_session_count / 2, 2), 8),
                date_trunc('week', now())::date)
        ON CONFLICT (athlete_id) DO UPDATE
          SET current_streak_weeks = EXCLUDED.current_streak_weeks,
              longest_streak_weeks = GREATEST(public.dryland_streaks.longest_streak_weeks, EXCLUDED.longest_streak_weeks),
              last_active_week = EXCLUDED.last_active_week,
              updated_at = now();
      END IF;
    END LOOP;

    INSERT INTO public.team_events (team_id, event_type, opponent_name, home_away, event_date, start_time, end_time, venue, created_by, notes)
    VALUES (v_team_id, 'game', 'Riverside Wolves', 'home', current_date - 1, '14:00', '15:30',
            'Dev Arena · Rink A', p_user_id, 'Final: 4-2 W. Strong PK in the 3rd.')
    RETURNING id INTO v_past_game_id;

    INSERT INTO public.team_events (team_id, event_type, title, event_date, start_time, end_time, venue, created_by)
    VALUES (v_team_id, 'practice', 'Skill Practice', current_date + 1, '17:00', '18:30', 'Dev Arena · Rink B', p_user_id)
    RETURNING id INTO v_event_id;

    INSERT INTO public.team_events (team_id, event_type, opponent_name, home_away, event_date, start_time, end_time, venue, created_by)
    VALUES (v_team_id, 'game', 'Northside Bears', 'away', current_date + 4, '13:30', '15:00', 'Northside Ice Plex', p_user_id);
    INSERT INTO public.team_events (team_id, event_type, opponent_name, home_away, event_date, start_time, end_time, venue, created_by)
    VALUES (v_team_id, 'game', 'Eastside Hawks', 'home', current_date + 11, '15:00', '16:30', 'Dev Arena · Rink A', p_user_id);
    INSERT INTO public.team_events (team_id, event_type, title, event_date, start_time, end_time, venue, created_by)
    VALUES (v_team_id, 'practice', 'Systems & Video', current_date + 6, '17:30', '19:00', 'Dev Arena · Rink B', p_user_id);

    INSERT INTO public.practice_plans (team_id, event_id, coach_id, template_name)
    VALUES (v_team_id, v_event_id, p_user_id, 'Tuesday Plan')
    RETURNING id INTO v_plan_id;
    INSERT INTO public.practice_plan_items (plan_id, item_type, note_text, duration_minutes, display_order)
    VALUES
      (v_plan_id, 'note', 'Warm-up: edges + crossovers', 10, 1),
      (v_plan_id, 'note', 'Stickhandling stations', 20, 2),
      (v_plan_id, 'note', 'Small area games', 30, 3),
      (v_plan_id, 'note', 'Cool down + stretch', 10, 4);

    INSERT INTO public.game_plans (team_id, event_id, opponent_notes, our_gameplan, created_by)
    VALUES (v_team_id, v_past_game_id,
            'Wolves trap through the neutral zone. Strong on dump-ins.',
            'Quick puck movement, support breakouts wide, attack net front on rebounds.',
            p_user_id);

    INSERT INTO public.game_lineups (team_id, event_id, template_name, positions, is_shared, created_by)
    VALUES (v_team_id, v_past_game_id, 'Wolves Game Lines',
            '{"L1":["Mason Carter","Liam Brooks","Noah Reilly"],"L2":["Ethan Walsh","Lucas Tremblay","Owen Mercer"],"D1":["Riley Tanaka","Connor Park"],"D2":["Hayden Cole","Eli Sanchez"],"G":["Logan Pearce"]}'::jsonb,
            true, p_user_id);

    INSERT INTO public.game_media (event_id, team_id, uploaded_by, media_type, label, url, thumbnail_url, duration_seconds, caption)
    VALUES
      (v_past_game_id, v_team_id, p_user_id, 'video', 'highlight',
       'https://example.com/dev-highlight.mp4',
       'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600',
       42, 'Mason Carter snipes top corner — 2-1 lead'),
      (v_past_game_id, v_team_id, p_user_id, 'video', 'period_3',
       'https://example.com/dev-p3.mp4',
       'https://images.unsplash.com/photo-1515703407324-5f51c2ed7cf3?w=600',
       1080, 'Full third period');

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
      INSERT INTO public.attendees (owner_id, contact_id, full_name, position, preferred_position)
      VALUES (p_user_id, v_contact_id, 'Athlete ' || j,
              CASE WHEN j <= 5 THEN 'forward' WHEN j <= 7 THEN 'defense' ELSE 'goalie' END,
              CASE WHEN j <= 7 THEN 'player'::dryland_position ELSE 'goalie'::dryland_position END)
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
$function$;