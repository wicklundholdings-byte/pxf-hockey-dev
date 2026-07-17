-- ============================================================
-- PXF Hockey — Migration 002: Row Level Security Policies
-- Project: pxf-hockey-prod
-- Run this AFTER 001_schema.sql
-- ============================================================

-- Helper function: check if current user is a coach of a team
CREATE OR REPLACE FUNCTION public.is_team_coach(p_team_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id AND coach_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if current user is staff on a team
CREATE OR REPLACE FUNCTION public.is_team_staff(p_team_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_staff
    WHERE team_id = p_team_id AND user_id = auth.uid() AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if current user is camp owner
CREATE OR REPLACE FUNCTION public.is_camp_coach(p_camp_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.camps
    WHERE id = p_camp_id AND coach_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if parent has confirmed registration for a camp
CREATE OR REPLACE FUNCTION public.is_camp_parent(p_camp_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.camp_registrations
    WHERE camp_id = p_camp_id
      AND parent_user_id = auth.uid()
      AND status = 'confirmed'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if current user is a coach (any tier)
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'coach'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Coaches can view parent profiles they have a relationship with"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.parent_user_id = profiles.id
        AND a.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.camp_registrations cr
      JOIN public.camps c ON c.id = cr.camp_id
      WHERE cr.parent_user_id = profiles.id
        AND c.coach_id = auth.uid()
    )
  );

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE POLICY "Owners can manage their organization"
  ON public.organizations FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Staff can view their organization"
  ON public.organizations FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_staff ts
      JOIN public.teams t ON t.id = ts.team_id
      WHERE ts.user_id = auth.uid()
        AND t.organization_id = organizations.id
        AND ts.accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- LOCATIONS
-- ============================================================
CREATE POLICY "Coaches manage their own locations"
  ON public.locations FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Staff can view locations"
  ON public.locations FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_staff ts
      JOIN public.teams t ON t.id = ts.team_id
      WHERE ts.user_id = auth.uid()
        AND t.coach_id = locations.coach_id
        AND ts.accepted_at IS NOT NULL
    )
  );

-- ============================================================
-- TEAMS
-- ============================================================
CREATE POLICY "Coaches manage their own teams"
  ON public.teams FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Staff can view teams they are assigned to"
  ON public.teams FOR SELECT
  USING (
    coach_id = auth.uid()
    OR is_team_staff(id)
  );

CREATE POLICY "Parents can view teams their athlete is on"
  ON public.teams FOR SELECT
  USING (
    coach_id = auth.uid()
    OR is_team_staff(id)
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.athletes a ON a.id = tm.athlete_id
      WHERE tm.team_id = teams.id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- ATHLETES
-- ============================================================
CREATE POLICY "Coaches can manage athletes they created"
  ON public.athletes FOR ALL
  USING (created_by = auth.uid());

CREATE POLICY "Parents can view and update their own athletes"
  ON public.athletes FOR SELECT
  USING (
    created_by = auth.uid()
    OR parent_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.athlete_id = athletes.id
        AND is_team_coach(tm.team_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.athlete_id = athletes.id
        AND is_team_staff(tm.team_id)
    )
  );

CREATE POLICY "Parents can update their linked athletes"
  ON public.athletes FOR UPDATE
  USING (parent_user_id = auth.uid());

-- ============================================================
-- AUTHORIZED CAREGIVERS
-- ============================================================
CREATE POLICY "Parents manage caregivers for their athletes"
  ON public.authorized_caregivers FOR ALL
  USING (parent_user_id = auth.uid());

CREATE POLICY "Coaches can view caregivers for their camp athletes"
  ON public.authorized_caregivers FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = authorized_caregivers.athlete_id
        AND a.created_by = auth.uid()
    )
  );

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
CREATE POLICY "Coaches manage their team roster"
  ON public.team_members FOR ALL
  USING (is_team_coach(team_id));

