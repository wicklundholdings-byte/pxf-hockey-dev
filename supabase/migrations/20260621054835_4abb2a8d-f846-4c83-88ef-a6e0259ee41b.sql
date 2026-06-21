
-- Add ownership + folder ref to drills for "create/edit/delete your own"
ALTER TABLE public.drills
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS folder_id uuid;

CREATE INDEX IF NOT EXISTS idx_drills_owner ON public.drills(owner_id);
CREATE INDEX IF NOT EXISTS idx_drills_folder ON public.drills(folder_id);

-- Allow owners to edit/delete their own drills (additive; keeps existing admin policies)
DROP POLICY IF EXISTS "Owners can update their drills" ON public.drills;
CREATE POLICY "Owners can update their drills" ON public.drills
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete their drills" ON public.drills;
CREATE POLICY "Owners can delete their drills" ON public.drills
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can insert their drills" ON public.drills;
CREATE POLICY "Owners can insert their drills" ON public.drills
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Playbook folders (one row per folder, scoped by kind)
CREATE TABLE public.playbook_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('drill','session','camp')),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbook_folders TO authenticated;
GRANT ALL ON public.playbook_folders TO service_role;
ALTER TABLE public.playbook_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their folders" ON public.playbook_folders
  FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_playbook_folders_owner_kind ON public.playbook_folders(owner_id, kind);
CREATE TRIGGER update_playbook_folders_updated_at BEFORE UPDATE ON public.playbook_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Camp templates (reusable multi-day curricula)
CREATE TABLE public.camp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  num_days int NOT NULL DEFAULT 3 CHECK (num_days >= 1 AND num_days <= 30),
  folder_id uuid REFERENCES public.playbook_folders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_templates TO authenticated;
GRANT ALL ON public.camp_templates TO service_role;
ALTER TABLE public.camp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their camp templates" ON public.camp_templates
  FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_camp_templates_owner ON public.camp_templates(owner_id);
CREATE TRIGGER update_camp_templates_updated_at BEFORE UPDATE ON public.camp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Days within a camp template; session_snapshot stores the full session blob
-- (sessions live in localStorage today, so snapshot keeps templates self-contained)
CREATE TABLE public.camp_template_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.camp_templates(id) ON DELETE CASCADE,
  day_number int NOT NULL CHECK (day_number >= 1),
  session_name text,
  session_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, day_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_template_days TO authenticated;
GRANT ALL ON public.camp_template_days TO service_role;
ALTER TABLE public.camp_template_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage days via template" ON public.camp_template_days
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camp_templates t WHERE t.id = template_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.camp_templates t WHERE t.id = template_id AND t.owner_id = auth.uid()));
CREATE INDEX idx_camp_template_days_template ON public.camp_template_days(template_id, day_number);
CREATE TRIGGER update_camp_template_days_updated_at BEFORE UPDATE ON public.camp_template_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
