-- 032: Parent profile fields
-- Adds contact/emergency/address columns to profiles for parent onboarding

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone                        TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name       TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone      TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation   TEXT,
  ADD COLUMN IF NOT EXISTS address_line1                TEXT,
  ADD COLUMN IF NOT EXISTS address_city                 TEXT,
  ADD COLUMN IF NOT EXISTS address_province             TEXT,
  ADD COLUMN IF NOT EXISTS address_postal               TEXT;
