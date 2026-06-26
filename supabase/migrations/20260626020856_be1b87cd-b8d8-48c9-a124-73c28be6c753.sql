
-- Staff weekly availability
CREATE TABLE public.staff_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.elite_staff_coaches(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_availability TO authenticated;
GRANT ALL ON public.staff_availability TO service_role;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages staff availability"
  ON public.staff_availability FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Staff can view own availability"
  ON public.staff_availability FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.elite_staff_coaches s
    WHERE s.id = staff_id AND s.staff_user_id = auth.uid()
  ));

CREATE INDEX idx_staff_availability_staff ON public.staff_availability(staff_id);
CREATE INDEX idx_staff_availability_owner ON public.staff_availability(owner_id);

-- Private booking requests / waitlist
CREATE TABLE public.private_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  athlete_name text NOT NULL,
  parent_name text,
  parent_contact text,
  preferred_dates text,
  preferred_times text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','waitlisted','confirmed','declined')),
  decline_message text,
  resulting_session_id uuid REFERENCES public.private_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_booking_requests TO authenticated;
GRANT ALL ON public.private_booking_requests TO service_role;
ALTER TABLE public.private_booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages booking requests"
  ON public.private_booking_requests FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX idx_booking_requests_owner ON public.private_booking_requests(owner_id, status);

CREATE TRIGGER trg_booking_requests_updated
  BEFORE UPDATE ON public.private_booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
