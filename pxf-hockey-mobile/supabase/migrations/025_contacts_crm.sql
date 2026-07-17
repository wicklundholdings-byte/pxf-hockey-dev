-- ============================================================
-- Migration 025: Contacts CRM — schema + auto-populate
-- ============================================================

-- ── 1. Extend contacts table ──────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS stage            text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS source           text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS skill_level_coach text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags             text[] DEFAULT '{}';

-- Migrate old status/type data to stage
UPDATE contacts SET stage = 'enrolled' WHERE type = 'parent' AND status = 'active';

-- Constraints
ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_stage_check,
  ADD  CONSTRAINT contacts_stage_check
    CHECK (stage IN ('lead', 'enrolled', 'alumni'));

ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_source_check,
  ADD  CONSTRAINT contacts_source_check
    CHECK (source IN ('manual', 'camp_registration', 'referral'));

ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_skill_level_coach_check,
  ADD  CONSTRAINT contacts_skill_level_coach_check
    CHECK (skill_level_coach IN ('beginner', 'intermediate', 'advanced', 'elite') OR skill_level_coach IS NULL);

-- Unique: one contact per email per coach
CREATE UNIQUE INDEX IF NOT EXISTS contacts_coach_email_uniq
  ON contacts (coach_id, LOWER(email))
  WHERE email IS NOT NULL;

-- ── 2. contact_children table ────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_children (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          uuid        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  coach_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text        NOT NULL,
  birthdate           date        DEFAULT NULL,
  position            text        DEFAULT NULL,  -- 'forward' | 'defense' | 'goalie'
  skill_level_parent  text        DEFAULT NULL,  -- what parent says
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_own_contact_children"
  ON contact_children FOR ALL
  USING  (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE INDEX IF NOT EXISTS contact_children_contact_idx ON contact_children(contact_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON contact_children TO authenticated;

-- ── 3. Auto-populate trigger from camp_registrations ─────────
CREATE OR REPLACE FUNCTION sync_contact_from_registration()
RETURNS TRIGGER AS $$
DECLARE
  v_coach_id   uuid;
  v_contact_id uuid;
BEGIN
  -- Get the coach who owns this camp
  SELECT coach_id INTO v_coach_id
  FROM camps WHERE id = NEW.camp_id;

  IF v_coach_id IS NULL OR NEW.parent_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find existing contact for this coach + email
  SELECT id INTO v_contact_id
  FROM contacts
  WHERE coach_id = v_coach_id
    AND LOWER(email) = LOWER(NEW.parent_email)
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    -- New contact — create from registration data
    INSERT INTO contacts (
      coach_id, full_name, email, stage, source
    ) VALUES (
      v_coach_id,
      COALESCE(NULLIF(TRIM(NEW.parent_name), ''), 'Unknown Parent'),
      LOWER(TRIM(NEW.parent_email)),
      'enrolled',
      'camp_registration'
    );
  ELSE
    -- Existing contact — upgrade stage (lead → enrolled, but don't downgrade alumni)
    UPDATE contacts
    SET stage = CASE
      WHEN stage = 'alumni' THEN 'alumni'
      ELSE 'enrolled'
    END
    WHERE id = v_contact_id
      AND stage != 'alumni';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_contact_from_registration ON camp_registrations;
CREATE TRIGGER trg_sync_contact_from_registration
  AFTER INSERT OR UPDATE OF status ON camp_registrations
  FOR EACH ROW
  WHEN (NEW.parent_email IS NOT NULL)
  EXECUTE FUNCTION sync_contact_from_registration();
