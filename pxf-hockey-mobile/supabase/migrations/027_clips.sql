-- ============================================================
-- Migration 027: Film library — clips table
-- Stores metadata for recorded coaching clips.
-- local_asset_id = expo-media-library asset ID (on-device)
-- stream_video_id = Cloudflare Stream (future upload)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clips (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name      TEXT,
  player_id        uuid          REFERENCES public.players(id) ON DELETE SET NULL,
  team_id          uuid          REFERENCES public.teams(id) ON DELETE SET NULL,
  category         TEXT          NOT NULL DEFAULT 'other'
                     CHECK (category IN ('skating','shooting','passing','defense','game','other')),
  notes            TEXT,
  duration_seconds NUMERIC,
  local_asset_id   TEXT,          -- expo-media-library asset ID
  stream_video_id  TEXT,          -- Cloudflare Stream video ID (future)
  thumbnail_url    TEXT,          -- Cloudflare thumbnail URL (future)
  created_at       timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clips_coach" ON public.clips;
CREATE POLICY "clips_coach" ON public.clips
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_clips_coach    ON public.clips(coach_id);
CREATE INDEX IF NOT EXISTS idx_clips_player   ON public.clips(player_id);
CREATE INDEX IF NOT EXISTS idx_clips_category ON public.clips(coach_id, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clips TO authenticated;
