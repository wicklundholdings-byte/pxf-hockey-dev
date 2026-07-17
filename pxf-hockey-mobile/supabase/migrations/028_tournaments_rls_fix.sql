-- Migration 028: Fix tournaments RLS for INSERT
-- The existing "Coaches manage their tournaments" FOR ALL USING-only policy
-- does not reliably fire as WITH CHECK for INSERT in Supabase.
-- Replace with explicit per-operation policies and ensure grants.
-- Run in Supabase Dashboard → SQL Editor

-- 1. Ensure RLS is enabled
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- 2. Ensure authenticated role has table-level access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;

-- 3. Drop the old catch-all policy
DROP POLICY IF EXISTS "Coaches manage their tournaments" ON public.tournaments;

-- 4. SELECT: coach or team staff or parent of a player on the team
CREATE POLICY "Coaches select tournaments"
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

-- 5. INSERT: only the team's coach (inline check — avoids SECURITY DEFINER edge cases)
CREATE POLICY "Coaches insert tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND coach_id = auth.uid()
    )
  );

-- 6. UPDATE: only the team's coach
CREATE POLICY "Coaches update tournaments"
  ON public.tournaments FOR UPDATE
  USING (is_team_coach(team_id))
  WITH CHECK (is_team_coach(team_id));

-- 7. DELETE: only the team's coach
CREATE POLICY "Coaches delete tournaments"
  ON public.tournaments FOR DELETE
  USING (is_team_coach(team_id));

-- 8. Drop the old "Parents can view" policy (now merged into SELECT above)
DROP POLICY IF EXISTS "Parents can view tournaments for their athlete's team" ON public.tournaments;
