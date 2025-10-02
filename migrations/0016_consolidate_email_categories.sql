-- Migration: Consolidate email categories from 7 to 4
-- Old categories → New categories:
--   tour_completion, release → artist
--   top_10_debut, number_one_debut → chart
--   financial_report, tier_unlock → financial
--   artist_discovery → ar

UPDATE emails
SET category = 'artist'
WHERE category IN ('tour_completion', 'release');

UPDATE emails
SET category = 'chart'
WHERE category IN ('top_10_debut', 'number_one_debut');

UPDATE emails
SET category = 'financial'
WHERE category IN ('financial_report', 'tier_unlock');

UPDATE emails
SET category = 'ar'
WHERE category = 'artist_discovery';
