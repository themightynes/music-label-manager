-- Separate Recording and Releasing Migration
-- This migration adds timestamp fields to track when songs are recorded vs released
-- Supports the new Plan Release feature by separating recording completion from actual release

-- Add timestamp columns for tracking recording and release events
ALTER TABLE "songs" ADD COLUMN "recorded_at" TIMESTAMP;
ALTER TABLE "songs" ADD COLUMN "released_at" TIMESTAMP;

-- Backfill existing data:
-- Set recorded_at = created_at for all songs where is_recorded = true
UPDATE "songs" 
SET "recorded_at" = "created_at" 
WHERE "is_recorded" = true;

-- Set released_at = created_at for all songs where is_released = true  
UPDATE "songs"
SET "released_at" = "created_at"
WHERE "is_released" = true;

-- For the new system, reset all existing songs to unreleased state
-- This allows the Plan Release feature to handle actual releasing
-- Revenue and streaming data will be preserved but songs become available for strategic release
UPDATE "songs" 
SET "is_released" = false,
    "release_id" = NULL
WHERE "is_released" = true;

-- Add indexes for performance on the new timestamp fields
CREATE INDEX IF NOT EXISTS "idx_songs_recorded_at" ON "songs" ("recorded_at") WHERE "recorded_at" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_songs_released_at" ON "songs" ("released_at") WHERE "released_at" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_songs_recording_status" ON "songs" ("is_recorded", "is_released", "recorded_at");

-- Add constraint to ensure released_at is set when is_released = true
-- This will be enforced going forward (existing data grandfathered)
-- Note: We'll add this constraint in a future migration once Plan Release is implemented