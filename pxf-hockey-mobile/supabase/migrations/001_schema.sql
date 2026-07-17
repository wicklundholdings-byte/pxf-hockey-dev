-- ============================================================
-- PXF Hockey — Migration 001: Full Schema
-- Project: pxf-hockey-prod
-- Run this first in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id                      uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email                   text,
  first_name              text,
  last_name               text,
  phone                   text,
  avatar_url              text,
  role                    text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'coach', 'staff', 'admin')),
  subscription_tier       text CHECK (subscription_tier IN ('parent', 'team_coach', 'elite_coach', 'academy')),
  organization_id         uuid,
  slug                    text UNIQUE,
  stripe_customer_id      text,
  stripe_account_id       text,
  is_founding_member      boolean DEFAULT false,
  is_verified             boolean DEFAULT false,
  verification_expires_at timestamptz,
  onboarding_complete     boolean DEFAULT false,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ============================================================
-- 2. ORGANIZATIONS
-- ============================================================
CREATE TABLE public.organizations (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  logo_url   text,
  website    text,
  slug       text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add deferred FK from profiles → organizations
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ============================================================
-- 3. LOCATIONS
-- ============================================================
CREATE TABLE public.locations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  name            text NOT NULL,
  address         text,
  type            text DEFAULT 'rink' CHECK (type IN ('rink', 'gym', 'outdoor', 'other')),
  cost_per_hour   decimal(10,2),
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 4. TEAMS
-- ============================================================
CREATE TABLE public.teams (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  name            text NOT NULL,
  age_group       text,
  season          text,
  division        text,
  association     text,
  logo_url        text,
  primary_color   text,
  secondary_color text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 5. ATHLETES
-- ============================================================
CREATE TABLE public.athletes (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name              text NOT NULL,
  last_name               text NOT NULL,
  date_of_birth           date,
  position                text CHECK (position IN ('forward', 'defense', 'goalie')),
  jersey_number           text,
  headshot_url            text,
  parent_user_id          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  governing_body_number   text,
  governing_body_verified boolean DEFAULT false,
  current_skill_level_id  uuid,
  notes                   text,
  created_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ============================================================
-- 6. AUTHORIZED CAREGIVERS
-- ============================================================
CREATE TABLE public.authorized_caregivers (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id     uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  parent_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name           text NOT NULL,
  relationship   text,
  phone          text,
  email          text,
  created_at     timestamptz DEFAULT now()
);

-- ============================================================
-- 7. TEAM MEMBERS
-- ============================================================
CREATE TABLE public.team_members (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id       uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  athlete_id    uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  jersey_number text,
  position      text CHECK (position IN ('forward', 'defense', 'goalie')),
  line_position text CHECK (line_position IN ('LW', 'C', 'RW', 'LD', 'RD')),
  status        text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'injured')),
  joined_at     date,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(team_id, athlete_id)
);

-- ============================================================
-- 8. TEAM STAFF
-- ============================================================
CREATE TABLE public.team_staff (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id          uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id          uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role             text CHECK (role IN ('assistant_coach', 'manager', 'trainer', 'goalie_coach')),
  permission_level text DEFAULT 'assistant' CHECK (permission_level IN ('owner', 'manager', 'coach', 'assistant', 'content_creator')),
  session_rate     decimal(10,2),
  permissions      jsonb DEFAULT '{}',
  invited_at       timestamptz DEFAULT now(),
  accepted_at      timestamptz,
  created_at       timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- ============================================================
-- 9. ATHLETE STATS
-- ============================================================
CREATE TABLE public.athlete_stats (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id        uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  team_id           uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  season            text NOT NULL,
  games_played      int DEFAULT 0,
  goals             int DEFAULT 0,
  assists           int DEFAULT 0,
  points            int DEFAULT 0,
  plus_minus        int DEFAULT 0,
  penalty_minutes   int DEFAULT 0,
  save_pct          decimal(5,3),
  goals_against_avg decimal(5,2),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(athlete_id, team_id, season)
);

-- ============================================================
-- 10. SKILL PROGRESSION LEVELS
-- ============================================================
CREATE TABLE public.skill_progression_levels (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  description text,
  color       text,
  order_index int NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Add deferred FK from athletes → skill_progression_levels
ALTER TABLE public.athletes
  ADD CONSTRAINT athletes_skill_level_fkey
  FOREIGN KEY (current_skill_level_id) REFERENCES public.skill_progression_levels(id) ON DELETE SET NULL;

-- ============================================================
-- 11. ATHLETE PROGRESS LEVELS
-- ============================================================
CREATE TABLE public.athlete_progress_levels (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id  uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  coach_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  level_id    uuid REFERENCES public.skill_progression_levels(id) ON DELETE CASCADE NOT NULL,
  assigned_at date NOT NULL,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 12. ATHLETE EVALUATIONS
-- ============================================================
CREATE TABLE public.athlete_evaluations (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id        uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  coach_id          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id           uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  camp_id           uuid,
  title             text,
  overall_rating    int CHECK (overall_rating BETWEEN 1 AND 5),
  written_notes     text,
  share_with_parent boolean DEFAULT false,
  evaluated_at      date,
  created_at        timestamptz DEFAULT now()
);

-- ============================================================
-- 13. ATHLETE SKILL RATINGS
-- ============================================================
CREATE TABLE public.athlete_skill_ratings (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id uuid REFERENCES public.athlete_evaluations(id) ON DELETE SET NULL,
  athlete_id    uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  coach_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  skill_name    text NOT NULL,
  category      text CHECK (category IN ('skating', 'shooting', 'defense', 'mental', 'compete')),
  rating        int CHECK (rating BETWEEN 1 AND 10),
  notes         text,
  assessed_at   date,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 14. ATHLETE SESSION NOTES
-- ============================================================
CREATE TABLE public.athlete_session_notes (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id        uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  coach_id          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id        uuid,
  camp_id           uuid,
  drill_ids         uuid[],
  written_notes     text,
  star_rating       int CHECK (star_rating BETWEEN 1 AND 5),
  share_with_parent boolean DEFAULT false,
  noted_at          date,
  created_at        timestamptz DEFAULT now()
);

-- ============================================================
-- 15. SESSIONS
-- ============================================================
CREATE TABLE public.sessions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team_id       uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  session_type  text DEFAULT 'practice' CHECK (session_type IN ('practice', 'training', 'skills', 'video')),
  location_id   uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  duration_mins int,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Resolve deferred session FKs
ALTER TABLE public.athlete_session_notes
  ADD CONSTRAINT athlete_session_notes_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;

-- ============================================================
-- 16. DRILL CATEGORIES
-- ============================================================
CREATE TABLE public.drill_categories (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  color      text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 17. DRILLS
-- ============================================================
CREATE TABLE public.drills (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id   uuid REFERENCES public.drill_categories(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  instructions  text,
  duration_mins int,
  video_url     text,
  diagram_url   text,
  skill_tags    text[],
  source_type   text DEFAULT 'original' CHECK (source_type IN ('original', 'ihs_import', 'social_import')),
  source_url    text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 18. SESSION DRILLS
-- ============================================================
CREATE TABLE public.session_drills (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id             uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  drill_id               uuid REFERENCES public.drills(id) ON DELETE CASCADE NOT NULL,
  order_index            int DEFAULT 0,
  duration_override_mins int,
  notes                  text,
  created_at             timestamptz DEFAULT now()
);

-- ============================================================
-- 19. TRAINING PROGRAMS (Dryland — parent self-serve)
-- ============================================================
CREATE TABLE public.training_programs (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title          text NOT NULL,
  description    text,
  category       text CHECK (category IN ('stick_skills', 'shooting', 'strength_explosiveness')),
  level          text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  duration_weeks int,
  is_public      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ============================================================
-- 20. PROGRAM DRILLS
-- ============================================================
CREATE TABLE public.program_drills (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id  uuid REFERENCES public.training_programs(id) ON DELETE CASCADE NOT NULL,
  drill_id    uuid REFERENCES public.drills(id) ON DELETE CASCADE NOT NULL,
  day_number  int,
  order_index int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 21. ATHLETE PROGRAM ENROLLMENTS
-- ============================================================
CREATE TABLE public.athlete_program_enrollments (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id          uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  training_program_id uuid REFERENCES public.training_programs(id) ON DELETE CASCADE NOT NULL,
  enrolled_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  training_days       text[],
  start_date          date,
  status              text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  enrolled_at         timestamptz DEFAULT now(),
  completed_at        timestamptz,
  created_at          timestamptz DEFAULT now()
);

-- ============================================================
-- 22. FAVORITE FOLDERS
-- ============================================================
CREATE TABLE public.favorite_folders (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  folder_type text CHECK (folder_type IN ('drills', 'sessions', 'plays')),
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 23. PLAYS (Playbook)
-- ============================================================
CREATE TABLE public.plays (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  description text,
  diagram_url text,
  category    text CHECK (category IN ('offense', 'defense', 'special_teams', 'neutral_zone')),
  tags        text[],
  is_template boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 24. TEAM EVENTS (Practices, Games, Team Events)
-- ============================================================
CREATE TABLE public.team_events (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id        uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  title          text NOT NULL,
  event_type     text NOT NULL CHECK (event_type IN ('practice', 'game', 'team_event')),
  location_id    uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  location_notes text,
  opponent       text,
  date           date NOT NULL,
  start_time     time NOT NULL,
  end_time       time,
  is_home        boolean,
  session_id     uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ============================================================
-- 25. EVENT RSVPs
-- ============================================================
CREATE TABLE public.event_rsvps (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_event_id  uuid REFERENCES public.team_events(id) ON DELETE CASCADE NOT NULL,
  athlete_id     uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  parent_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rsvp_status    text NOT NULL CHECK (rsvp_status IN ('yes', 'no', 'maybe')),
  responded_at   timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now(),
  UNIQUE(team_event_id, athlete_id)
);

-- ============================================================
-- 26. ATTENDANCE RECORDS
-- ============================================================
CREATE TABLE public.attendance_records (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_event_id   uuid REFERENCES public.team_events(id) ON DELETE CASCADE,
  camp_id         uuid,
  camp_session_id uuid,
  athlete_id      uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  status          text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  marked_at       timestamptz DEFAULT now(),
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 27. EVENT DUTIES (Volunteers)
-- ============================================================
CREATE TABLE public.event_duties (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_event_id   uuid REFERENCES public.team_events(id) ON DELETE CASCADE NOT NULL,
  duty_type       text NOT NULL CHECK (duty_type IN ('scorekeeper', 'timekeeper', 'gate', 'snack', 'carpool', 'photographer')),
  assigned_to     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  open_for_signup boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 28. GAME LINEUPS
-- ============================================================
CREATE TABLE public.game_lineups (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_event_id uuid REFERENCES public.team_events(id) ON DELETE CASCADE NOT NULL,
  lineup_name   text,
  lineup_type   text NOT NULL CHECK (lineup_type IN ('forward_line', 'defense_pair', 'goalie', 'pp', 'pk', 'scratches')),
  positions     jsonb NOT NULL DEFAULT '{}',
  order_index   int DEFAULT 0,
  is_template   boolean DEFAULT false,
  template_name text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 29. GAME PLANS
-- ============================================================
CREATE TABLE public.game_plans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_event_id   uuid REFERENCES public.team_events(id) ON DELETE CASCADE NOT NULL UNIQUE,
  opponent_notes  text,
  our_game_plan   text,
  key_matchups    text,
  pre_game_notes  text,
  p1_adjustments  text,
  p2_adjustments  text,
  p3_adjustments  text,
  post_game_notes text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 30. ICE TIMES
-- ============================================================
CREATE TABLE public.ice_times (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id        uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  location_id     uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  date            date NOT NULL,
  start_time      time NOT NULL,
  end_time        time NOT NULL,
  cost            decimal(10,2),
  camp_id         uuid,
  team_event_id   uuid REFERENCES public.team_events(id) ON DELETE SET NULL,
  notes           text,
  source          text DEFAULT 'manual' CHECK (source IN ('manual', 'pdf_import')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 31. CAMPS
-- ============================================================
CREATE TABLE public.camps (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id                  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id           uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  location_id               uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  name                      text NOT NULL,
  slug                      text UNIQUE,
  description               text,
  type                      text DEFAULT 'camp' CHECK (type IN ('camp', 'clinic', 'showcase', 'tryout')),
  start_date                date NOT NULL,
  end_date                  date NOT NULL,
  price                     decimal(10,2) NOT NULL DEFAULT 0,
  max_spots                 int,
  spots_remaining           int,
  age_groups                text[],
  status                    text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'full', 'closed', 'cancelled')),
  banner_image_url          text,
  stripe_price_id           text,
  sibling_discount_pct      decimal(5,2),
  payment_plan_enabled      boolean DEFAULT false,
  payment_plan_installments int DEFAULT 2,
  registration_deadline     date,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- Resolve deferred camp FKs
ALTER TABLE public.athlete_evaluations
  ADD CONSTRAINT athlete_evaluations_camp_id_fkey
  FOREIGN KEY (camp_id) REFERENCES public.camps(id) ON DELETE SET NULL;

ALTER TABLE public.athlete_session_notes
  ADD CONSTRAINT athlete_session_notes_camp_id_fkey
  FOREIGN KEY (camp_id) REFERENCES public.camps(id) ON DELETE SET NULL;

ALTER TABLE public.ice_times
  ADD CONSTRAINT ice_times_camp_id_fkey
  FOREIGN KEY (camp_id) REFERENCES public.camps(id) ON DELETE SET NULL;

-- ============================================================
-- 32. CAMP FORM FIELDS
-- ============================================================
CREATE TABLE public.camp_form_fields (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id     uuid REFERENCES public.camps(id) ON DELETE CASCADE NOT NULL,
  label       text NOT NULL,
  field_type  text NOT NULL CHECK (field_type IN ('text', 'select', 'checkbox', 'date', 'file', 'textarea')),
  options     text[],
  is_required boolean DEFAULT false,
  order_index int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 33. CAMP SESSIONS (Days within a camp)
-- ============================================================
CREATE TABLE public.camp_sessions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id     uuid REFERENCES public.camps(id) ON DELETE CASCADE NOT NULL,
  date        date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  session_id  uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  notes       text,
  status      text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_at  timestamptz DEFAULT now()
);

-- Resolve deferred attendance FK
ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_camp_id_fkey
  FOREIGN KEY (camp_id) REFERENCES public.camps(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_camp_session_id_fkey
  FOREIGN KEY (camp_session_id) REFERENCES public.camp_sessions(id) ON DELETE CASCADE;

-- ============================================================
-- 34. DISCOUNT CODES
-- ============================================================
CREATE TABLE public.discount_codes (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id        uuid REFERENCES public.camps(id) ON DELETE CASCADE NOT NULL,
  coach_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  code           text NOT NULL,
  discount_type  text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value decimal(10,2) NOT NULL,
  max_uses       int,
  uses_count     int DEFAULT 0,
  expires_at     timestamptz,
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(camp_id, code)
);

-- ============================================================
-- 35. CAMP REGISTRATIONS
-- ============================================================
CREATE TABLE public.camp_registrations (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id                  uuid REFERENCES public.camps(id) ON DELETE CASCADE NOT NULL,
  athlete_id               uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  parent_user_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status                   text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'waitlist', 'cancelled', 'refunded')),
  payment_status           text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partial', 'refunded')),
  amount_paid              decimal(10,2) DEFAULT 0,
  discount_code_id         uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  discount_applied         decimal(10,2) DEFAULT 0,
  health_form_id           uuid,
  waiver_signed_at         timestamptz,
  qr_code                  text UNIQUE DEFAULT gen_random_uuid()::text,
  stripe_payment_intent_id text,
  platform_fee             decimal(10,2) DEFAULT 0,
  waitlist_promoted_at     timestamptz,
  waitlist_expires_at      timestamptz,
  registered_at            timestamptz DEFAULT now(),
  confirmed_at             timestamptz,
  notes                    text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

-- ============================================================
-- 36. CAMP REGISTRATION RESPONSES
-- ============================================================
CREATE TABLE public.camp_registration_responses (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_registration_id uuid REFERENCES public.camp_registrations(id) ON DELETE CASCADE NOT NULL,
  form_field_id        uuid REFERENCES public.camp_form_fields(id) ON DELETE CASCADE NOT NULL,
  answer               text,
  created_at           timestamptz DEFAULT now()
);

-- ============================================================
-- 37. CAMP WAIVERS
-- ============================================================
CREATE TABLE public.camp_waivers (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_registration_id uuid REFERENCES public.camp_registrations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  waiver_text          text NOT NULL,
  signed_by_name       text NOT NULL,
  signed_by_user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address           text,
  signed_at            timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz DEFAULT now()
);

-- ============================================================
-- 38. ATHLETE HEALTH FORMS
-- (RLS restricts to coach/manager/owner only — parents cannot read other athletes' records)
-- ============================================================
CREATE TABLE public.athlete_health_forms (
  id                               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id                       uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  camp_registration_id             uuid REFERENCES public.camp_registrations(id) ON DELETE SET NULL,
  allergies                        text,
  medications                      text,
  medical_conditions               text,
  physician_name                   text,
  physician_phone                  text,
  emergency_contact_1_name         text,
  emergency_contact_1_phone        text,
  emergency_contact_1_relationship text,
  emergency_contact_2_name         text,
  emergency_contact_2_phone        text,
  emergency_contact_2_relationship text,
  medical_clearance_url            text,
  insurance_provider               text,
  insurance_policy_num             text,
  created_at                       timestamptz DEFAULT now(),
  updated_at                       timestamptz DEFAULT now()
);

-- Resolve health_form FK on camp_registrations
ALTER TABLE public.camp_registrations
  ADD CONSTRAINT camp_registrations_health_form_id_fkey
  FOREIGN KEY (health_form_id) REFERENCES public.athlete_health_forms(id) ON DELETE SET NULL;

-- ============================================================
-- 39. CHECK INS (QR scan log)
-- ============================================================
CREATE TABLE public.check_ins (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_registration_id uuid REFERENCES public.camp_registrations(id) ON DELETE CASCADE NOT NULL,
  camp_session_id      uuid REFERENCES public.camp_sessions(id) ON DELETE CASCADE NOT NULL,
  athlete_id           uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  scanned_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scanned_at           timestamptz DEFAULT now(),
  method               text DEFAULT 'qr' CHECK (method IN ('qr', 'manual')),
  UNIQUE(camp_registration_id, camp_session_id)
);

-- ============================================================
-- 40. PAYMENT INSTALLMENTS
-- ============================================================
CREATE TABLE public.payment_installments (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_registration_id     uuid REFERENCES public.camp_registrations(id) ON DELETE CASCADE NOT NULL,
  installment_number       int NOT NULL,
  amount                   decimal(10,2) NOT NULL,
  due_date                 date,
  status                   text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'waived')),
  stripe_payment_intent_id text,
  paid_at                  timestamptz,
  created_at               timestamptz DEFAULT now()
);

-- ============================================================
-- 41. CAMP DAY POSTS (Parent daily updates)
-- ============================================================
CREATE TABLE public.camp_day_posts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id         uuid REFERENCES public.camps(id) ON DELETE CASCADE NOT NULL,
  camp_session_id uuid REFERENCES public.camp_sessions(id) ON DELETE SET NULL,
  posted_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  caption         text,
  post_type       text DEFAULT 'daily_update' CHECK (post_type IN ('daily_update', 'camp_wrap')),
  is_pinned       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 42. TOURNAMENTS
-- ============================================================
CREATE TABLE public.tournaments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id     uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  location    text,
  start_date  date,
  end_date    date,
  description text,
  logo_url    text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 43. TOURNAMENT GAMES
-- ============================================================
CREATE TABLE public.tournament_games (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id  uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  home_team_name text,
  away_team_name text,
  game_date      date,
  game_time      time,
  rink           text,
  location       text,
  score_home     int,
  score_away     int,
  status         text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'final', 'cancelled')),
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ============================================================
-- 44. MEDIA FILES
-- ============================================================
CREATE TABLE public.media_files (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title            text,
  description      text,
  file_url         text NOT NULL,
  thumbnail_url    text,
  file_type        text NOT NULL CHECK (file_type IN ('video', 'image')),
  duration_seconds int,
  file_size_bytes  bigint,
  storage_path     text,
  is_public        boolean DEFAULT false,
  is_shared        boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ============================================================
-- 45. SESSION MEDIA
-- ============================================================
CREATE TABLE public.session_media (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  media_id    uuid REFERENCES public.media_files(id) ON DELETE CASCADE NOT NULL,
  order_index int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 46. MEDIA ATHLETE TAGS
-- ============================================================
CREATE TABLE public.media_athlete_tags (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id          uuid REFERENCES public.media_files(id) ON DELETE CASCADE NOT NULL,
  athlete_id        uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  tagged_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  timestamp_seconds int,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(media_id, athlete_id)
);

-- ============================================================
-- 47. CAMP DAY POST MEDIA
-- ============================================================
CREATE TABLE public.camp_day_post_media (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid REFERENCES public.camp_day_posts(id) ON DELETE CASCADE NOT NULL,
  media_id    uuid REFERENCES public.media_files(id) ON DELETE CASCADE NOT NULL,
  order_index int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 48. CAMP DAY POST ATHLETE TAGS
-- ============================================================
CREATE TABLE public.camp_day_post_athlete_tags (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid REFERENCES public.camp_day_posts(id) ON DELETE CASCADE NOT NULL,
  athlete_id uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, athlete_id)
);

-- ============================================================
-- 49. PRIVATE SERIES
-- ============================================================
CREATE TABLE public.private_series (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id                 uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  athlete_id               uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  parent_user_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name                     text NOT NULL,
  description              text,
  total_sessions           int,
  price_type               text DEFAULT 'flat_fee' CHECK (price_type IN ('per_session', 'flat_fee')),
  price                    decimal(10,2),
  total_amount             decimal(10,2),
  status                   text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'completed', 'cancelled')),
  payment_status           text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  stripe_payment_intent_id text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

-- ============================================================
-- 50. PRIVATE LESSONS
-- ============================================================
CREATE TABLE public.private_lessons (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id                 uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  athlete_id               uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  parent_user_id           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  private_series_id        uuid REFERENCES public.private_series(id) ON DELETE SET NULL,
  location_id              uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  date                     date NOT NULL,
  start_time               time NOT NULL,
  duration_minutes         int NOT NULL,
  price                    decimal(10,2),
  status                   text DEFAULT 'confirmed' CHECK (status IN ('requested', 'confirmed', 'completed', 'cancelled')),
  payment_status           text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'included_in_series')),
  stripe_payment_intent_id text,
  notes                    text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

-- ============================================================
-- 51. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE public.subscriptions (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan                   text NOT NULL CHECK (plan IN ('parent', 'team_coach', 'elite_coach', 'academy')),
  status                 text DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'paused')),
  billing_interval       text DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual')),
  amount                 decimal(10,2),
  stripe_subscription_id text,
  stripe_price_id        text,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  trial_start            timestamptz DEFAULT now(),
  trial_end              timestamptz DEFAULT (now() + interval '30 days'),
  is_founding_member     boolean DEFAULT false,
  cancelled_at           timestamptz,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- ============================================================
-- 52. TRANSACTIONS
-- ============================================================
CREATE TABLE public.transactions (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_id                 uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payee_id                 uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  camp_registration_id     uuid REFERENCES public.camp_registrations(id) ON DELETE SET NULL,
  private_lesson_id        uuid REFERENCES public.private_lessons(id) ON DELETE SET NULL,
  private_series_id        uuid REFERENCES public.private_series(id) ON DELETE SET NULL,
  gross_amount             decimal(10,2) NOT NULL,
  platform_fee             decimal(10,2) NOT NULL DEFAULT 0,
  stripe_processing_fee    decimal(10,2) DEFAULT 0,
  net_amount               decimal(10,2) NOT NULL,
  stripe_payment_intent_id text,
  stripe_transfer_id       text,
  status                   text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  created_at               timestamptz DEFAULT now()
);

-- ============================================================
-- 53. COACH VERIFICATIONS (Checkr)
-- ============================================================
CREATE TABLE public.coach_verifications (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id            uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  checkr_candidate_id text,
  checkr_report_id    text,
  status              text DEFAULT 'pending' CHECK (status IN ('pending', 'consider', 'clear', 'suspended')),
  submitted_at        timestamptz,
  cleared_at          timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ============================================================
-- 54. MESSAGES
-- ============================================================
CREATE TABLE public.messages (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id      uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  camp_id      uuid REFERENCES public.camps(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  body         text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('team', 'camp', 'direct', 'announcement')),
  channels     text[],
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- 55. MESSAGE READS
-- ============================================================
CREATE TABLE public.message_reads (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  read_at    timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- ============================================================
-- 56. NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL CHECK (type IN ('message', 'camp_registration', 'game_reminder', 'payment', 'evaluation', 'media_tag', 'rsvp_reminder', 'general')),
  title      text NOT NULL,
  body       text,
  data       jsonb DEFAULT '{}',
  read_at    timestamptz,
  sent_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 57. USER PUSH TOKENS (Expo Push Notifications)
-- ============================================================
CREATE TABLE public.user_push_tokens (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token       text NOT NULL,
  device_type text CHECK (device_type IN ('ios', 'android')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

-- ============================================================
-- 58. COMBINE TEST RESULTS (V2 — UI shell only in V1)
-- ============================================================
CREATE TABLE public.combine_test_results (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id      uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  category        text NOT NULL CHECK (category IN ('speed_power', 'explosiveness', 'shot_power', 'shot_speed', 'agility', 'recovery')),
  hardware_source text CHECK (hardware_source IN ('resistance_trainer', 'force_plate', 'shot_plate', 'speed_gates', 'manual', 'apple_health')),
  score           decimal(10,2),
  raw_data        jsonb DEFAULT '{}',
  tested_at       timestamptz NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'parent')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles        FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.organizations    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.locations        FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.teams            FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.athletes         FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sessions         FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.drills           FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.camps            FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.camp_registrations FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.athlete_health_forms FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.camp_day_posts   FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tournaments      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tournament_games FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.team_events      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.game_lineups     FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.game_plans       FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.media_files      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.private_series   FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.private_lessons  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.coach_verifications FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ice_times        FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_push_tokens FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
