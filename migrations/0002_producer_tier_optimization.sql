-- Database Optimization for Producer Tier and Time Investment Systems
-- This migration adds indexes, constraints, and performance enhancements for Phase 2 features

-- 1. DATA INTEGRITY CONSTRAINTS
-- Add check constraints for producer tier validation
ALTER TABLE "songs" ADD CONSTRAINT "songs_producer_tier_check" 
  CHECK ("producer_tier" IN ('local', 'regional', 'national', 'legendary'));

-- Add check constraints for time investment validation  
ALTER TABLE "songs" ADD CONSTRAINT "songs_time_investment_check"
  CHECK ("time_investment" IN ('rushed', 'standard', 'extended', 'perfectionist'));

-- Add check constraint for quality range
ALTER TABLE "songs" ADD CONSTRAINT "songs_quality_range_check"
  CHECK ("quality" >= 20 AND "quality" <= 100);

-- Add check constraint for reputation range (critical for producer unlocks)
ALTER TABLE "game_states" ADD CONSTRAINT "game_states_reputation_range_check"
  CHECK ("reputation" >= 0 AND "reputation" <= 100);

-- 2. HIGH-FREQUENCY QUERY INDEXES
-- Critical index for producer availability checks (Query Pattern #1)
-- Used in UI to determine available producer tiers based on reputation
CREATE INDEX "idx_game_states_reputation_lookup" ON "game_states" ("id", "reputation");

-- Primary song catalog index for filtering and portfolio analysis (Query Pattern #2)
-- Supports: WHERE game_id = ? AND is_recorded = true GROUP BY producer_tier, time_investment
CREATE INDEX "idx_songs_portfolio_analysis" ON "songs" ("game_id", "is_recorded", "producer_tier", "time_investment");

-- Monthly quality processing index (Query Pattern #3)
-- Supports: WHERE game_id = ? AND created_month = ? for song generation
CREATE INDEX "idx_songs_monthly_processing" ON "songs" ("game_id", "created_month") 
  WHERE "created_month" IS NOT NULL;

-- 3. MEDIUM-FREQUENCY QUERY INDEXES  
-- Artist production history index (Query Pattern #4)
-- Supports: WHERE artist_id = ? AND is_released = true ORDER BY created_month DESC
CREATE INDEX "idx_songs_artist_history" ON "songs" ("artist_id", "is_released", "created_month" DESC)
  WHERE "is_released" = true;

-- Performance analytics index (Query Pattern #5)
-- Supports: WHERE game_id = ? AND is_released = true GROUP BY producer_tier
CREATE INDEX "idx_songs_tier_performance" ON "songs" ("game_id", "is_released", "producer_tier", "total_revenue", "total_streams")
  WHERE "is_released" = true;

-- 4. JOIN OPTIMIZATION INDEXES
-- Optimizes artist-song joins for quality calculations with mood synergy
-- Supports: songs JOIN artists ON songs.artist_id = artists.id WHERE songs.game_id = ?
CREATE INDEX "idx_artists_game_mood" ON "artists" ("id", "game_id", "mood");

-- Game state lookup optimization for reputation-based queries
CREATE INDEX "idx_game_states_user_reputation" ON "game_states" ("user_id", "reputation", "current_month");

-- 5. REVENUE TRACKING INDEXES
-- Revenue and streaming performance tracking
CREATE INDEX "idx_songs_revenue_tracking" ON "songs" ("game_id", "is_released", "total_revenue" DESC, "total_streams" DESC)
  WHERE "is_released" = true AND "total_revenue" > 0;

-- Monthly revenue processing (for decay calculations)
CREATE INDEX "idx_songs_monthly_revenue" ON "songs" ("release_month", "last_month_revenue")
  WHERE "release_month" IS NOT NULL;

-- 6. PARTIAL INDEXES FOR PERFORMANCE
-- Index only recorded songs (reduces index size by ~50% in typical games)
CREATE INDEX "idx_songs_recorded_quality" ON "songs" ("game_id", "quality", "producer_tier")
  WHERE "is_recorded" = true;

-- Index only active projects for project management queries
CREATE INDEX "idx_projects_active" ON "projects" ("game_id", "stage", "type")
  WHERE "stage" NOT IN ('completed', 'cancelled');

-- Index only signed artists for active roster management
CREATE INDEX "idx_artists_signed" ON "artists" ("game_id", "archetype", "mood", "popularity")
  WHERE "is_signed" = true;

-- 7. RELEASE MANAGEMENT OPTIMIZATION
-- Junction table optimization for release-song relationships
CREATE INDEX "idx_release_songs_track_order" ON "release_songs" ("release_id", "track_number");
CREATE INDEX "idx_release_songs_singles" ON "release_songs" ("song_id") WHERE "is_single" = true;

-- Release performance tracking
CREATE INDEX "idx_releases_performance" ON "releases" ("game_id", "release_month", "revenue_generated" DESC)
  WHERE "status" = 'released';

-- 8. FOREIGN KEY INDEX OPTIMIZATIONS
-- These indexes speed up cascade operations and join queries
-- Drizzle creates these automatically, but we ensure they're optimal

-- Ensure artist_id lookups are fast for cascade deletes
CREATE INDEX IF NOT EXISTS "idx_songs_artist_cascade" ON "songs" ("artist_id");
CREATE INDEX IF NOT EXISTS "idx_projects_artist_cascade" ON "projects" ("artist_id");
CREATE INDEX IF NOT EXISTS "idx_releases_artist_cascade" ON "releases" ("artist_id");

-- Ensure game_id lookups are fast for game cleanup
CREATE INDEX IF NOT EXISTS "idx_songs_game_cascade" ON "songs" ("game_id");
CREATE INDEX IF NOT EXISTS "idx_artists_game_lookup" ON "artists" ("game_id");
CREATE INDEX IF NOT EXISTS "idx_projects_game_lookup" ON "projects" ("game_id");
CREATE INDEX IF NOT EXISTS "idx_releases_game_cascade" ON "releases" ("game_id");

-- 9. PERFORMANCE MONITORING HELPERS
-- Create view for monitoring slow query patterns
CREATE OR REPLACE VIEW "v_producer_tier_stats" AS
SELECT 
  gs.id as game_id,
  gs.reputation,
  s.producer_tier,
  s.time_investment,
  COUNT(*) as song_count,
  AVG(s.quality) as avg_quality,
  SUM(s.total_revenue) as total_revenue,
  SUM(s.total_streams) as total_streams
FROM game_states gs
LEFT JOIN songs s ON gs.id = s.game_id AND s.is_recorded = true
GROUP BY gs.id, gs.reputation, s.producer_tier, s.time_investment;

-- View for portfolio analysis performance
CREATE OR REPLACE VIEW "v_portfolio_performance" AS
SELECT 
  game_id,
  producer_tier,
  time_investment,
  COUNT(*) as track_count,
  AVG(quality) as avg_quality,
  AVG(total_revenue) as avg_revenue,
  AVG(total_streams) as avg_streams,
  MAX(total_revenue) as peak_revenue
FROM songs 
WHERE is_released = true
GROUP BY game_id, producer_tier, time_investment;

-- 10. COMMENTS FOR MAINTENANCE
COMMENT ON INDEX "idx_game_states_reputation_lookup" IS 'Critical for producer tier availability checks - target <50ms';
COMMENT ON INDEX "idx_songs_portfolio_analysis" IS 'Primary index for song catalog loading - target <200ms';
COMMENT ON INDEX "idx_songs_monthly_processing" IS 'Monthly quality calculations - target <300ms';
COMMENT ON INDEX "idx_songs_tier_performance" IS 'Portfolio analytics aggregations - target <500ms';

COMMENT ON VIEW "v_producer_tier_stats" IS 'Monitoring view for producer tier query performance';
COMMENT ON VIEW "v_portfolio_performance" IS 'Monitoring view for portfolio analysis performance';

-- 11. STATISTICS UPDATE
-- Ensure PostgreSQL has fresh statistics for query optimization
ANALYZE songs;
ANALYZE game_states;
ANALYZE artists;
ANALYZE releases;
ANALYZE projects;