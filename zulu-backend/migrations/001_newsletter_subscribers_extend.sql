-- Migration 001: Extend newsletter_subscribers table
-- Run in Supabase SQL Editor

-- Add new columns to existing newsletter_subscribers table
ALTER TABLE newsletter_subscribers 
  ADD COLUMN IF NOT EXISTS name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_user_id ON newsletter_subscribers (user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_is_active ON newsletter_subscribers (is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers (unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at ON newsletter_subscribers (subscribed_at);