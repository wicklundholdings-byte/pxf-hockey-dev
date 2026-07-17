-- ============================================================
-- Migration 015: Staff Members + Instructor Assignments
-- ============================================================
-- staff_members: coaches an Elite Coach can assign to events.
--   is_self = true  → the coach themselves (auto-created on first use)
--   is_self = false → external staff (to be added via Staff Management)
--
-- instructor_assignments: polymorphic join table.
--   entity_type: 'camp' | 'session' | 'camp_day_activity' | 'private'
--   entity_id:   UUID of the related row
-- ============================================================

-- ── staff_members ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  role        text        NOT NULL DEFAULT 'head_coach',
  -- head_coach | assistant | trainer | goalie_coach | skills | guest
  is_self     boolean     NOT NULL DEFAULT false,
  email       text,
  phone       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Each owner can only have one is_self record
CREATE UNIQUE INDEX IF NOT EXISTS staff_members_self_idx
  ON staff_members (owner_id)
  WHERE is_self = true;

-- ── instructor_assignments ──────────────────────────────────
CREATE TABLE IF NOT EXISTS instructor_assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type     text        NOT NULL,  -- 'camp' | 'session' | 'camp_day_activity'
  entity_id       uuid        NOT NULL,
  staff_member_id uuid        NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, staff_member_id)
);

CREATE INDEX IF NOT EXISTS instructor_assignments_entity_idx
  ON instructor_assignments (entity_type, entity_id);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE staff_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_members_own"          ON staff_members;
DROP POLICY IF EXISTS "instructor_assignments_own" ON instructor_assignments;

CREATE POLICY "staff_members_own"
  ON staff_members FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "instructor_assignments_own"
  ON instructor_assignments FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── Grants ─────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_members          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON instructor_assignments TO authenticated;
