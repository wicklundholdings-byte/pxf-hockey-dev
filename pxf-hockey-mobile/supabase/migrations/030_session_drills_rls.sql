-- Migration 030: Fix session_drills RLS
-- Drop all existing policies on session_drills and recreate with proper WITH CHECK
-- so coaches can insert/select/update/delete drills on their own sessions.

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'session_drills' AND schemaname = 'public' LOOP
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
