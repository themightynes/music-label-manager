-- Migration: Drop dead artist columns (C63 partial)
-- Purpose: Remove five fully-dead columns from the artists table (zero readers/writers,
--          verified via git grep). massAppeal is intentionally KEPT (to be wired later).
-- Date: 2026-07-26
-- Related: technical-debt-backlog item C63
--
-- Dropping stress/creativity also drops their CHECK constraints
-- (artists_stress_check / artists_creativity_check from migration 0020) automatically,
-- since a column's CHECK constraints are removed with the column.
-- massAppeal and its artists_mass_appeal_check are left untouched.

BEGIN;

ALTER TABLE "artists" DROP COLUMN IF EXISTS "stress";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "creativity";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "mood_history";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "last_mood_event";
ALTER TABLE "artists" DROP COLUMN IF EXISTS "mood_trend";

COMMIT;
