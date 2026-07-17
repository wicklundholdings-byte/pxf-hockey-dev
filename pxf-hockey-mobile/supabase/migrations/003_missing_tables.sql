-- ============================================================
-- PXF Hockey — Migration 003: Missing Tables (Audit Patch)
-- Project: pxf-hockey-prod
-- Run this AFTER 001_schema.sql and 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- 1. SESSION SERIES
-- "3 Day Skating Flow" = Session 1 + Session 2 + Session 3
-- Applied to a camp in one tap from Playbook
-- ============================================================
CREATE TABLE public.session_series (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE public.session_series_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id   uuid REFERENCES public.session_series(id) ON DELETE CASCADE NOT NULL,
  session_id  uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  day_number  int NOT NULL,
  order_index int DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(series_id, day_number)
);

-- ============================================================
-- 2. USER FAVORITES
-- Coaches heart drills, sessions, plays, programs
-- "Favorites — all hearted content across Drills, Sessions, Camps"
-- ============================================================
CREATE TABLE public.user_favorites (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('drill', 'session', 'play', 'program', 'series')),
  content_id   uuid NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

-- ============================================================
-- 3. FAVORITE FOLDER ITEMS
-- "Folders — DB-backed flat folders per section (syncs across devices)"
-- Links any favorited content to a named folder
-- ============================================================
CREATE TABLE public.favorite_folder_items (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id    uuid REFERENCES public.favorite_folders(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('drill', 'session', 'play', 'program', 'series')),
  content_id   uuid NOT NULL,
  order_index  int DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(folder_id, content_type, content_id)
);

-- ============================================================
-- 4. CAMP RSVPs
-- "Daily Attendance RSVP — parent confirms attendance the evening
-- before, inline on parent dashboard"
-- Separate from team event RSVPs — this is per camp session day
-- ============================================================
CREATE TABLE public.camp_rsvps (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_session_id uuid REFERENCES public.camp_sessions(id) ON DELETE CASCADE NOT NULL,
  athlete_id      uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  parent_user_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rsvp_status     text NOT NULL CHECK (rsvp_status IN ('yes', 'no', 'maybe')),
  responded_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(camp_session_id, athlete_id)
);

-- ============================================================
-- 5. ATHLETE CERTIFICATES
-- "Achievement certificates — coach issues, parent receives via email and app"
-- ============================================================
CREATE TABLE public.athlete_certificates (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id   uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  coach_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  camp_id      uuid REFERENCES public.camps(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text,
  image_url    text,
  issued_at    date NOT NULL DEFAULT CURRENT_DATE,
  notified_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- 6. STAFF AVAILABILITY
-- Web portal scheduling board: "Coaches with availability for that
-- time slot are shown in full color — unavailable coaches are greyed out"
-- ============================================================
CREATE TABLE public.staff_availability (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date         date NOT NULL,
  start_time   time,
  end_time     time,
  is_available boolean DEFAULT true,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, date, start_time)
);

-- ============================================================
-- 7. ADD assigned_staff_id TO ice_times
-- Scheduling board: owner drags a staff coach onto an ice slot
-- ============================================================
ALTER TABLE public.ice_times
  ADD COLUMN assigned_staff_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================================
-- RLS POLICIES for new tables
-- ============================================================

-- Session Series
CREATE POLICY "Coaches manage their session series"
  ON public.session_series FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Coaches manage series items"
  ON public.session_series_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.session_series s
      WHERE s.id = session_series_items.series_id
        AND s.coach_id = auth.uid()
    )
  );

-- User Favorites
CREATE POLICY "Users manage their own favorites"
  ON public.user_favorites FOR ALL
  USING (user_id = auth.uid());

-- Favorite Folder Items
CREATE POLICY "Coaches manage their folder items"
  ON public.favorite_folder_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.favorite_folders f
      WHERE f.id = favorite_folder_items.folder_id
        AND f.coach_id = auth.uid()
    )
  );

-- Camp RSVPs
CREATE POLICY "Parents manage camp RSVPs for their athletes"
  ON public.camp_rsvps FOR ALL
  USING (parent_user_id = auth.uid());

CREATE POLICY "Coaches can view camp RSVPs for their camps"
  ON public.camp_rsvps FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR is_camp_coach((SELECT camp_id FROM public.camp_sessions WHERE id = camp_rsvps.camp_session_id))
  );

-- Athlete Certificates
CREATE POLICY "Coaches manage certificates they issued"
  ON public.athlete_certificates FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Parents can view their athlete's certificates"
  ON public.athlete_certificates FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_certificates.athlete_id
        AND a.parent_user_id = auth.uid()
    )
  );

-- Staff Availability
CREATE POLICY "Coaches manage availability for their staff"
  ON public.staff_availability FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "Staff can view and update their own availability"
  ON public.staff_availability FOR ALL
  USING (user_id = auth.uid() OR coach_id = auth.uid());

-- Updated triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.session_series FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
