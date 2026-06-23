
-- Allow parents (those with a registration in a camp) to view the camp's assigned staff and the related team_member rows so they can see and message the coaching staff.

CREATE OR REPLACE FUNCTION public.is_parent_of_camp(_camp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.camp_id = _camp_id
      AND r.contact_id IN (SELECT public.current_user_contact_ids())
  );
$$;

CREATE POLICY "Parents view camp staff"
ON public.camp_staff
FOR SELECT
TO authenticated
USING (public.is_parent_of_camp(camp_id));

CREATE POLICY "Parents view assigned team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.camp_staff cs
    WHERE cs.team_member_id = team_members.id
      AND public.is_parent_of_camp(cs.camp_id)
  )
);
