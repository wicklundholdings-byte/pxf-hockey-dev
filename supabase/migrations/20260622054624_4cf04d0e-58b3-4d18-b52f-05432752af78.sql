CREATE POLICY "Parents view their registrations"
ON public.registrations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.attendees a
    WHERE a.id = registrations.attendee_id
      AND a.owner_id = auth.uid()
  )
);