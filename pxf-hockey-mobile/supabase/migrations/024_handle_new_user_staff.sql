-- ============================================================
-- Migration 024: Update handle_new_user for staff invites
-- ============================================================
-- When a staff member accepts their invite and signs up,
-- Supabase sets user_metadata to:
--   { role: 'staff', staff_member_id: '<uuid>', full_name: '<name>' }
--
-- This trigger update:
--   1. Recognises 'staff' as a valid terminal role
--   2. Sets profiles.staff_member_id from metadata
--   3. Also updates the staff_members.status to 'active' + joined_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  meta_role        TEXT;
  meta_staff_id    UUID;
  resolved_name    TEXT;
BEGIN
  meta_role     := new.raw_user_meta_data->>'role';
  resolved_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    TRIM(
      COALESCE(new.raw_user_meta_data->>'first_name', '') || ' ' ||
      COALESCE(new.raw_user_meta_data->>'last_name', '')
    )
  );

  -- Parse staff_member_id safely (only present for staff invites)
  BEGIN
    meta_staff_id := (new.raw_user_meta_data->>'staff_member_id')::uuid;
  EXCEPTION WHEN others THEN
    meta_staff_id := NULL;
  END;

  INSERT INTO public.profiles (id, full_name, role, staff_member_id)
  VALUES (
    new.id,
    resolved_name,
    CASE meta_role
      WHEN 'elite'  THEN 'elite'
      WHEN 'team'   THEN 'team'
      WHEN 'parent' THEN 'parent'
      WHEN 'staff'  THEN 'staff'
      ELSE NULL
    END,
    CASE WHEN meta_role = 'staff' THEN meta_staff_id ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  -- For staff: mark them active in staff_members
  IF meta_role = 'staff' AND meta_staff_id IS NOT NULL THEN
    UPDATE public.staff_members
    SET status    = 'active',
        joined_at = now()
    WHERE id = meta_staff_id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
