-- ============================================================
-- PXF Hockey — Migration 015: Full camps schema
--
-- Adds missing columns to camps table used by events.tsx
-- and creates camp_templates, camp_media, camp_invites tables.
-- ============================================================

-- ─── CAMPS: missing columns ───────────────────────────────────
-- `name` mirrors `title` — events.tsx inserts both; dashboard reads `name`
ALTER TABLE camps ADD COLUMN IF NOT EXISTS name TEXT;
-- Back-fill name from title for existing rows
UPDATE camps SET name = title WHERE name IS NULL AND title IS NOT NULL;

-- Time of day for the event (e.g. '09:00')
ALTER TABLE camps ADD COLUMN IF NOT EXISTS event_time TEXT;

-- Public vs invite-only
ALTER TABLE camps ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- For private sessions: per-session price separate from total
ALTER TABLE camps ADD COLUMN IF NOT EXISTS price_per_session_cents INT DEFAULT 0;

-- JSON list of invitee objects {name, email, phone, playerId}
ALTER TABLE camps ADD COLUMN IF NOT EXISTS invite_list JSONB DEFAULT '[]'::jsonb;

-- Media
ALTER TABLE camps ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Structured registration requirements {waiver, payment, notes, ...}
ALTER TABLE camps ADD COLUMN IF NOT EXISTS registration_requirements JSONB DEFAULT '{}'::jsonb;

-- Private-session athlete info
ALTER TABLE camps ADD COLUMN IF NOT EXISTS athlete_name TEXT;
ALTER TABLE camps ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES players(id) ON DELETE SET NULL;

-- Schedule config for recurring camps {dates:[...]} | {interval:N} | {days:[...]}
ALTER TABLE camps ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}'::jsonb;

-- Schedule pattern: consecutive | alternating | weekly | custom
ALTER TABLE camps ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'consecutive'
  CHECK (schedule_type IN ('consecutive', 'alternating', 'weekly', 'custom'));

-- ─── CAMP_TEMPLATES ───────────────────────────────────────────
-- Reusable camp/session/private blueprints saved by the coach
CREATE TABLE IF NOT EXISTS camp_templates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                    TEXT NOT NULL DEFAULT 'camp'
                            CHECK (type IN ('camp', 'session', 'private')),
  title                   TEXT NOT NULL,
  description             TEXT,
  price_cents             INT DEFAULT 0,
  price_per_session_cents INT,
  max_spots               INT,
  schedule_type           TEXT CHECK (schedule_type IN ('consecutive', 'alternating', 'weekly', 'custom')),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE camp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach owns templates"
  ON camp_templates FOR ALL
  USING (coach_id = auth.uid());

-- ─── CAMP_MEDIA ───────────────────────────────────────────────
-- Video/image library reusable across camps
CREATE TABLE IF NOT EXISTS camp_media (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video', 'image')),
  url        TEXT NOT NULL,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE camp_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach owns media"
  ON camp_media FOR ALL
  USING (coach_id = auth.uid());

-- ─── CAMP_INVITES ─────────────────────────────────────────────
-- Per-recipient invite records for invite-only camps/sessions
CREATE TABLE IF NOT EXISTS camp_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id    UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  player_id  UUID REFERENCES players(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE camp_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach owns invites"
  ON camp_invites FOR ALL
  USING (
    camp_id IN (SELECT id FROM camps WHERE coach_id = auth.uid())
  );
