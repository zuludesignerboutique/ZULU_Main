-- Migration 002: Create newsletter_campaigns table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,           -- Internal name: "Summer Sale 2026"
  subject         VARCHAR(300) NOT NULL,           -- Email subject line
  content_html    TEXT NOT NULL,                   -- Full HTML email body
  audience_type   VARCHAR(50) NOT NULL DEFAULT 'all_subscribers',
                   -- 'all_subscribers' | 'selected' | 'users_opted_in'
  audience_ids    INTEGER[] DEFAULT '{}',          -- For 'selected' audience
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sending','sent','failed','cancelled')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  sent_at         TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON newsletter_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON newsletter_campaigns (created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON newsletter_campaigns (created_by);