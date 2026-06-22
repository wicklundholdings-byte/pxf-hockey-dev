-- 1) Camps: revoke SELECT on operational columns from anon/authenticated.
--    Owner reads (via the owner-only policy) still work through service/auth role
--    on the full row, but PostgREST honors column privileges for anon/authenticated.
REVOKE SELECT (reminder_7day, reminder_1day, reminder_morning, absent_alert, absent_alert_minutes, confirmation_sms)
  ON public.camps FROM anon;
REVOKE SELECT (reminder_7day, reminder_1day, reminder_morning, absent_alert, absent_alert_minutes, confirmation_sms)
  ON public.camps FROM authenticated;

-- Re-grant SELECT on these operational columns to the owner via a dedicated policy
-- (column privileges below would otherwise block owners too). Owners read camps
-- through their existing "owner" policy; column privileges are role-wide, so we
-- give the owner role explicit access via service_role which the owner-side server
-- functions already use, and authenticated owners read non-operational columns only
-- from the client. The coach UI reads operational fields server-side, where it
-- uses the owner's authenticated context but only needs these columns from server
-- functions; keep them accessible to service_role.
GRANT SELECT (reminder_7day, reminder_1day, reminder_morning, absent_alert, absent_alert_minutes, confirmation_sms)
  ON public.camps TO service_role;

-- 2) Messages: lock down UPDATE to just (body, pinned) for authenticated senders.
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (body, pinned) ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- Replace the existing UPDATE policy with one that includes a WITH CHECK clause
-- so the sender cannot reassign sender_id or move the message to another conversation.
DROP POLICY IF EXISTS "Senders update own messages" ON public.messages;
CREATE POLICY "Senders update own messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());