-- ================================================
-- Migration: Add new contact fields for extended SheetDB schema
-- ================================================
-- Run this in your Supabase SQL Editor to add new columns

-- Add new columns to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS labels TEXT,
ADD COLUMN IF NOT EXISTS language TEXT;

-- Add deleted_records column to sync_log if it doesn't exist
ALTER TABLE sync_log
ADD COLUMN IF NOT EXISTS deleted_records INTEGER DEFAULT 0;

-- Create indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_city ON contacts(city);
CREATE INDEX IF NOT EXISTS idx_contacts_country ON contacts(country);

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added new contact fields (first_name, last_name, phone, company, city, state, zip, country, labels, language)';
END $$;
