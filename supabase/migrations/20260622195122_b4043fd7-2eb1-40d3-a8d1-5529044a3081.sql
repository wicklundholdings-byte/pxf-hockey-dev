
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketplace_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

ALTER TABLE public.camps
  ADD COLUMN IF NOT EXISTS age_group text,
  ADD COLUMN IF NOT EXISTS skill_level text,
  ADD COLUMN IF NOT EXISTS sport_type text DEFAULT 'hockey',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text;

CREATE INDEX IF NOT EXISTS idx_camps_marketplace_filters
  ON public.camps (status, start_date) WHERE status = 'live';

-- Allow anon read of marketplace-visible profiles (public coach pages)
DROP POLICY IF EXISTS "Public can view marketplace profiles" ON public.profiles;
CREATE POLICY "Public can view marketplace profiles"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (marketplace_visible = true);

GRANT SELECT ON public.profiles TO anon;
