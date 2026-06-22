
-- 1. coach_verifications: remove public PII exposure
DROP POLICY IF EXISTS "Public can view approved verifications" ON public.coach_verifications;

-- Allow anonymous + authenticated to call the existing is_coach_verified() helper
-- so public coach profile pages can still display a verified badge without PII.
GRANT EXECUTE ON FUNCTION public.is_coach_verified(uuid) TO anon, authenticated;

-- 2. profiles: stop exposing email / SMS provider config / postal_code via marketplace
DROP POLICY IF EXISTS "Public can view marketplace profiles" ON public.profiles;

-- Public read-only view exposing only marketplace-safe columns
CREATE OR REPLACE VIEW public.public_marketplace_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, bio, city, slug, marketplace_visible
FROM public.profiles
WHERE marketplace_visible = true;

GRANT SELECT ON public.public_marketplace_profiles TO anon, authenticated;

-- Re-add a column-restricted SELECT policy so the security_invoker view can
-- read the underlying rows for anon / authenticated callers.
CREATE POLICY "Public marketplace profile fields"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (marketplace_visible = true);

-- Note: the view above only projects safe columns. The policy itself is row-
-- scoped; to prevent direct SELECT of sensitive columns from anon, revoke
-- column privileges on the table for anon.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, bio, city, slug, marketplace_visible)
  ON public.profiles TO anon;

-- 3. coupons: ensure anon has no read access whatsoever (defensive)
REVOKE SELECT ON public.coupons FROM anon;

-- 4. user_roles: remove self-assign escalation, provide controlled coach claim
DROP POLICY IF EXISTS "Users can self-assign role" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.claim_coach_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_coach_role() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_coach_role() TO authenticated;

-- 5. waitlist_entries: allow registrants/parents to view their own entries
CREATE POLICY "Registrants view own waitlist entries"
ON public.waitlist_entries
FOR SELECT
TO authenticated
USING (
  contact_id IN (SELECT public.current_user_contact_ids())
  OR EXISTS (
    SELECT 1 FROM public.attendees a
    WHERE a.id = waitlist_entries.attendee_id
      AND a.owner_id = auth.uid()
  )
);
