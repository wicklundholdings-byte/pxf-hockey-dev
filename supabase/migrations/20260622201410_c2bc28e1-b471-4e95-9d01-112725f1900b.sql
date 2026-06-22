
-- Team permission levels
DO $$ BEGIN
  CREATE TYPE public.team_permission AS ENUM ('owner','coach','assistant');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS permission_level public.team_permission NOT NULL DEFAULT 'coach';

-- Camp staff assignments
CREATE TABLE IF NOT EXISTS public.camp_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (camp_id, team_member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_staff TO authenticated;
GRANT ALL ON public.camp_staff TO service_role;

ALTER TABLE public.camp_staff ENABLE ROW LEVEL SECURITY;

-- Camp owner can manage assignments for their camps
CREATE POLICY "Camp owner manages staff"
ON public.camp_staff FOR ALL
USING (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_staff.camp_id AND c.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_staff.camp_id AND c.owner_id = auth.uid()));

-- Assigned team member can view their own assignments
CREATE POLICY "Assigned member can view"
ON public.camp_staff FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.id = camp_staff.team_member_id AND tm.member_user_id = auth.uid()
));

-- Allow team members to read their own record (so they can resolve their permission)
DROP POLICY IF EXISTS "Member can view self" ON public.team_members;
CREATE POLICY "Member can view self"
ON public.team_members FOR SELECT
USING (member_user_id = auth.uid() OR owner_id = auth.uid());

-- Helper: get the team_member row for the current user
CREATE OR REPLACE FUNCTION public.my_team_membership()
RETURNS TABLE(team_member_id uuid, owner_id uuid, permission_level public.team_permission)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, owner_id, permission_level
  FROM public.team_members
  WHERE member_user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;
