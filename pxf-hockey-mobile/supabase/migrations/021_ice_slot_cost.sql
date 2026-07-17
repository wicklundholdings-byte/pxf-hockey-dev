-- ============================================================
-- Migration 021: Add cost to ice_slots
-- Tracks the ice rental cost per slot for P&L calculations.
-- Costs roll up to linked camps and teams via allocated_to_id.
-- ============================================================

ALTER TABLE public.ice_slots
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ice_slots.cost IS
  'Ice rental cost for this slot in the coach''s local currency. Used for camp/team P&L.';
