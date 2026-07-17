-- ============================================================
-- PXF Hockey — Migration 003: Messaging System
-- Run this in Supabase SQL Editor AFTER 002_schema_updates.sql
-- ============================================================

-- ─── MESSAGE THREADS ────────────────────────────────────────
-- A thread groups messages between participants.
-- kind: 'team' = broadcast to team, 'direct' = 1:1 between coach and player/parent
CREATE TABLE IF NOT EXISTS message_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL DEFAULT 'direct',    -- 'team' | 'direct'
  name        TEXT,                              -- display name for the thread (e.g. team name, or parent name)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MESSAGES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── THREAD PARTICIPANTS ─────────────────────────────────────
-- Tracks who is in a direct message thread
CREATE TABLE IF NOT EXISTS thread_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  UNIQUE(thread_id, user_id)
);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE message_threads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;

-- Coaches can see threads they own
CREATE POLICY "coaches_own_threads" ON message_threads
  FOR ALL USING (auth.uid() = coach_id);

-- Messages are visible to coach who owns the thread
CREATE POLICY "coaches_read_messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = messages.thread_id
        AND t.coach_id = auth.uid()
    )
  );

-- Participants can see their threads
CREATE POLICY "participants_own_rows" ON thread_participants
  FOR ALL USING (auth.uid() = user_id);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_threads_coach      ON message_threads(coach_id);
CREATE INDEX IF NOT EXISTS idx_threads_team       ON message_threads(team_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread    ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created   ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_thread ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_participants_user   ON thread_participants(user_id);

-- ─── TRIGGER: update thread.updated_at on new message ────────
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads SET updated_at = NOW() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_update_thread
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_timestamp();
