
-- Sibling discount percent on camps (defaults to 10% for new camps, 0 for existing if sibling_discount=false)
ALTER TABLE public.camps
  ADD COLUMN IF NOT EXISTS sibling_discount_percent integer NOT NULL DEFAULT 10;

-- Installment schedule rows per registration
CREATE TABLE IF NOT EXISTS public.payment_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  sequence integer NOT NULL,
  amount_cents integer NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled | paid | failed
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, sequence)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_installments TO authenticated;
GRANT ALL ON public.payment_installments TO service_role;

ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage installments"
  ON public.payment_installments
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS payment_installments_reg_idx ON public.payment_installments(registration_id);
CREATE INDEX IF NOT EXISTS payment_installments_owner_idx ON public.payment_installments(owner_id);

CREATE TRIGGER update_payment_installments_updated_at
  BEFORE UPDATE ON public.payment_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link a registration to a group when multiple children booked together
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS booking_group_id uuid,
  ADD COLUMN IF NOT EXISTS sibling_discount_cents integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS registrations_booking_group_idx ON public.registrations(booking_group_id);
