-- ============================================================
-- PXF Hockey — Coach slug for public profile URLs
-- /coach/[slug] pages on pxfhockey.com
-- ============================================================

-- Add slug column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Function: generate a URL-safe slug from a name
CREATE OR REPLACE FUNCTION public.slugify(text TEXT)
RETURNS TEXT AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(trim($1), '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
$$ LANGUAGE SQL IMMUTABLE;

-- Function: generate a unique slug (appends -2, -3 etc. if taken)
CREATE OR REPLACE FUNCTION public.unique_coach_slug(base_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter   INT := 0;
BEGIN
  base_slug := public.slugify(base_name);
  IF base_slug = '' THEN
    base_slug := 'coach';
  END IF;
  candidate := base_slug;
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE slug = candidate AND id <> user_id
    ) THEN
      RETURN candidate;
    END IF;
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Backfill slugs for existing profiles that have a full_name but no slug
UPDATE profiles
SET slug = public.unique_coach_slug(full_name, id)
WHERE slug IS NULL
  AND full_name IS NOT NULL
  AND full_name <> '';

-- RLS: slugs are publicly readable (needed for /coach/[slug] pages)
-- coaches can update their own slug
CREATE POLICY "public_read_slug" ON profiles
  FOR SELECT USING (true);    -- profiles already public-readable via existing policy

-- ── Update handle_new_user to also set slug ────────────────────────────────
-- (The migration 006 already replaced this function; update it again here)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  meta_role  TEXT;
  meta_name  TEXT;
  base_slug  TEXT;
BEGIN
  meta_role := new.raw_user_meta_data->>'role';
  meta_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    TRIM(
      COALESCE(new.raw_user_meta_data->>'first_name', '') || ' ' ||
      COALESCE(new.raw_user_meta_data->>'last_name', '')
    )
  );

  INSERT INTO public.profiles (id, full_name, role, slug)
  VALUES (
    new.id,
    NULLIF(meta_name, ''),
    CASE meta_role
      WHEN 'elite'  THEN 'elite'
      WHEN 'team'   THEN 'team'
      WHEN 'parent' THEN 'parent'
      ELSE NULL
    END,
    CASE
      WHEN meta_name <> '' THEN public.unique_coach_slug(meta_name, new.id)
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
