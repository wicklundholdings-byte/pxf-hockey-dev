
-- =========================================================================
-- COACH VERIFICATIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.coach_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  legal_first_name text,
  legal_last_name text,
  date_of_birth date,
  address_line1 text,
  address_line2 text,
  address_city text,
  address_region text,
  address_postal text,
  address_country text DEFAULT 'CA',
  consent_given_at timestamptz,
  fee_amount_cents integer DEFAULT 3500,
  fee_paid_at timestamptz,
  checkr_candidate_id text,
  checkr_report_id text,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  rejected_reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_verifications TO authenticated;
GRANT SELECT ON public.coach_verifications TO anon;
GRANT ALL ON public.coach_verifications TO service_role;

ALTER TABLE public.coach_verifications ENABLE ROW LEVEL SECURITY;

-- Public can read approved verifications (so badge shows on public pages)
CREATE POLICY "Public can view approved verifications"
ON public.coach_verifications
FOR SELECT
USING (status = 'approved' AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Coach can view own verification"
ON public.coach_verifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Coach can insert own verification"
ON public.coach_verifications
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coach can update own verification"
ON public.coach_verifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all verifications"
ON public.coach_verifications
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update verifications"
ON public.coach_verifications
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER coach_verifications_updated_at
BEFORE UPDATE ON public.coach_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: is this coach currently verified?
CREATE OR REPLACE FUNCTION public.is_coach_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coach_verifications
    WHERE user_id = _user_id
      AND status = 'approved'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- =========================================================================
-- AUTHORIZED CAREGIVERS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.authorized_caregivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relationship text NOT NULL,
  phone text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS authorized_caregivers_attendee_idx
  ON public.authorized_caregivers(attendee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.authorized_caregivers TO authenticated;
GRANT ALL ON public.authorized_caregivers TO service_role;

ALTER TABLE public.authorized_caregivers ENABLE ROW LEVEL SECURITY;

-- Parents manage caregivers for their own athletes
CREATE POLICY "Parents manage caregivers for their athletes"
ON public.authorized_caregivers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.attendees a
    WHERE a.id = authorized_caregivers.attendee_id
      AND a.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.attendees a
    WHERE a.id = authorized_caregivers.attendee_id
      AND a.owner_id = auth.uid()
  )
);

-- Coaches can read caregivers for athletes registered in their camps
CREATE POLICY "Coaches read caregivers for their camp athletes"
ON public.authorized_caregivers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.camps c ON c.id = r.camp_id
    WHERE r.attendee_id = authorized_caregivers.attendee_id
      AND c.owner_id = auth.uid()
  )
);

CREATE TRIGGER authorized_caregivers_updated_at
BEFORE UPDATE ON public.authorized_caregivers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
