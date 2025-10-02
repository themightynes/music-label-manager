-- Add genre column to artists table
ALTER TABLE artists ADD COLUMN IF NOT EXISTS genre TEXT;
