
-- Drop the recursive policies
DROP POLICY IF EXISTS "Parents view attendees from their registrations" ON public.attendees;
DROP POLICY IF EXISTS "Parents view registrations by contact email" ON public.registrations;

-- Security definer: get contact ids for current user's email (bypasses RLS)
CREATE OR REPLACE FUNCTION public.current_user_contact_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.contacts WHERE email = (auth.jwt() ->> 'email');
$$;

-- Recreate registrations policy using the helper (no join to attendees)
CREATE POLICY "Parents view registrations by contact email"
ON public.registrations
FOR SELECT
TO authenticated
USING (contact_id IN (SELECT public.current_user_contact_ids()));

-- Recreate attendees policy using the helper (no recursion)
CREATE POLICY "Parents view attendees from their registrations"
ON public.attendees
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT attendee_id FROM public.registrations
    WHERE contact_id IN (SELECT public.current_user_contact_ids())
  )
);
