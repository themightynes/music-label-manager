-- Migration: Add founded_year to music_labels
-- Purpose: Allow storing a real calendar starting year for the label/game

ALTER TABLE music_labels
ADD COLUMN IF NOT EXISTS founded_year INTEGER;