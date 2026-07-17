-- ============================================================
-- PXF Hockey — Migration 004: V1 App Schema Patch
-- Adds columns the mobile app expects that were missing
-- from the initial schema design
-- ============================================================

-- ============================================================
-- SESSIONS: add missing columns
-- ============================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_complete          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_duration_minutes int,
  ADD COLUMN IF NOT EXISTS date                 date,
  ADD COLUMN IF NOT EXISTS time                 time,
  ADD COLUMN IF NOT EXISTS main_focus           text[];

-- ============================================================
-- DRILLS: add missing columns
-- ============================================================
ALTER TABLE public.drills
  ADD COLUMN IF NOT EXISTS is_published     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'elite'));

-- ============================================================
-- DRILL CATEGORIES: add 'title' as alias for 'name'
-- (app queries drill_categories(title) via Supabase join)
-- ============================================================
ALTER TABLE public.drill_categories
  ADD COLUMN IF NOT EXISTS title text;

UPDATE public.drill_categories SET title = name WHERE title IS NULL;
