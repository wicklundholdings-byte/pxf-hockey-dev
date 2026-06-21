
CREATE TABLE public.daily_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  camp_session_id uuid NOT NULL REFERENCES public.camp_sessions(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'no_response' CHECK (status IN ('attending','not_attending','no_response')),
  reason text,
  responded_at timestamptz,
  overridden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  overridden_at timestamptz,
  rsvp_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  reminder_evening_sent_at timestamptz,
  reminder_morning_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (camp_session_id, registration_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_rsvps TO authenticated;
GRANT ALL ON public.daily_rsvps TO service_role;
ALTER TABLE public.daily_rsvps ENABLE ROW LEVEL SECURITY;

-- Coaches can read and update RSVPs for camps they own
CREATE POLICY "Coach reads RSVPs for own camps" ON public.daily_rsvps
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND c.owner_id = auth.uid()));

CREATE POLICY "Coach updates RSVPs for own camps" ON public.daily_rsvps
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND c.owner_id = auth.uid()));

-- Coach (camp owner) can pre-create RSVP rows for their camp
CREATE POLICY "Coach inserts RSVPs for own camps" ON public.daily_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.camps c WHERE c.id = camp_id AND c.owner_id = auth.uid()));

CREATE INDEX idx_daily_rsvps_session ON public.daily_rsvps(camp_session_id);
CREATE INDEX idx_daily_rsvps_camp ON public.daily_rsvps(camp_id);
CREATE INDEX idx_daily_rsvps_reg ON public.daily_rsvps(registration_id);

CREATE TRIGGER update_daily_rsvps_updated_at BEFORE UPDATE ON public.daily_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public RSVP function: parent uses token from their reminder link to respond
-- without an account. Returns minimal info needed by the RSVP screen.
CREATE OR REPLACE FUNCTION public.respond_to_rsvp(
  _token text,
  _status text,
  _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rsvp_row public.daily_rsvps%ROWTYPE;
BEGIN
  IF _status NOT IN ('attending','not_attending') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.daily_rsvps
  SET status = _status,
      reason = CASE WHEN _status = 'not_attending' THEN _reason ELSE NULL END,
      responded_at = now(),
      overridden_by = NULL,
      overridden_at = NULL
  WHERE rsvp_token = _token
  RETURNING * INTO rsvp_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  RETURN jsonb_build_object(
    'status', rsvp_row.status,
    'responded_at', rsvp_row.responded_at,
    'camp_session_id', rsvp_row.camp_session_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_rsvp(text, text, text) TO anon, authenticated;

-- Lookup function so the public RSVP screen can show camp/day/athlete context
-- using only the token (no PII beyond what the parent already received).
CREATE OR REPLACE FUNCTION public.get_rsvp_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'reason', r.reason,
    'responded_at', r.responded_at,
    'camp_name', c.name,
    'session_date', cs.session_date,
    'start_time', cs.start_time,
    'end_time', cs.end_time,
    'day_number', (
      SELECT count(*)
      FROM public.camp_sessions cs2
      WHERE cs2.camp_id = c.id AND cs2.session_date <= cs.session_date
    ),
    'athlete_name', COALESCE(a.full_name, ct.full_name, 'Athlete')
  )
  INTO result
  FROM public.daily_rsvps r
  JOIN public.camps c ON c.id = r.camp_id
  JOIN public.camp_sessions cs ON cs.id = r.camp_session_id
  JOIN public.registrations reg ON reg.id = r.registration_id
  LEFT JOIN public.attendees a ON a.id = reg.attendee_id
  LEFT JOIN public.contacts ct ON ct.id = reg.contact_id
  WHERE r.rsvp_token = _token;

  IF result IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rsvp_by_token(text) TO anon, authenticated;
