-- Migration: Rename artist loyalty to energy
-- Purpose: Rebrand artist loyalty system as energy for clearer gameplay mechanics
-- IMPORTANT: This only affects the artists table, NOT the executives table

BEGIN;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'loyalty'
  ) THEN
    ALTER TABLE artists RENAME COLUMN loyalty TO energy;
  END IF;
END $$;
COMMIT;
