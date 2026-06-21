
-- Phase 1: Custom forms (already exist), Waivers, Promo codes scoped to camps

-- 1. Add inline waiver text + signature requirement to camps
ALTER TABLE public.camps
  ADD COLUMN IF NOT EXISTS waiver_text text,
  ADD COLUMN IF NOT EXISTS waiver_required boolean NOT NULL DEFAULT false;

-- 2. Scope coupons to a specific camp (nullable = owner-wide)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS camp_id uuid REFERENCES public.camps(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coupons_camp ON public.coupons(camp_id);

-- 3. Waiver signatures, one per registration
CREATE TABLE IF NOT EXISTS public.waiver_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  signer_name text NOT NULL,
  signature_method text NOT NULL CHECK (signature_method IN ('drawn','typed')),
  signature_data text NOT NULL,
  waiver_text_snapshot text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waiver_signatures_registration_key
  ON public.waiver_signatures(registration_id);
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_attendee
  ON public.waiver_signatures(attendee_id);
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_camp
  ON public.waiver_signatures(camp_id);

GRANT SELECT, INSERT ON public.waiver_signatures TO authenticated;
GRANT INSERT ON public.waiver_signatures TO anon;
GRANT ALL ON public.waiver_signatures TO service_role;

ALTER TABLE public.waiver_signatures ENABLE ROW LEVEL SECURITY;

-- Coach (camp owner) can view signatures for their camps
CREATE POLICY "Owners view waiver signatures"
  ON public.waiver_signatures FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.camps c
    WHERE c.id = waiver_signatures.camp_id
      AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- Public booking flow inserts the signature (server validates via submitBooking flow)
CREATE POLICY "Anyone can submit a waiver signature"
  ON public.waiver_signatures FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.camps c
      WHERE c.id = waiver_signatures.camp_id
        AND c.status = 'live'
    )
  );
