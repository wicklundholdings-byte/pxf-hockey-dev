
-- 1) Security definer view → switch to security invoker
ALTER VIEW public.public_marketplace_profiles SET (security_invoker = on);

-- 2) Restrict dryland_program_sessions reads to published programs
DROP POLICY IF EXISTS "View program sessions" ON public.dryland_program_sessions;
CREATE POLICY "View program sessions"
  ON public.dryland_program_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dryland_programs p
      WHERE p.id = dryland_program_sessions.program_id
        AND (p.is_published = true OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- 3) Fix medical-docs storage policy to use object path, not camp name
DROP POLICY IF EXISTS "Coaches read medical docs for their camp athletes" ON storage.objects;
CREATE POLICY "Coaches read medical docs for their camp athletes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-docs'
    AND EXISTS (
      SELECT 1
      FROM public.attendees a
      JOIN public.registrations r ON r.attendee_id = a.id
      JOIN public.camps c ON c.id = r.camp_id
      WHERE (a.owner_id)::text = (storage.foldername(storage.objects.name))[1]
        AND c.owner_id = auth.uid()
    )
  );