CREATE POLICY "Staff can view roster"
  ON public.team_members FOR SELECT
  USING (
    is_team_coach(team_id)
    OR is_team_staff(team_id)
  );

CREATE POLICY "Parents can view roster of their athlete's team"
  ON public.team_members FOR SELECT
  USING (
    is_team_coach(team_id)
    OR is_team_staff(team_id)
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = team_members.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- TEAM STAFF
-- ============================================================
CREATE POLICY "Coaches manage their team staff"
  ON public.team_staff FOR ALL
  USING (is_team_coach(team_id));

CREATE POLICY "Staff can view their own record"
  ON public.team_staff FOR SELECT
  USING (
    is_team_coach(team_id)
    OR user_id = auth.uid()
  );

-- ============================================================
-- ATHLETE STATS
-- ============================================================
CREATE POLICY "Coaches manage stats for their teams"
  ON public.athlete_stats FOR ALL
  USING (is_team_coach(team_id));

CREATE POLICY "Parents can view their athlete's stats"
  ON public.athlete_stats FOR SELECT
  USING (
    is_team_coach(team_id)
    OR is_team_staff(team_id)
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_stats.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- SKILL PROGRESSION LEVELS
-- ============================================================
CREATE POLICY "Coaches manage their skill levels"
  ON public.skill_progression_levels FOR ALL
  USING (coach_id = auth.uid());

-- ============================================================
-- ATHLETE PROGRESS LEVELS
-- ============================================================
CREATE POLICY "Coaches manage athlete progress levels"
  ON public.athlete_progress_levels FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Parents can view their athlete's progress"
  ON public.athlete_progress_levels FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_progress_levels.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- ATHLETE EVALUATIONS
-- ============================================================
CREATE POLICY "Coaches manage evaluations they created"
  ON public.athlete_evaluations FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Parents can view shared evaluations for their athletes"
  ON public.athlete_evaluations FOR SELECT
  USING (
    coach_id = auth.uid()
    OR (
      share_with_parent = true
      AND EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id = athlete_evaluations.athlete_id
          AND a.parent_user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- ATHLETE SKILL RATINGS
-- ============================================================
CREATE POLICY "Coaches manage skill ratings they created"
  ON public.athlete_skill_ratings FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Parents can view skill ratings for their athletes"
  ON public.athlete_skill_ratings FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_skill_ratings.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- ATHLETE SESSION NOTES
-- ============================================================
CREATE POLICY "Coaches manage session notes they created"
  ON public.athlete_session_notes FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Parents can view shared session notes"
  ON public.athlete_session_notes FOR SELECT
  USING (
    coach_id = auth.uid()
    OR (
      share_with_parent = true
      AND EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id = athlete_session_notes.athlete_id
          AND a.parent_user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE POLICY "Coaches manage their own sessions"
  ON public.sessions FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Staff can view sessions for their teams"
  ON public.sessions FOR SELECT
  USING (
    coach_id = auth.uid()
    OR (team_id IS NOT NULL AND is_team_staff(team_id))
  );

-- ============================================================
-- DRILL CATEGORIES + DRILLS
-- ============================================================
CREATE POLICY "Coaches manage their drill categories"
  ON public.drill_categories FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches manage their drills"
  ON public.drills FOR ALL
  USING (coach_id = auth.uid());

-- ============================================================
-- SESSION DRILLS
-- ============================================================
CREATE POLICY "Coaches manage session drills"
  ON public.session_drills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_drills.session_id
        AND s.coach_id = auth.uid()
    )
  );

-- ============================================================
-- TRAINING PROGRAMS
-- ============================================================
CREATE POLICY "Coaches manage their training programs"
  ON public.training_programs FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Parents can view public training programs"
  ON public.training_programs FOR SELECT
  USING (is_public = true OR coach_id = auth.uid());

-- ============================================================
-- PROGRAM DRILLS
-- ============================================================
CREATE POLICY "Coaches manage program drills"
  ON public.program_drills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.training_programs tp
      WHERE tp.id = program_drills.program_id
        AND tp.coach_id = auth.uid()
    )
  );

-- ============================================================
-- ATHLETE PROGRAM ENROLLMENTS
-- ============================================================
CREATE POLICY "Parents manage enrollments for their athletes"
  ON public.athlete_program_enrollments FOR ALL
  USING (enrolled_by = auth.uid());

CREATE POLICY "Coaches can view enrollments for programs they created"
  ON public.athlete_program_enrollments FOR SELECT
  USING (
    enrolled_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.training_programs tp
      WHERE tp.id = athlete_program_enrollments.training_program_id
        AND tp.coach_id = auth.uid()
    )
  );

-- ============================================================
-- FAVORITE FOLDERS + PLAYS
-- ============================================================
CREATE POLICY "Coaches manage their favorite folders"
  ON public.favorite_folders FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches manage their plays"
  ON public.plays FOR ALL
  USING (coach_id = auth.uid());

-- ============================================================
-- TEAM EVENTS
-- ============================================================
CREATE POLICY "Coaches manage team events"
  ON public.team_events FOR ALL
  USING (is_team_coach(team_id));

CREATE POLICY "Staff can view and manage events for their teams"
  ON public.team_events FOR SELECT
  USING (
    is_team_coach(team_id)
    OR is_team_staff(team_id)
  );

CREATE POLICY "Parents can view events for their athlete's teams"
  ON public.team_events FOR SELECT
  USING (
    is_team_coach(team_id)
    OR is_team_staff(team_id)
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.athletes a ON a.id = tm.athlete_id
      WHERE tm.team_id = team_events.team_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- EVENT RSVPs
-- ============================================================
CREATE POLICY "Parents manage RSVPs for their athletes"
  ON public.event_rsvps FOR ALL
  USING (parent_user_id = auth.uid());

CREATE POLICY "Coaches and staff can view RSVPs"
  ON public.event_rsvps FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR is_team_coach((SELECT team_id FROM public.team_events WHERE id = event_rsvps.team_event_id))
    OR is_team_staff((SELECT team_id FROM public.team_events WHERE id = event_rsvps.team_event_id))
  );

-- ============================================================
-- ATTENDANCE RECORDS
-- ============================================================
CREATE POLICY "Coaches and staff manage attendance"
  ON public.attendance_records FOR ALL
  USING (
    marked_by = auth.uid()
    OR (team_event_id IS NOT NULL AND is_team_coach((SELECT team_id FROM public.team_events WHERE id = attendance_records.team_event_id)))
    OR (camp_id IS NOT NULL AND is_camp_coach(camp_id))
  );

CREATE POLICY "Parents can view their athlete's attendance"
  ON public.attendance_records FOR SELECT
  USING (
    marked_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = attendance_records.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- EVENT DUTIES
-- ============================================================
CREATE POLICY "Coaches manage event duties"
  ON public.event_duties FOR ALL
  USING (
    is_team_coach((SELECT team_id FROM public.team_events WHERE id = event_duties.team_event_id))
  );

CREATE POLICY "Parents can view and sign up for duties"
  ON public.event_duties FOR SELECT
  USING (
    open_for_signup = true
    OR assigned_to = auth.uid()
    OR is_team_coach((SELECT team_id FROM public.team_events WHERE id = event_duties.team_event_id))
  );

CREATE POLICY "Parents can assign themselves to open duties"
  ON public.event_duties FOR UPDATE
  USING (open_for_signup = true AND (assigned_to IS NULL OR assigned_to = auth.uid()));

-- ============================================================
-- GAME LINEUPS + GAME PLANS
-- ============================================================
CREATE POLICY "Coaches manage game lineups"
  ON public.game_lineups FOR ALL
  USING (
    is_team_coach((SELECT team_id FROM public.team_events WHERE id = game_lineups.team_event_id))
  );

CREATE POLICY "Staff can view lineups"
  ON public.game_lineups FOR SELECT
  USING (
    is_team_coach((SELECT team_id FROM public.team_events WHERE id = game_lineups.team_event_id))
    OR is_team_staff((SELECT team_id FROM public.team_events WHERE id = game_lineups.team_event_id))
  );

CREATE POLICY "Coaches manage game plans"
  ON public.game_plans FOR ALL
  USING (
    is_team_coach((SELECT team_id FROM public.team_events WHERE id = game_plans.team_event_id))
  );

CREATE POLICY "Staff can view game plans"
  ON public.game_plans FOR SELECT
  USING (
    is_team_coach((SELECT team_id FROM public.team_events WHERE id = game_plans.team_event_id))
    OR is_team_staff((SELECT team_id FROM public.team_events WHERE id = game_plans.team_event_id))
  );

-- ============================================================
-- ICE TIMES
-- ============================================================
CREATE POLICY "Coaches manage their ice times"
  ON public.ice_times FOR ALL
  USING (coach_id = auth.uid());

-- ============================================================
-- CAMPS
-- ============================================================
CREATE POLICY "Coaches manage their own camps"
  ON public.camps FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Everyone can view published camps"
  ON public.camps FOR SELECT
  USING (status = 'published' OR coach_id = auth.uid());

-- ============================================================
-- CAMP FORM FIELDS
-- ============================================================
CREATE POLICY "Coaches manage their camp form fields"
  ON public.camp_form_fields FOR ALL
  USING (is_camp_coach(camp_id));

CREATE POLICY "Anyone registering can view form fields"
  ON public.camp_form_fields FOR SELECT
  USING (true);

-- ============================================================
-- CAMP SESSIONS
-- ============================================================
CREATE POLICY "Coaches manage camp sessions"
  ON public.camp_sessions FOR ALL
  USING (is_camp_coach(camp_id));

CREATE POLICY "Parents with registration can view camp sessions"
  ON public.camp_sessions FOR SELECT
  USING (
    is_camp_coach(camp_id)
    OR is_camp_parent(camp_id)
  );

-- ============================================================
-- DISCOUNT CODES
-- ============================================================
CREATE POLICY "Coaches manage their discount codes"
  ON public.discount_codes FOR ALL
  USING (coach_id = auth.uid());

-- ============================================================
-- CAMP REGISTRATIONS
-- ============================================================
CREATE POLICY "Parents can manage their own registrations"
  ON public.camp_registrations FOR ALL
  USING (parent_user_id = auth.uid());

CREATE POLICY "Coaches can view registrations for their camps"
  ON public.camp_registrations FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR is_camp_coach(camp_id)
  );

CREATE POLICY "Coaches can update registration status"
  ON public.camp_registrations FOR UPDATE
  USING (is_camp_coach(camp_id));

-- ============================================================
-- CAMP REGISTRATION RESPONSES
-- ============================================================
CREATE POLICY "Parents can view their own registration responses"
  ON public.camp_registration_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.camp_registrations cr
      WHERE cr.id = camp_registration_responses.camp_registration_id
        AND cr.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view all responses for their camps"
  ON public.camp_registration_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.camp_registrations cr
      JOIN public.camps c ON c.id = cr.camp_id
      WHERE cr.id = camp_registration_responses.camp_registration_id
        AND c.coach_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert their own responses"
  ON public.camp_registration_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.camp_registrations cr
      WHERE cr.id = camp_registration_responses.camp_registration_id
        AND cr.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- CAMP WAIVERS
-- ============================================================
CREATE POLICY "Parents can view their own signed waivers"
  ON public.camp_waivers FOR SELECT
  USING (signed_by_user_id = auth.uid());

CREATE POLICY "Coaches can view waivers for their camps"
  ON public.camp_waivers FOR SELECT
  USING (
    signed_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.camp_registrations cr
      JOIN public.camps c ON c.id = cr.camp_id
      WHERE cr.id = camp_waivers.camp_registration_id
        AND c.coach_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert waivers for their registrations"
  ON public.camp_waivers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.camp_registrations cr
      WHERE cr.id = camp_waivers.camp_registration_id
        AND cr.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- ATHLETE HEALTH FORMS
-- CRITICAL: Parents CANNOT read other athletes' medical data.
-- Only coach, manager, or owner roles can read.
-- ============================================================
CREATE POLICY "Coaches and staff with manager+ role can read health forms"
  ON public.athlete_health_forms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.camp_registrations cr
      JOIN public.camps c ON c.id = cr.camp_id
      WHERE cr.id = athlete_health_forms.camp_registration_id
        AND c.coach_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_staff ts
      JOIN public.team_members tm ON tm.team_id = ts.team_id
      WHERE ts.user_id = auth.uid()
        AND ts.permission_level IN ('owner', 'manager')
        AND tm.athlete_id = athlete_health_forms.athlete_id
        AND ts.accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Parents can insert health forms for their athletes"
  ON public.athlete_health_forms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_health_forms.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update their athlete's health form"
  ON public.athlete_health_forms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_health_forms.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- CHECK INS
-- ============================================================
CREATE POLICY "Coaches and staff manage check-ins"
  ON public.check_ins FOR ALL
  USING (
    scanned_by = auth.uid()
    OR is_camp_coach((SELECT camp_id FROM public.camp_registrations WHERE id = check_ins.camp_registration_id))
  );

-- ============================================================
-- PAYMENT INSTALLMENTS
-- ============================================================
CREATE POLICY "Parents can view their payment installments"
  ON public.payment_installments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.camp_registrations cr
      WHERE cr.id = payment_installments.camp_registration_id
        AND cr.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view installments for their camps"
  ON public.payment_installments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.camp_registrations cr
      JOIN public.camps c ON c.id = cr.camp_id
      WHERE cr.id = payment_installments.camp_registration_id
        AND c.coach_id = auth.uid()
    )
  );

