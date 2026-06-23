
ALTER TYPE public.team_permission ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.team_permission ADD VALUE IF NOT EXISTS 'content_creator';

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS home_area_label text,
  ADD COLUMN IF NOT EXISTS home_area_lat double precision,
  ADD COLUMN IF NOT EXISTS home_area_lng double precision;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS min_buffer_minutes integer NOT NULL DEFAULT 30;

CREATE OR REPLACE VIEW public.attendee_payment_status
WITH (security_invoker = on) AS
SELECT
  r.id AS registration_id,
  r.camp_id,
  r.contact_id,
  r.attendee_id,
  r.created_at,
  COALESCE(SUM(pi.amount_cents) FILTER (WHERE pi.status = 'paid'), 0) AS paid_cents,
  COALESCE(SUM(pi.amount_cents), 0) AS total_cents,
  CASE
    WHEN COUNT(pi.id) = 0 THEN 'paid'
    WHEN BOOL_OR(pi.status <> 'paid' AND pi.due_date IS NOT NULL AND pi.due_date < CURRENT_DATE) THEN 'overdue'
    WHEN BOOL_AND(pi.status = 'paid') THEN 'paid'
    ELSE 'pending'
  END AS payment_status
FROM public.registrations r
LEFT JOIN public.payment_installments pi ON pi.registration_id = r.id
GROUP BY r.id;

GRANT SELECT ON public.attendee_payment_status TO authenticated;
