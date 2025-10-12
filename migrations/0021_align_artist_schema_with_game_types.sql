-- Migration: Align Artist Schema with GameArtist Type
-- Purpose: Add missing properties from JSON source data and fix property name mismatches
-- Date: 2025-10-09
-- Related: SCHEMA_TYPE_DEPENDENCY_ANALYSIS.md

-- This migration brings the database schema into alignment with the authoritative
-- game content source (data/artists.json) by:
-- 1. Adding missing columns that exist in JSON but not in database
-- 2. Renaming columns for consistency with GameArtist type
-- 3. Enabling full preservation of artist data through the persistence layer

BEGIN;

-- ============================================================================
-- STEP 1: Add Missing Columns
-- ============================================================================
-- These properties exist in data/artists.json and are used by the UI,
-- but were not included in the original database schema.

-- Add temperament (used for personality display in UI)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artists' AND column_name = 'temperament'
  ) THEN
    ALTER TABLE artists ADD COLUMN temperament INTEGER;
    COMMENT ON COLUMN artists.temperament IS 'Artist personality/temperament rating (0-100). Used in UI to display artist characteristics.';

    -- Set default value for existing artists (median temperament from JSON data)
    UPDATE artists SET temperament = 70 WHERE temperament IS NULL;

    -- Add constraint to match other artist attributes
    ALTER TABLE artists ADD CONSTRAINT artists_temperament_check
      CHECK (temperament >= 0 AND temperament <= 100);
  END IF;
END $$;

-- Add signingCost (used in artist signing financial transactions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artists' AND column_name = 'signing_cost'
  ) THEN
    ALTER TABLE artists ADD COLUMN signing_cost INTEGER;
    COMMENT ON COLUMN artists.signing_cost IS 'One-time cost to sign artist to roster. Used in discovery UI and financial tracking.';

    -- Note: Existing artists are already signed, so signing_cost is historical.
    -- We cannot recover lost data, but new artists will preserve this value.
  END IF;
END $$;

-- Add bio (used in artist detail pages and cards)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artists' AND column_name = 'bio'
  ) THEN
    ALTER TABLE artists ADD COLUMN bio TEXT;
    COMMENT ON COLUMN artists.bio IS 'Artist biography/description. Displayed in artist cards and detail pages.';

    -- Note: Existing artists will have NULL bio until manually updated or re-signed.
  END IF;
END $$;

-- Add age (used in artist profile display)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artists' AND column_name = 'age'
  ) THEN
    ALTER TABLE artists ADD COLUMN age INTEGER;
    COMMENT ON COLUMN artists.age IS 'Artist age in years. Displayed in artist profile UI.';

    -- Note: Existing artists will have NULL age until manually updated or re-signed.
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Rename Columns for Consistency
-- ============================================================================
-- These columns exist but use different names than the GameArtist type,
-- causing confusion and requiring workarounds in the codebase.

-- Rename is_signed → signed (to match GameArtist.signed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artists' AND column_name = 'is_signed'
  ) THEN
    ALTER TABLE artists RENAME COLUMN is_signed TO signed;
    COMMENT ON COLUMN artists.signed IS 'Boolean indicating if artist is signed to player roster. Renamed from is_signed for consistency with GameArtist type.';
  END IF;
END $$;

-- Rename weekly_fee → weekly_cost (to match GameArtist.weeklyCost)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artists' AND column_name = 'weekly_fee'
  ) THEN
    ALTER TABLE artists RENAME COLUMN weekly_fee TO weekly_cost;
    COMMENT ON COLUMN artists.weekly_cost IS 'Ongoing weekly salary cost for artist. Renamed from weekly_fee for consistency with GameArtist type.';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Update Drizzle-Generated Constraints (if needed)
-- ============================================================================
-- After column renames, some constraint names may need updating for clarity.
-- This is optional but improves maintainability.

-- Note: Drizzle auto-generates constraint names. If they reference old column names,
-- they can be renamed here. However, PostgreSQL constraint names don't affect
-- functionality, so this is cosmetic.

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify success:

-- Check all artist columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'artists'
-- ORDER BY ordinal_position;

-- Verify temperament constraint:
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'artists_temperament_check';

-- Check for renamed columns:
-- SELECT EXISTS (
--   SELECT 1 FROM information_schema.columns
--   WHERE table_name = 'artists' AND column_name = 'signed'
-- ) as has_signed_column,
-- EXISTS (
--   SELECT 1 FROM information_schema.columns
--   WHERE table_name = 'artists' AND column_name = 'weekly_cost'
-- ) as has_weekly_cost_column;

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================
-- To rollback this migration:
--
-- BEGIN;
-- ALTER TABLE artists DROP COLUMN IF EXISTS temperament;
-- ALTER TABLE artists DROP COLUMN IF EXISTS signing_cost;
-- ALTER TABLE artists DROP COLUMN IF EXISTS bio;
-- ALTER TABLE artists DROP COLUMN IF EXISTS age;
-- ALTER TABLE artists RENAME COLUMN signed TO is_signed;
-- ALTER TABLE artists RENAME COLUMN weekly_cost TO weekly_fee;
-- COMMIT;
--
-- WARNING: Rollback will cause data loss for newly added columns!

-- ============================================================================
-- POST-MIGRATION CODE CHANGES REQUIRED
-- ============================================================================
-- After running this migration, update the following files:
--
-- 1. shared/schema.ts:
--    - Add: temperament, signing_cost, bio, age columns to artists table
--    - Rename: isSigned → signed, weeklyFee → weeklyCost
--
-- 2. server/routes.ts (line 1501):
--    - Remove workaround: weeklyFee: req.body.weeklyCost || req.body.weeklyFee
--    - Replace with: weeklyCost: req.body.weeklyCost
--
-- 3. All code using Artist type:
--    - Replace references to artist.isSigned with artist.signed
--    - Replace references to artist.weeklyFee with artist.weeklyCost
--
-- 4. Run: npm run db:push (to sync Drizzle schema with database)
--
-- This will resolve all TypeScript errors related to artist schema mismatches.
