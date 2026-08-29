-- Migration 003: Create newsletter_settings table for configurable options
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS newsletter_settings (
  key   VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default configuration values
INSERT INTO newsletter_settings (key, value) VALUES
  ('batch_size', '50'),
  ('batch_delay_ms', '1000')
ON CONFLICT (key) DO NOTHING;