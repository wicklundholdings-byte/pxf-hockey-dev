CREATE POLICY "Parents read their RSVPs"
ON public.daily_rsvps FOR SELECT
TO authenticated
USING (
  registration_id IN (
    SELECT r.id FROM public.registrations r
    WHERE r.contact_id IN (SELECT public.current_user_contact_ids())
  )
);

CREATE POLICY "Parents update their RSVPs"
ON public.daily_rsvps FOR UPDATE
TO authenticated
USING (
  registration_id IN (
    SELECT r.id FROM public.registrations r
    WHERE r.contact_id IN (SELECT public.current_user_contact_ids())
  )
)
WITH CHECK (
  registration_id IN (
    SELECT r.id FROM public.registrations r
    WHERE r.contact_id IN (SELECT public.current_user_contact_ids())
  )
);