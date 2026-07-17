-- ============================================================
-- PXF Hockey — Migration 010: Add type column to camps
--
-- enrollment/[id].tsx queries camps.type but the column was
-- missing from the mobile migration schema (it existed only in
-- the Lovable web schema). Adding it here with safe defaults.
-- ============================================================

ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'camp'
    CHECK (type IN ('camp', 'clinic', 'showcase', 'tryout'));

COMMENT ON COLUMN camps.type IS 'camp | clinic | showcase | tryout';
