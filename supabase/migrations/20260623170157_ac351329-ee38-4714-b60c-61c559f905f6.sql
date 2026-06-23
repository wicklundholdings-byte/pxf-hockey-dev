
-- Camp Updates: daily photo/video posts from coaches to parents
CREATE TYPE public.camp_update_post_type AS ENUM ('daily', 'wrap');
CREATE TYPE public.camp_update_media_type AS ENUM ('photo', 'video');

CREATE TABLE public.camp_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  camp_day_date date,
  post_type public.camp_update_post_type NOT NULL DEFAULT 'daily',
  caption text,
  posted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_camp_updates_camp ON public.camp_updates(camp_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_updates TO authenticated;
GRANT ALL ON public.camp_updates TO service_role;
ALTER TABLE public.camp_updates ENABLE ROW LEVEL SECURITY;

-- Coaches/owners/staff of the camp can manage
CREATE POLICY "Camp staff can manage updates"
ON public.camp_updates FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND c.owner_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.camp_staff cs
    JOIN public.team_members tm ON tm.id = cs.team_member_id
    WHERE cs.camp_id = camp_updates.camp_id AND tm.member_user_id = auth.uid() AND tm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND c.owner_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.camp_staff cs
    JOIN public.team_members tm ON tm.id = cs.team_member_id
    WHERE cs.camp_id = camp_updates.camp_id AND tm.member_user_id = auth.uid() AND tm.status = 'active'
  )
);

-- Registered parents can view
CREATE POLICY "Registered parents can view updates"
ON public.camp_updates FOR SELECT TO authenticated
USING (public.is_parent_of_camp(camp_id));

CREATE TABLE public.camp_update_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.camp_updates(id) ON DELETE CASCADE,
  media_type public.camp_update_media_type NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_camp_update_media_update ON public.camp_update_media(update_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_update_media TO authenticated;
GRANT ALL ON public.camp_update_media TO service_role;
ALTER TABLE public.camp_update_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Camp staff can manage update media"
ON public.camp_update_media FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.camp_updates u
    JOIN public.camps c ON c.id = u.camp_id
    WHERE u.id = update_id AND (
      c.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.camp_staff cs
        JOIN public.team_members tm ON tm.id = cs.team_member_id
        WHERE cs.camp_id = c.id AND tm.member_user_id = auth.uid() AND tm.status = 'active'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.camp_updates u
    JOIN public.camps c ON c.id = u.camp_id
    WHERE u.id = update_id AND (
      c.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.camp_staff cs
        JOIN public.team_members tm ON tm.id = cs.team_member_id
        WHERE cs.camp_id = c.id AND tm.member_user_id = auth.uid() AND tm.status = 'active'
      )
    )
  )
);

CREATE POLICY "Registered parents can view update media"
ON public.camp_update_media FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.camp_updates u
    WHERE u.id = update_id AND public.is_parent_of_camp(u.camp_id)
  )
);

CREATE TABLE public.camp_update_athlete_tags (
  update_id uuid NOT NULL REFERENCES public.camp_updates(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  PRIMARY KEY (update_id, athlete_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_update_athlete_tags TO authenticated;
GRANT ALL ON public.camp_update_athlete_tags TO service_role;
ALTER TABLE public.camp_update_athlete_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Camp staff can manage tags"
ON public.camp_update_athlete_tags FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.camp_updates u
    JOIN public.camps c ON c.id = u.camp_id
    WHERE u.id = update_id AND (
      c.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.camp_staff cs
        JOIN public.team_members tm ON tm.id = cs.team_member_id
        WHERE cs.camp_id = c.id AND tm.member_user_id = auth.uid() AND tm.status = 'active'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.camp_updates u
    JOIN public.camps c ON c.id = u.camp_id
    WHERE u.id = update_id AND (
      c.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.camp_staff cs
        JOIN public.team_members tm ON tm.id = cs.team_member_id
        WHERE cs.camp_id = c.id AND tm.member_user_id = auth.uid() AND tm.status = 'active'
      )
    )
  )
);

CREATE POLICY "Registered parents can view tags"
ON public.camp_update_athlete_tags FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.camp_updates u
    WHERE u.id = update_id AND public.is_parent_of_camp(u.camp_id)
  )
);

CREATE TABLE public.camp_update_reactions (
  update_id uuid NOT NULL REFERENCES public.camp_updates(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (update_id, parent_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_update_reactions TO authenticated;
GRANT ALL ON public.camp_update_reactions TO service_role;
ALTER TABLE public.camp_update_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registered parents can view reactions"
ON public.camp_update_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.camp_updates u
    WHERE u.id = update_id AND public.is_parent_of_camp(u.camp_id)
  )
);

CREATE POLICY "Registered parents can react"
ON public.camp_update_reactions FOR INSERT TO authenticated
WITH CHECK (
  parent_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.camp_updates u
    WHERE u.id = update_id AND public.is_parent_of_camp(u.camp_id)
  )
);

CREATE POLICY "Parents can remove own reaction"
ON public.camp_update_reactions FOR DELETE TO authenticated
USING (parent_id = auth.uid());

CREATE TRIGGER trg_camp_updates_updated_at
BEFORE UPDATE ON public.camp_updates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for camp-media bucket (bucket itself created via storage tool).
-- Path convention: <camp_id>/<update_id>/<filename>
CREATE POLICY "Camp staff can upload camp-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'camp-media'
  AND EXISTS (
    SELECT 1 FROM public.camps c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.camp_staff cs
          JOIN public.team_members tm ON tm.id = cs.team_member_id
          WHERE cs.camp_id = c.id AND tm.member_user_id = auth.uid() AND tm.status = 'active'
        )
      )
  )
);

CREATE POLICY "Camp staff can manage camp-media"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'camp-media'
  AND EXISTS (
    SELECT 1 FROM public.camps c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.camp_staff cs
          JOIN public.team_members tm ON tm.id = cs.team_member_id
          WHERE cs.camp_id = c.id AND tm.member_user_id = auth.uid() AND tm.status = 'active'
        )
      )
  )
);

CREATE POLICY "Registered parents can read camp-media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'camp-media'
  AND public.is_parent_of_camp(((storage.foldername(name))[1])::uuid)
);
