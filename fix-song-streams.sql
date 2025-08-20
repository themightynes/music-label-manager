-- SQL Migration to fix existing released songs missing initialStreams
-- This updates songs that were released before the per-song stream calculation was implemented

-- First, let's see what songs need fixing
SELECT 
  id,
  title,
  quality,
  is_released,
  initial_streams,
  total_streams,
  release_month
FROM songs 
WHERE is_released = true 
  AND initial_streams = 0
ORDER BY quality DESC;

-- Update songs with calculated initialStreams based on their quality
-- Using a simplified but realistic calculation: quality * 1500 (base streams per quality point)
UPDATE songs 
SET 
  initial_streams = GREATEST(1000, quality * 1500),
  total_streams = GREATEST(1000, quality * 1500),
  monthly_streams = GREATEST(1000, quality * 1500),
  total_revenue = ROUND(GREATEST(1000, quality * 1500) * 0.003),
  last_month_revenue = ROUND(GREATEST(1000, quality * 1500) * 0.003),
  release_month = COALESCE(release_month, 1)
WHERE is_released = true 
  AND initial_streams = 0;

-- Verify the update
SELECT 
  id,
  title,
  quality,
  initial_streams,
  total_revenue,
  release_month
FROM songs 
WHERE is_released = true 
  AND initial_streams > 0
ORDER BY initial_streams DESC;

-- Summary statistics
SELECT 
  COUNT(*) as total_released_songs,
  COUNT(CASE WHEN initial_streams > 0 THEN 1 END) as songs_with_streams,
  AVG(initial_streams) as avg_initial_streams,
  AVG(total_revenue) as avg_revenue,
  MIN(initial_streams) as min_streams,
  MAX(initial_streams) as max_streams
FROM songs 
WHERE is_released = true;