-- ============================================================
-- Migration 022: Staff App Access
-- ============================================================
-- Extends staff_members to support actual app logins with
-- role-based permissions. Separate from job titles.
--
-- app_role values:
--   admin       → Full access except billing/staff management
--   manager     → Camps, schedule, teams, contacts, campaigns. No financials.
--   instructor  → Own assignments: camps, schedule, teams, playbook, inbox, film
--   front_desk  → Camp check-in, contacts (view), inbox
--   null        → No app access (contact/assignment only)
--
-- status values:
--   contact  → Added for assignment purposes only, no invite sent
--   invited  → Invite email sent, not yet signed up
--   active   → Signed up and active
--   inactive → Deactivated
-- ============================================================

-- ── Extend staff_members ────────────────────────────────────
ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS app_role   text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status     text        NOT NULL DEFAULT 'contact',
  ADD COLUMN IF NOT EXISTS invited_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS joined_at  timestamptz DEFAULT NULL;

-- Constrain valid values
ALTER TABLE staff_members
  DROP CONSTRAINT IF EXISTS staff_members_app_role_check,
  ADD  CONSTRAINT staff_members_app_role_check
    CHECK (app_role IN ('admin', 'manager', 'instructor', 'front_desk') OR app_role IS NULL);

ALTER TABLE staff_members
  DROP CONSTRAINT IF EXISTS staff_members_status_check,
  ADD  CONSTRAINT staff_members_status_check
    CHECK (status IN ('contact', 'invited', 'active', 'inactive'));

-- ── Link profiles → staff_members ───────────────────────────
-- When a staff member signs up via invite link, their profile
-- gets this FK so the app knows which owner's data to scope them to.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS staff_member_id uuid REFERENCES staff_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_staff_member_id_idx
  ON profiles (staff_member_id)
  WHERE staff_member_id IS NOT NULL;

-- ── RLS: staff can read their owner's data ───────────────────
-- Staff members (role='staff' on profiles) need SELECT access
-- to their owner's staff_members record to get owner_id for scoping.
-- The existing policy only allows owner_id = auth.uid(), so we add
-- a read policy for staff viewing their own record.
DROP POLICY IF EXISTS "staff_members_self_read" ON staff_members;
CREATE POLICY "staff_members_self_read"
  ON staff_members FOR SELECT
  USING (
    -- Owner can always see their staff
    owner_id = auth.uid()
    OR
    -- Staff can read their own record (to get owner_id for scoping)
    id = (
      SELECT staff_member_id FROM profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  );
