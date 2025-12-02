-- ================================================
-- Migration: Add notes field to contacts table
-- ================================================
-- Run this in your Supabase SQL Editor to add the notes column

-- Add notes column to contacts table (for storing form messages)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added notes field to contacts table';
END $$;
