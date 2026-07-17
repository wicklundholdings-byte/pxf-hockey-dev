-- Migration 029: Add is_template flag to sessions
-- Sessions with is_template = true are practice plan templates (live in Playbook → Practices)
-- Sessions with is_template = false are real scheduled events (camps, team practices, etc.)

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- RLS: coaches can manage their own template sessions (already covered by existing policy)
-- No change needed to RLS — existing "coaches_manage_sessions" covers this
