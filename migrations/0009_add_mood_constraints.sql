-- Add constraints to ensure mood is between 0 and 100
UPDATE "artists" SET "mood" = 50 WHERE "mood" IS NULL;
ALTER TABLE "artists" ADD CONSTRAINT "artists_mood_check" CHECK ("mood" >= 0 AND "mood" <= 100);