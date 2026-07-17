-- ============================================================
-- PXF Hockey — Fix handle_new_user trigger
--
-- Previously the trigger stored 'coach' (from user_metadata.role)
-- directly into profiles.role. This caused mobile coach sign-ups
-- to skip onboarding because _layout.tsx only routes to onboarding
-- when role IS NULL.
--
-- New behaviour:
--   - 'parent' in user_metadata  → store 'parent'  (valid, route to parent-home)
--   - 'elite' in user_metadata   → store 'elite'   (web sign-up, valid)
--   - 'team'  in user_metadata   → store 'team'    (web sign-up, valid)
--   - anything else ('coach', null, etc.) → store NULL (goes to onboarding)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  meta_role TEXT;
BEGIN
  meta_role := new.raw_user_meta_data->>'role';

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      TRIM(
        COALESCE(new.raw_user_meta_data->>'first_name', '') || ' ' ||
        COALESCE(new.raw_user_meta_data->>'last_name', '')
      )
    ),
    -- Only store recognised, terminal roles. 'coach' is a mobile placeholder
    -- that must go through onboarding to become 'elite' or 'team'.
    CASE meta_role
      WHEN 'elite'  THEN 'elite'
      WHEN 'team'   THEN 'team'
      WHEN 'parent' THEN 'parent'
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
