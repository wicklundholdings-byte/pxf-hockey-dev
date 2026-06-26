
-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link_to text,
  related_id uuid,
  payment_amount_cents integer,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- Extend private_sessions with parent + payment state
ALTER TABLE public.private_sessions
  ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS booking_request_id uuid REFERENCES public.private_booking_requests(id) ON DELETE SET NULL;

-- Parent can view their own confirmed private sessions
DROP POLICY IF EXISTS "Parent views own private sessions" ON public.private_sessions;
CREATE POLICY "Parent views own private sessions" ON public.private_sessions
  FOR SELECT TO authenticated USING (parent_user_id = auth.uid());

-- Parent can mark own session paid (Pay Now flow)
DROP POLICY IF EXISTS "Parent updates payment on own session" ON public.private_sessions;
CREATE POLICY "Parent updates payment on own session" ON public.private_sessions
  FOR UPDATE TO authenticated USING (parent_user_id = auth.uid()) WITH CHECK (parent_user_id = auth.uid());
