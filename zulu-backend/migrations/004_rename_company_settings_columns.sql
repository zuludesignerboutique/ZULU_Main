-- Migration 004: Rename company_settings columns to camelCase.
-- The application code (model, bill template, and the PUT handler which writes
-- quoted "bankName"/"accountNumber"/etc.) expects camelCase column names, but the
-- original schema created them as snake_case. This aligns an existing database.
-- Idempotent: each rename only runs if the old snake_case column still exists,
-- so a fresh database (already camelCase from schema.postgres.sql) is unaffected.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE company_settings RENAME COLUMN bank_name TO "bankName";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE company_settings RENAME COLUMN account_number TO "accountNumber";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'ifsc_code'
  ) THEN
    ALTER TABLE company_settings RENAME COLUMN ifsc_code TO "ifscCode";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'upi_id'
  ) THEN
    ALTER TABLE company_settings RENAME COLUMN upi_id TO "upiId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'footer_note'
  ) THEN
    ALTER TABLE company_settings RENAME COLUMN footer_note TO "footerNote";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE company_settings RENAME COLUMN logo_url TO "logoUrl";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE company_settings RENAME COLUMN updated_at TO "updatedAt";
  END IF;
END $$;
