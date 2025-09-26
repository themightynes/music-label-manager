-- Add awareness system columns to songs table
-- These columns support cultural penetration tracking and breakthrough mechanics

-- Add awareness column to track current cultural penetration (0-100 scale)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS awareness INTEGER DEFAULT 0;

-- Add breakthrough_achieved column to track if song achieved cultural breakthrough
ALTER TABLE songs ADD COLUMN IF NOT EXISTS breakthrough_achieved BOOLEAN DEFAULT FALSE;

-- Add peak_awareness column to store historical peak awareness for analytics
ALTER TABLE songs ADD COLUMN IF NOT EXISTS peak_awareness INTEGER DEFAULT 0;

-- Add awareness_decay_rate column to store custom decay rate (breakthrough songs decay slower)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS awareness_decay_rate REAL DEFAULT 0.05;

-- Set NOT NULL constraints on new columns after defaults are established
ALTER TABLE songs ALTER COLUMN awareness SET NOT NULL;
ALTER TABLE songs ALTER COLUMN breakthrough_achieved SET NOT NULL;
ALTER TABLE songs ALTER COLUMN peak_awareness SET NOT NULL;
ALTER TABLE songs ALTER COLUMN awareness_decay_rate SET NOT NULL;

-- Add CHECK constraints to enforce data integrity bounds
DO $$ BEGIN
 ALTER TABLE songs ADD CONSTRAINT songs_awareness_range CHECK (awareness BETWEEN 0 AND 100);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE songs ADD CONSTRAINT songs_peak_awareness_range CHECK (peak_awareness BETWEEN 0 AND 100);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE songs ADD CONSTRAINT songs_awareness_decay_range CHECK (awareness_decay_rate >= 0 AND awareness_decay_rate <= 1);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add performance index for awareness-based queries
CREATE INDEX IF NOT EXISTS "idx_songs_awareness_queries" ON songs ("game_id", "awareness" DESC, "breakthrough_achieved") WHERE "is_released" = true;

-- Add comments to document the awareness system columns
COMMENT ON COLUMN songs.awareness IS 'Current cultural penetration level (0-100 scale)';
COMMENT ON COLUMN songs.breakthrough_achieved IS 'Whether song has achieved cultural breakthrough status';
COMMENT ON COLUMN songs.peak_awareness IS 'Historical peak awareness value for analytics tracking';
COMMENT ON COLUMN songs.awareness_decay_rate IS 'Custom decay rate per week (breakthrough songs have lower rates)';