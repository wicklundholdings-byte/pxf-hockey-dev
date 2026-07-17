-- ============================================================
-- PXF Hockey — Auto-link parent account to their player rows
--
-- When a parent signs up, any player rows whose parent_email
-- matches the parent's auth email should have parent_user_id
-- set automatically so RSVP and enrollment queries work.
-- ============================================================

-- Function: link players to a newly signed-up parent user
CREATE OR REPLACE FUNCTION public.link_parent_to_players(p_user_id UUID, p_email TEXT)
RETURNS INT AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE players
  SET parent_user_id = p_user_id
  WHERE lower(parent_email) = lower(p_email)
    AND parent_user_id IS NULL;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-link on profile creation (runs after handle_new_user)
-- Only fires when the new user's role is 'parent'
CREATE OR REPLACE FUNCTION public.handle_new_parent()
RETURNS trigger AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Only process parent profiles
  IF NEW.role <> 'parent' THEN
    RETURN NEW;
  END IF;

  -- Look up the user's email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  IF user_email IS NOT NULL THEN
    PERFORM public.link_parent_to_players(NEW.id, user_email);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire after a profile row is inserted with role = 'parent'
DROP TRIGGER IF EXISTS on_parent_profile_created ON profiles;
CREATE TRIGGER on_parent_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'parent')
  EXECUTE PROCEDURE public.handle_new_parent();

-- Also fire when role is updated to 'parent' (e.g. after routing fix upsert)
DROP TRIGGER IF EXISTS on_parent_role_set ON profiles;
CREATE TRIGGER on_parent_role_set
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'parent' AND (OLD.role IS DISTINCT FROM 'parent'))
  EXECUTE PROCEDURE public.handle_new_parent();
