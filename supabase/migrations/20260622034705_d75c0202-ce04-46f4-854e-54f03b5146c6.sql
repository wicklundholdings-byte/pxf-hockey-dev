-- Restore SELECT on operational columns to authenticated role.
-- The owner-only RLS policy still restricts which rows authenticated users can read for non-live camps,
-- and the primary risk (anon scraping operational settings from public live camps) remains blocked.
GRANT SELECT (reminder_7day, reminder_1day, reminder_morning, absent_alert, absent_alert_minutes, confirmation_sms)
  ON public.camps TO authenticated;