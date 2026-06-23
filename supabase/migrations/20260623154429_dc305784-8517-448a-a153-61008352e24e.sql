
DO $$ BEGIN
  CREATE TYPE public.media_annotation_status AS ENUM ('raw','reviewed','annotated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.athlete_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.camp_sessions(id) ON DELETE SET NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds numeric,
  caption text,
  annotation_status public.media_annotation_status NOT NULL DEFAULT 'raw',
  is_shared boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_athlete_media_athlete ON public.athlete_media(athlete_id);
CREATE INDEX idx_athlete_media_session ON public.athlete_media(session_id);
CREATE INDEX idx_athlete_media_coach ON public.athlete_media(coach_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_media TO authenticated;
GRANT ALL ON public.athlete_media TO service_role;

ALTER TABLE public.athlete_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own athlete media"
ON public.athlete_media FOR ALL
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Parents view shared media for their athletes"
ON public.athlete_media FOR SELECT
TO authenticated
USING (
  is_shared = true
  AND EXISTS (
    SELECT 1 FROM public.attendees a
    WHERE a.id = athlete_media.athlete_id
      AND a.contact_id IN (SELECT public.current_user_contact_ids())
  )
);

CREATE TRIGGER update_athlete_media_updated_at
BEFORE UPDATE ON public.athlete_media
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.video_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES public.athlete_media(id) ON DELETE CASCADE,
  frame_timestamp numeric,
  annotation_type text NOT NULL,
  annotation_data jsonb,
  voiceover_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_video_annotations_media ON public.video_annotations(media_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_annotations TO authenticated;
GRANT ALL ON public.video_annotations TO service_role;

ALTER TABLE public.video_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages annotations on own media"
ON public.video_annotations FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.athlete_media m WHERE m.id = video_annotations.media_id AND m.coach_id = auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.athlete_media m WHERE m.id = video_annotations.media_id AND m.coach_id = auth.uid())
);

CREATE POLICY "Parents view annotations on shared media"
ON public.video_annotations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.athlete_media m
    JOIN public.attendees a ON a.id = m.athlete_id
    WHERE m.id = video_annotations.media_id
      AND m.is_shared = true
      AND a.contact_id IN (SELECT public.current_user_contact_ids())
  )
);

-- Storage RLS for athlete-media bucket
CREATE POLICY "Coach manages own athlete-media files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'athlete-media' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'athlete-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Parents read shared athlete-media files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'athlete-media'
  AND EXISTS (
    SELECT 1 FROM public.athlete_media m
    JOIN public.attendees a ON a.id = m.athlete_id
    WHERE m.is_shared = true
      AND a.contact_id IN (SELECT public.current_user_contact_ids())
      AND (m.video_url LIKE '%' || storage.objects.name OR m.thumbnail_url LIKE '%' || storage.objects.name)
  )
);
