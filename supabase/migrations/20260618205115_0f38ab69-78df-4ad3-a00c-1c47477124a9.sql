
-- 1. Add WITH CHECK to admin profile update policy
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Restrict program_drills SELECT to published programs + drills (admins bypass)
DROP POLICY IF EXISTS "Public read program drills" ON public.program_drills;
CREATE POLICY "Public read published program drills" ON public.program_drills
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      EXISTS (SELECT 1 FROM public.training_programs tp WHERE tp.id = program_id AND tp.is_published = true)
      AND EXISTS (SELECT 1 FROM public.drills d WHERE d.id = drill_id AND d.is_published = true)
    )
  );

-- 3. Helper: active subscription check
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated, service_role;

-- 4. Replace storage read policy: drill-videos requires subscription or admin
DROP POLICY IF EXISTS "Authenticated read media buckets" ON storage.objects;

CREATE POLICY "Authenticated read non-video media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = ANY (ARRAY['drill-thumbnails','category-images','program-images']));

CREATE POLICY "Subscribers read drill videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'drill-videos'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_active_subscription(auth.uid())
    )
  );
