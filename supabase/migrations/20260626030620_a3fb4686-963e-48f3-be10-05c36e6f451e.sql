ALTER TABLE public.private_booking_requests
  ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_booking_requests_parent_user ON public.private_booking_requests(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_conversation ON public.private_booking_requests(conversation_id);

-- Let parents view their own booking requests
DROP POLICY IF EXISTS "Parent views own booking requests" ON public.private_booking_requests;
CREATE POLICY "Parent views own booking requests"
  ON public.private_booking_requests FOR SELECT
  TO authenticated
  USING (parent_user_id = auth.uid());