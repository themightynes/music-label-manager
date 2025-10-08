-- 0001_add_tier_unlock_history.sql
-- Adds tier_unlock_history column to game_states for tracking unlock weeks

ALTER TABLE game_states
ADD COLUMN IF NOT EXISTS tier_unlock_history JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN game_states.tier_unlock_history IS 'Tracks when each access tier was unlocked, storing week numbers';
