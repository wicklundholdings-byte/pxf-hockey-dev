CREATE POLICY "Parents view contacts by email"
ON public.contacts FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email'));

CREATE POLICY "Parents view registrations by contact email"
ON public.registrations FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contacts c
  WHERE c.id = registrations.contact_id
    AND c.email = (auth.jwt() ->> 'email')
));

CREATE POLICY "Parents view attendees from their registrations"
ON public.attendees FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.registrations r
  JOIN public.contacts c ON c.id = r.contact_id
  WHERE r.attendee_id = attendees.id
    AND c.email = (auth.jwt() ->> 'email')
));