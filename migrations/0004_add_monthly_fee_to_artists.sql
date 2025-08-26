-- Add monthlyFee column to artists table
-- This migration adds the monthlyFee field that was added to the schema but not migrated to the database

ALTER TABLE "artists" ADD COLUMN "monthly_fee" integer DEFAULT 1200;

-- Create index for performance on monthly fee calculations
CREATE INDEX IF NOT EXISTS "idx_artists_monthly_fee" ON "artists" ("game_id", "monthly_fee") WHERE "is_signed" = true;