-- ============================================================
-- CAMP DAY POSTS
-- Only visible to registered confirmed parents + coach/staff
-- ============================================================
CREATE POLICY "Coaches and staff can manage camp day posts"
  ON public.camp_day_posts FOR ALL
  USING (
    posted_by = auth.uid()
    OR is_camp_coach(camp_id)
  );

CREATE POLICY "Confirmed parents can view camp day posts"
  ON public.camp_day_posts FOR SELECT
  USING (
    posted_by = auth.uid()
    OR is_camp_coach(camp_id)
    OR is_camp_parent(camp_id)
  );

-- ============================================================
-- CAMP DAY POST MEDIA + TAGS
-- ============================================================
CREATE POLICY "Camp participants can view post media"
  ON public.camp_day_post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.camp_day_posts p
      WHERE p.id = camp_day_post_media.post_id
        AND (is_camp_coach(p.camp_id) OR is_camp_parent(p.camp_id))
    )
  );

CREATE POLICY "Coaches manage post media"
  ON public.camp_day_post_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.camp_day_posts p
      WHERE p.id = camp_day_post_media.post_id
        AND is_camp_coach(p.camp_id)
    )
  );

CREATE POLICY "Coaches manage post athlete tags"
  ON public.camp_day_post_athlete_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.camp_day_posts p
      WHERE p.id = camp_day_post_athlete_tags.post_id
        AND is_camp_coach(p.camp_id)
    )
  );

