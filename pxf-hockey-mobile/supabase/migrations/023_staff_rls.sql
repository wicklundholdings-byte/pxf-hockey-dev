-- ============================================================
-- Migration 023: Staff RLS Policies
-- ============================================================
-- Allows staff members (profiles.role = 'staff') to read:
--   1. Their own instructor_assignments record
--   2. The camps and sessions those assignments reference
--   3. Basic profile info for the owner coach (for display)
--
-- Staff cannot write to any of these tables — read-only.
-- All writes still go through the owner (owner_id = auth.uid()).
-- ============================================================

-- Helper: get the staff_member_id for the current user
-- Used in all staff read policies below
-- (Inline subquery is intentional — avoids a function dependency)

-- ── instructor_assignments: staff can read their own ─────────
DROP POLICY IF EXISTS "staff_read_own_assignments" ON instructor_assignments;
CREATE POLICY "staff_read_own_assignments"
  ON instructor_assignments FOR SELECT
  USING (
    -- Owner sees all their assignments (existing behavior)
    owner_id = auth.uid()
    OR
    -- Staff sees assignments where they are the staff member
    staff_member_id = (
      SELECT staff_member_id FROM profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- ── camps: staff can read camps they're assigned to ──────────
DROP POLICY IF EXISTS "staff_read_assigned_camps" ON camps;
CREATE POLICY "staff_read_assigned_camps"
  ON camps FOR SELECT
  USING (
    -- Owner sees their own camps (existing behavior)
    coach_id = auth.uid()
    OR
    -- Staff sees camps they have an assignment for
    id IN (
      SELECT ia.entity_id
      FROM instructor_assignments ia
      JOIN profiles p ON p.staff_member_id = ia.staff_member_id
      WHERE p.id = auth.uid()
        AND ia.entity_type = 'camp'
    )
    OR
    -- Manager/Admin staff see ALL camps belonging to their owner
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_members sm ON sm.id = p.staff_member_id
      WHERE p.id = auth.uid()
        AND sm.owner_id = camps.coach_id
        AND sm.app_role IN ('admin', 'manager')
    )
  );

-- ── sessions: staff can read sessions they're assigned to ────
DROP POLICY IF EXISTS "staff_read_assigned_sessions" ON sessions;
CREATE POLICY "staff_read_assigned_sessions"
  ON sessions FOR SELECT
  USING (
    -- Owner sees their own sessions
    coach_id = auth.uid()
    OR
    -- Instructor: only assigned sessions
    id IN (
      SELECT ia.entity_id
      FROM instructor_assignments ia
      JOIN profiles p ON p.staff_member_id = ia.staff_member_id
      WHERE p.id = auth.uid()
        AND ia.entity_type = 'session'
    )
    OR
    -- Manager/Admin: all sessions for their owner
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_members sm ON sm.id = p.staff_member_id
      WHERE p.id = auth.uid()
        AND sm.owner_id = sessions.coach_id
        AND sm.app_role IN ('admin', 'manager')
    )
  );

-- ── profiles: staff can read their owner's basic profile ─────
-- (needed to show the org name, coach name in the staff UI)
DROP POLICY IF EXISTS "staff_read_owner_profile" ON profiles;
CREATE POLICY "staff_read_owner_profile"
  ON profiles FOR SELECT
  USING (
    -- Own profile (existing behavior)
    id = auth.uid()
    OR
    -- Staff can read their owner's profile
    id = (
      SELECT sm.owner_id
      FROM profiles p
      JOIN staff_members sm ON sm.id = p.staff_member_id
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );

-- ── teams: manager/admin staff see owner's teams ─────────────
DROP POLICY IF EXISTS "staff_read_owner_teams" ON teams;
CREATE POLICY "staff_read_owner_teams"
  ON teams FOR SELECT
  USING (
    -- Owner sees their own teams
    coach_id = auth.uid()
    OR
    -- Manager/Admin staff see all teams
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN staff_members sm ON sm.id = p.staff_member_id
      WHERE p.id = auth.uid()
        AND sm.owner_id = teams.coach_id
        AND sm.app_role IN ('admin', 'manager')
    )
  );
