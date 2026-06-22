CREATE POLICY "Parents insert their RSVPs"
ON public.daily_rsvps FOR INSERT
TO authenticated
WITH CHECK (
  registration_id IN (
    SELECT r.id FROM public.registrations r
    WHERE r.contact_id IN (SELECT public.current_user_contact_ids())
  )
);