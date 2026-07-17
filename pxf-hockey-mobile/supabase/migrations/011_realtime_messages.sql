-- ============================================================
-- PXF Hockey — Migration 011: Enable real-time for messages
--
-- Adds the messages and message_threads tables to the
-- supabase_realtime publication so that postgres_changes
-- subscriptions in the inbox screens receive live updates.
-- ============================================================

-- Enable replica identity so real-time payload includes full row
ALTER TABLE messages        REPLICA IDENTITY FULL;
ALTER TABLE message_threads REPLICA IDENTITY FULL;

-- Add to the realtime publication (safe to run multiple times)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;
