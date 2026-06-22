CREATE POLICY "Registered parents view camp media"
ON public.camp_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.contacts c ON c.id = r.contact_id
    JOIN auth.users u ON u.id = auth.uid()
    WHERE r.camp_id = camp_media.camp_id
      AND r.status = 'paid'
      AND lower(c.email) = lower(u.email)
  )
);