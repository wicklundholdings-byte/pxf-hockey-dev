
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.elite_staff_status AS ENUM ('invited','active','removed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table: elite_staff_coaches
CREATE TABLE IF NOT EXISTS public.elite_staff_coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text,
  status public.elite_staff_status NOT NULL DEFAULT 'invited',
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS elite_staff_coaches_owner_email_active_idx
  ON public.elite_staff_coaches (owner_id, lower(email))
  WHERE status <> 'removed';
CREATE UNIQUE INDEX IF NOT EXISTS elite_staff_coaches_token_idx ON public.elite_staff_coaches (invite_token);
CREATE INDEX IF NOT EXISTS elite_staff_coaches_staff_user_idx ON public.elite_staff_coaches (staff_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elite_staff_coaches TO authenticated;
GRANT ALL ON public.elite_staff_coaches TO service_role;
ALTER TABLE public.elite_staff_coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own staff" ON public.elite_staff_coaches
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Staff reads own row" ON public.elite_staff_coaches
  FOR SELECT USING (staff_user_id = auth.uid());

-- Table: elite_staff_team_assignments
CREATE TABLE IF NOT EXISTS public.elite_staff_team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.elite_staff_coaches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, team_id)
);
CREATE INDEX IF NOT EXISTS elite_staff_team_assignments_team_idx ON public.elite_staff_team_assignments (team_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elite_staff_team_assignments TO authenticated;
GRANT ALL ON public.elite_staff_team_assignments TO service_role;
ALTER TABLE public.elite_staff_team_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own assignments" ON public.elite_staff_team_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.elite_staff_coaches s WHERE s.id = staff_id AND s.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.elite_staff_coaches s WHERE s.id = staff_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Staff reads own assignments" ON public.elite_staff_team_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.elite_staff_coaches s WHERE s.id = staff_id AND s.staff_user_id = auth.uid())
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS elite_staff_coaches_set_updated_at ON public.elite_staff_coaches;
CREATE TRIGGER elite_staff_coaches_set_updated_at
  BEFORE UPDATE ON public.elite_staff_coaches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpers
CREATE OR REPLACE FUNCTION public.elite_owner_for(_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.elite_staff_coaches
       WHERE staff_user_id = _user AND status = 'active' LIMIT 1),
    _user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_elite_staff(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.elite_staff_coaches
    WHERE staff_user_id = _user AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_assigned_team_ids(_user uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.team_id
  FROM public.elite_staff_team_assignments a
  JOIN public.elite_staff_coaches s ON s.id = a.staff_id
  WHERE s.staff_user_id = _user AND s.status = 'active';
$$;

-- Invite lookup (public token, no auth)
CREATE OR REPLACE FUNCTION public.get_staff_invite_by_token(_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'email', s.email,
    'full_name', s.full_name,
    'status', s.status,
    'owner_name', COALESCE(p.full_name, 'A coach')
  ) INTO result
  FROM public.elite_staff_coaches s
  LEFT JOIN public.profiles p ON p.id = s.owner_id
  WHERE s.invite_token = _token;
  IF result IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_staff_invite(_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row public.elite_staff_coaches%ROWTYPE; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.elite_staff_coaches
     SET staff_user_id = uid,
         status = 'active',
         accepted_at = COALESCE(accepted_at, now())
   WHERE invite_token = _token AND status IN ('invited','active')
   RETURNING * INTO row;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid or expired invite'; END IF;
  -- Ensure they have a coach role
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'owner_id', row.owner_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_invite_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_staff_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_owner_for(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_elite_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_assigned_team_ids(uuid) TO authenticated;
