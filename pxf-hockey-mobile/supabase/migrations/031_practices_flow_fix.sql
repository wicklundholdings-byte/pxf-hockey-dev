-- Migration 031: Comprehensive fix for the Practices / session-plan flow
-- Run this in one shot in the Supabase SQL editor.

-- ─── 1. Grant table-level access to authenticated role ───────────────────────
-- "permission denied for table" means the role has no privilege at all,
-- regardless of RLS. Both grants are needed: anon for public reads (drills),
-- authenticated for all coach writes.
GRANT ALL ON public.sessions       TO authenticated;
GRANT ALL ON public.session_drills TO authenticated;
GRANT USAGE ON SCHEMA public       TO authenticated;

-- ─── 2. Ensure sessions has every column the app uses ────────────────────────
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_template            boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS title                  text,
  ADD COLUMN IF NOT EXISTS notes                  text,
  ADD COLUMN IF NOT EXISTS main_focus             text[],
  ADD COLUMN IF NOT EXISTS total_duration_minutes integer  DEFAULT 0;

-- ─── 3. Make sure RLS is enabled on both tables ──────────────────────────────
ALTER TABLE public.sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_drills ENABLE ROW LEVEL SECURITY;

-- ─── 4. Drop ALL existing policies on sessions and recreate cleanly ──────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'sessions' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sessions';
  END LOOP;
END $$;

CREATE POLICY "coaches_manage_sessions" ON public.sessions
  FOR ALL
  USING      (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- ─── 5. Drop ALL existing policies on session_drills and recreate cleanly ────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'session_drills' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.session_drills';
  END LOOP;
END $$;

CREATE POLICY "coaches_manage_session_drills" ON public.session_drills
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_drills.session_id
        AND sessions.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_drills.session_id
        AND sessions.coach_id = auth.uid()
    )
  );
