-- ================================================
-- Migration: Update tables for SheetDB integration
-- ================================================
-- Run this in your Supabase SQL Editor

-- 1. Add contact_emails column to audiences table
ALTER TABLE audiences
ADD COLUMN IF NOT EXISTS contact_emails JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_audiences_contact_emails ON audiences USING GIN (contact_emails);

-- 2. Make contact_id nullable in campaign_recipients (since we use emails from SheetDB)
ALTER TABLE campaign_recipients
ALTER COLUMN contact_id DROP NOT NULL;

-- 3. Add new columns to campaign_recipients for SheetDB data
ALTER TABLE campaign_recipients
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS company TEXT;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Updated tables for SheetDB integration';
END $$;
