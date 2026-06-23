
CREATE TABLE public.athlete_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  note_date date NOT NULL DEFAULT current_date,
  written_notes text,
  drill_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  drill_freetext jsonb NOT NULL DEFAULT '[]'::jsonb,
  session_rating int CHECK (session_rating IS NULL OR (session_rating BETWEEN 1 AND 5)),
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_notes TO authenticated;
GRANT ALL ON public.athlete_notes TO service_role;
ALTER TABLE public.athlete_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their own athlete notes"
ON public.athlete_notes FOR ALL TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Parents view shared notes for their athletes"
ON public.athlete_notes FOR SELECT TO authenticated
USING (
  is_shared = true
  AND EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.attendee_id = athlete_notes.athlete_id
      AND r.contact_id IN (SELECT public.current_user_contact_ids())
  )
);

CREATE INDEX idx_athlete_notes_athlete ON public.athlete_notes(athlete_id, note_date DESC);
CREATE INDEX idx_athlete_notes_coach ON public.athlete_notes(coach_id, note_date DESC);

CREATE TRIGGER update_athlete_notes_updated_at
BEFORE UPDATE ON public.athlete_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.athlete_note_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.athlete_notes(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_note_videos TO authenticated;
GRANT ALL ON public.athlete_note_videos TO service_role;
ALTER TABLE public.athlete_note_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage videos on their notes"
ON public.athlete_note_videos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.athlete_notes n WHERE n.id = note_id AND n.coach_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.athlete_notes n WHERE n.id = note_id AND n.coach_id = auth.uid()));

CREATE POLICY "Parents view videos on shared notes"
ON public.athlete_note_videos FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.athlete_notes n
  WHERE n.id = note_id
    AND n.is_shared = true
    AND EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.attendee_id = n.athlete_id
        AND r.contact_id IN (SELECT public.current_user_contact_ids())
    )
));

CREATE INDEX idx_athlete_note_videos_note ON public.athlete_note_videos(note_id);
