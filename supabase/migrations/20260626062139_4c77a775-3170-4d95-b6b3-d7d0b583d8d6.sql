
-- Team payment requests + per-player charges
CREATE TABLE public.team_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('registration','one_off')),
  label text NOT NULL,
  description text,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  due_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_payment_requests_team_idx ON public.team_payment_requests(team_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_payment_requests TO authenticated;
GRANT ALL ON public.team_payment_requests TO service_role;
ALTER TABLE public.team_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages team payment requests"
  ON public.team_payment_requests FOR ALL
  USING (public.is_team_coach(team_id))
  WITH CHECK (public.is_team_coach(team_id));

CREATE POLICY "Parents view team payment requests"
  ON public.team_payment_requests FOR SELECT
  USING (public.is_team_parent(team_id));

CREATE TRIGGER trg_team_payment_requests_updated
  BEFORE UPDATE ON public.team_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-player charges
CREATE TABLE public.team_payment_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.team_payment_requests(id) ON DELETE CASCADE,
  team_player_id uuid NOT NULL REFERENCES public.team_players(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at timestamptz,
  paid_by uuid REFERENCES auth.users(id),
  last_reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, team_player_id)
);
CREATE INDEX team_payment_charges_request_idx ON public.team_payment_charges(request_id);
CREATE INDEX team_payment_charges_player_idx ON public.team_payment_charges(team_player_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_payment_charges TO authenticated;
GRANT ALL ON public.team_payment_charges TO service_role;
ALTER TABLE public.team_payment_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages charges"
  ON public.team_payment_charges FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.team_payment_requests r
    WHERE r.id = request_id AND public.is_team_coach(r.team_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_payment_requests r
    WHERE r.id = request_id AND public.is_team_coach(r.team_id)
  ));

CREATE POLICY "Parents view + pay own charges"
  ON public.team_payment_charges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_players tp
    WHERE tp.id = team_player_id
      AND tp.parent_contact_id IN (SELECT public.current_user_contact_ids())
  ));

CREATE POLICY "Parents update own charge to paid"
  ON public.team_payment_charges FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.team_players tp
    WHERE tp.id = team_player_id
      AND tp.parent_contact_id IN (SELECT public.current_user_contact_ids())
  ));

CREATE TRIGGER trg_team_payment_charges_updated
  BEFORE UPDATE ON public.team_payment_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