-- ============================================================
-- TOURNAMENTS + GAMES
-- ============================================================
CREATE POLICY "Coaches manage their tournaments"
  ON public.tournaments FOR ALL
  USING (is_team_coach(team_id));

CREATE POLICY "Parents can view tournaments for their athlete's team"
  ON public.tournaments FOR SELECT
  USING (
    is_team_coach(team_id)
    OR is_team_staff(team_id)
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.athletes a ON a.id = tm.athlete_id
      WHERE tm.team_id = tournaments.team_id
        AND a.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches manage tournament games"
  ON public.tournament_games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_games.tournament_id
        AND is_team_coach(t.team_id)
    )
  );

CREATE POLICY "Parents can view tournament games"
  ON public.tournament_games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.team_members tm ON tm.team_id = t.team_id
      JOIN public.athletes a ON a.id = tm.athlete_id
      WHERE t.id = tournament_games.tournament_id
        AND (is_team_coach(t.team_id) OR a.parent_user_id = auth.uid())
    )
  );

-- ============================================================
-- MEDIA FILES
-- ============================================================
CREATE POLICY "Coaches manage media they uploaded"
  ON public.media_files FOR ALL
  USING (uploaded_by = auth.uid());

CREATE POLICY "Parents can view media shared with them or their athlete is tagged"
  ON public.media_files FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR is_public = true
    OR (
      is_shared = true
      AND EXISTS (
        SELECT 1 FROM public.media_athlete_tags mat
        JOIN public.athletes a ON a.id = mat.athlete_id
        WHERE mat.media_id = media_files.id
          AND a.parent_user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- SESSION MEDIA + MEDIA ATHLETE TAGS
-- ============================================================
CREATE POLICY "Coaches manage session media"
  ON public.session_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_media.session_id
        AND s.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches manage athlete tags"
  ON public.media_athlete_tags FOR ALL
  USING (tagged_by = auth.uid());

CREATE POLICY "Parents can view tags for their athletes"
  ON public.media_athlete_tags FOR SELECT
  USING (
    tagged_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = media_athlete_tags.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- PRIVATE SERIES + PRIVATE LESSONS
-- ============================================================
CREATE POLICY "Coaches manage their private series"
  ON public.private_series FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Parents can view their private series"
  ON public.private_series FOR SELECT
  USING (
    coach_id = auth.uid()
    OR parent_user_id = auth.uid()
  );

CREATE POLICY "Coaches manage their private lessons"
  ON public.private_lessons FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Parents can view their private lessons"
  ON public.private_lessons FOR SELECT
  USING (
    coach_id = auth.uid()
    OR parent_user_id = auth.uid()
  );

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE POLICY "Payers can view their own transactions"
  ON public.transactions FOR SELECT
  USING (payer_id = auth.uid());

CREATE POLICY "Coaches (payees) can view transactions for their camps/lessons"
  ON public.transactions FOR SELECT
  USING (
    payer_id = auth.uid()
    OR payee_id = auth.uid()
  );

-- ============================================================
-- COACH VERIFICATIONS
-- ============================================================
CREATE POLICY "Coaches can view their own verification"
  ON public.coach_verifications FOR SELECT
  USING (coach_id = auth.uid());

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE POLICY "Senders can manage their own messages"
  ON public.messages FOR ALL
  USING (sender_id = auth.uid());

CREATE POLICY "Recipients and team members can view messages"
  ON public.messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR (team_id IS NOT NULL AND (is_team_coach(team_id) OR is_team_staff(team_id)))
    OR (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.athletes a ON a.id = tm.athlete_id
      WHERE tm.team_id = messages.team_id
        AND a.parent_user_id = auth.uid()
    ))
    OR (camp_id IS NOT NULL AND (is_camp_coach(camp_id) OR is_camp_parent(camp_id)))
  );

-- ============================================================
-- MESSAGE READS
-- ============================================================
CREATE POLICY "Users manage their own message reads"
  ON public.message_reads FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "Users can view and manage their own notifications"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- USER PUSH TOKENS
-- ============================================================
CREATE POLICY "Users manage their own push tokens"
  ON public.user_push_tokens FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- COMBINE TEST RESULTS
-- ============================================================
CREATE POLICY "Coaches can manage combine results for their athletes"
  ON public.combine_test_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = combine_test_results.athlete_id
        AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Parents can view their athlete's combine results"
  ON public.combine_test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = combine_test_results.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- ============================================================
-- ICE TIMES
-- ============================================================
CREATE POLICY "Coaches manage their ice times"
  ON public.ice_times FOR ALL
  USING (coach_id = auth.uid());
