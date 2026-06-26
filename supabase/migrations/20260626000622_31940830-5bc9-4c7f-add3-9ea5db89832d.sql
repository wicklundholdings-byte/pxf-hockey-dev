
-- 1. athlete_health_profiles: scope coach reads to camp ownership/staffing
DROP POLICY IF EXISTS "Coaches read athlete health" ON public.athlete_health_profiles;

CREATE POLICY "Coaches read athlete health"
ON public.athlete_health_profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.camps c ON c.id = r.camp_id
    WHERE r.attendee_id = athlete_health_profiles.athlete_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.camp_staff cs
          JOIN public.team_members tm ON tm.id = cs.team_member_id
          WHERE cs.camp_id = c.id
            AND tm.member_user_id = auth.uid()
            AND tm.status = 'active'::team_member_status
        )
      )
  )
);

-- 2. camp-media storage policies: fix broken join (compare object folder to camp id)
DROP POLICY IF EXISTS "Camp staff can manage camp-media" ON storage.objects;
DROP POLICY IF EXISTS "Camp staff can upload camp-media" ON storage.objects;

CREATE POLICY "Camp staff can manage camp-media"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'camp-media'
  AND EXISTS (
    SELECT 1
    FROM public.camps c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.camp_staff cs
          JOIN public.team_members tm ON tm.id = cs.team_member_id
          WHERE cs.camp_id = c.id
            AND tm.member_user_id = auth.uid()
            AND tm.status = 'active'::team_member_status
        )
      )
  )
)
WITH CHECK (
  bucket_id = 'camp-media'
  AND EXISTS (
    SELECT 1
    FROM public.camps c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.camp_staff cs
          JOIN public.team_members tm ON tm.id = cs.team_member_id
          WHERE cs.camp_id = c.id
            AND tm.member_user_id = auth.uid()
            AND tm.status = 'active'::team_member_status
        )
      )
  )
);

CREATE POLICY "Camp staff can upload camp-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'camp-media'
  AND EXISTS (
    SELECT 1
    FROM public.camps c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.camp_staff cs
          JOIN public.team_members tm ON tm.id = cs.team_member_id
          WHERE cs.camp_id = c.id
            AND tm.member_user_id = auth.uid()
            AND tm.status = 'active'::team_member_status
        )
      )
  )
);

-- 3. Public coach profile view exposing only safe fields
CREATE OR REPLACE VIEW public.coach_public_profiles
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.full_name,
  p.bio,
  p.city,
  p.slug,
  p.marketplace_visible
FROM public.profiles p
WHERE p.marketplace_visible = true;

GRANT SELECT ON public.coach_public_profiles TO authenticated, anon;
