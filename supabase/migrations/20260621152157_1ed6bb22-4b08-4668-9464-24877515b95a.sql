-- Move pg_net extension out of public schema (drop + recreate; pg_net doesn't support SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Tighten anon column-level SELECT on camps to exclude internal operational fields
REVOKE SELECT ON public.camps FROM anon;
GRANT SELECT (
  id, format, name, slug, description, hero_image, tags, featured,
  location_type, venue_name, address, start_date, end_date, start_time, end_time,
  timezone, price_cents, capacity, show_remaining,
  early_bird_price_cents, early_bird_expires_at,
  sibling_discount, sibling_discount_percent, payment_plan,
  waiver_url, waiver_required, waiver_text,
  status, created_at, updated_at
) ON public.camps TO anon;

-- Allow public to read camp_sessions for live camps (needed by booking pages)
GRANT SELECT ON public.camp_sessions TO anon;
CREATE POLICY "Public can view sessions for live camps"
ON public.camp_sessions FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.camps c
    WHERE c.id = camp_sessions.camp_id AND c.status = 'live'
  )
);

-- Restrict messages UPDATE to only body and pinned columns
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (body, pinned) ON public.messages TO authenticated;