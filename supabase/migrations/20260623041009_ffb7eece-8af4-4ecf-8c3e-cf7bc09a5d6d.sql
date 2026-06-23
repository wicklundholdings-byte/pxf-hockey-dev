
-- The "Parents view assigned team members" policy referenced camp_staff,
-- and camp_staff's policy referenced team_members -> infinite recursion.
-- Replace with a SECURITY DEFINER helper that bypasses RLS for the lookup.

DROP POLICY IF EXISTS "Parents view assigned team members" ON public.team_members;

CREATE OR REPLACE FUNCTION public.is_team_member_visible_to_parent(_team_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.camp_staff cs
    WHERE cs.team_member_id = _team_member_id
      AND public.is_parent_of_camp(cs.camp_id)
  );
$$;

CREATE POLICY "Parents view assigned team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (public.is_team_member_visible_to_parent(id));
