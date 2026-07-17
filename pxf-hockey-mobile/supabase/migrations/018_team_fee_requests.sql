-- ============================================================
-- Migration 018: Team Fee Requests
-- ============================================================
-- Allows coaches to create custom payment requests for a team
-- (tournament fees, party costs, extra ice, etc.) and track
-- which players/parents have paid.
-- ============================================================

-- ── Fee Requests (one per charge, e.g. "Kelowna Tournament Fee") ──
CREATE TABLE IF NOT EXISTS public.team_fee_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  coach_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  amount      numeric(10,2) NOT NULL CHECK (amount >= 0),
  due_date    date,
  notes       text,
  is_archived boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_fee_requests_team_idx
  ON public.team_fee_requests (team_id);

-- ── Fee Payments (one row per player per fee request) ──────────
CREATE TABLE IF NOT EXISTS public.team_fee_payments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_request_id  uuid        NOT NULL REFERENCES public.team_fee_requests(id) ON DELETE CASCADE,
  player_id       uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
  amount_paid     numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  paid_at         timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fee_request_id, player_id)
);

CREATE INDEX IF NOT EXISTS team_fee_payments_request_idx
  ON public.team_fee_payments (fee_request_id);

CREATE INDEX IF NOT EXISTS team_fee_payments_player_idx
  ON public.team_fee_payments (player_id);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE public.team_fee_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_fee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fee_requests_coach"  ON public.team_fee_requests;
DROP POLICY IF EXISTS "fee_payments_coach"  ON public.team_fee_payments;

-- Coaches own their fee requests
CREATE POLICY "fee_requests_coach"
  ON public.team_fee_requests FOR ALL
  USING     (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Coaches can manage payments for their fee requests
CREATE POLICY "fee_payments_coach"
  ON public.team_fee_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_fee_requests r
      WHERE r.id = team_fee_payments.fee_request_id
        AND r.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_fee_requests r
      WHERE r.id = team_fee_payments.fee_request_id
        AND r.coach_id = auth.uid()
    )
  );

-- ── Grants ──────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_fee_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_fee_payments TO authenticated;
