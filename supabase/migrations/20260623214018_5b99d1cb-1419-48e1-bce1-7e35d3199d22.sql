
-- 1. combine_scores: tighten WITH CHECK
DROP POLICY IF EXISTS "combine scores parent or coach" ON public.combine_scores;
CREATE POLICY "combine scores parent or coach" ON public.combine_scores
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM attendees a
    JOIN registrations r ON r.attendee_id = a.id
    LEFT JOIN camps c ON c.id = r.camp_id
    WHERE a.id = combine_scores.athlete_id
      AND (r.contact_id IN (SELECT current_user_contact_ids()) OR c.owner_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM attendees a
    JOIN registrations r ON r.attendee_id = a.id
    LEFT JOIN camps c ON c.id = r.camp_id
    WHERE a.id = combine_scores.athlete_id
      AND (r.contact_id IN (SELECT current_user_contact_ids()) OR c.owner_id = auth.uid())
  )
);

-- 2. coach_marketing_settings: drop broad anon read, add scoped RPC
DROP POLICY IF EXISTS "public read pixel" ON public.coach_marketing_settings;

CREATE OR REPLACE FUNCTION public.get_meta_pixel_id(_coach_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT meta_pixel_id FROM public.coach_marketing_settings WHERE coach_id = _coach_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_meta_pixel_id(uuid) TO anon, authenticated;

-- 3. combine_public_shares: remove anon SELECT (RPC get_combine_share already SECURITY DEFINER)
DROP POLICY IF EXISTS "public resolves share by token" ON public.combine_public_shares;

-- 4. medical-docs storage: allow coaches to read docs for athletes in their camps.
-- Folder convention: docs are stored at "<owner_uuid>/..." where owner_uuid is auth user.
CREATE POLICY "Coaches read medical docs for their camp athletes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medical-docs'
  AND EXISTS (
    SELECT 1
    FROM public.attendees a
    JOIN public.registrations r ON r.attendee_id = a.id
    JOIN public.camps c ON c.id = r.camp_id
    WHERE a.owner_id::text = (storage.foldername(name))[1]
      AND c.owner_id = auth.uid()
  )
);

-- 5. profiles: remove broad public SELECT; rely on definer view + name RPC
DROP POLICY IF EXISTS "Public marketplace profile fields" ON public.profiles;

ALTER VIEW public.public_marketplace_profiles SET (security_invoker = false);
GRANT SELECT ON public.public_marketplace_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_names(_ids uuid[])
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name FROM public.profiles WHERE id = ANY(_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_names(uuid[]) TO authenticated;

-- 6. team_invites: hide invite_token from regular Data API reads.
-- The server function that needs the token will use the service-role client.
REVOKE SELECT ON public.team_invites FROM anon, authenticated;
GRANT SELECT (
  id, team_id, athlete_first_name, athlete_last_name, athlete_dob,
  position, jersey_number, parent1_name, parent1_email, parent1_phone,
  parent2_name, parent2_email, status, invited_at, joined_at,
  parent_submission, submitted_at
) ON public.team_invites TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
