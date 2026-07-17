-- ============================================================
-- Migration 026: Instructor rates
-- ============================================================
-- staff_members.hourly_rate      — default session/hourly rate for this person
-- instructor_assignments.rate_per_hour — override rate for a specific assignment
-- instructor_assignments.hours   — duration of the assignment (default 1.0)
-- ============================================================

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2) DEFAULT NULL;

ALTER TABLE instructor_assignments
  ADD COLUMN IF NOT EXISTS rate_per_hour numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hours          numeric(4,2)  NOT NULL DEFAULT 1.0;
