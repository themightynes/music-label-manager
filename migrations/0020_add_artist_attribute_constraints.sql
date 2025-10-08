-- Add CHECK constraints to ensure all artist attributes are between 0 and 100

-- Drop old constraints if they exist (in case this is re-run)
ALTER TABLE "artists" DROP CONSTRAINT IF EXISTS "artists_mood_check";
ALTER TABLE "artists" DROP CONSTRAINT IF EXISTS "artists_energy_check";
ALTER TABLE "artists" DROP CONSTRAINT IF EXISTS "artists_talent_check";
ALTER TABLE "artists" DROP CONSTRAINT IF EXISTS "artists_work_ethic_check";
ALTER TABLE "artists" DROP CONSTRAINT IF EXISTS "artists_stress_check";
ALTER TABLE "artists" DROP CONSTRAINT IF EXISTS "artists_creativity_check";
ALTER TABLE "artists" DROP CONSTRAINT IF EXISTS "artists_mass_appeal_check";

-- Add new constraints for all 0-100 attributes
ALTER TABLE "artists" ADD CONSTRAINT "artists_mood_check" CHECK ("mood" >= 0 AND "mood" <= 100);
ALTER TABLE "artists" ADD CONSTRAINT "artists_energy_check" CHECK ("energy" >= 0 AND "energy" <= 100);
ALTER TABLE "artists" ADD CONSTRAINT "artists_talent_check" CHECK ("talent" >= 0 AND "talent" <= 100);
ALTER TABLE "artists" ADD CONSTRAINT "artists_work_ethic_check" CHECK ("work_ethic" >= 0 AND "work_ethic" <= 100);
ALTER TABLE "artists" ADD CONSTRAINT "artists_stress_check" CHECK ("stress" >= 0 AND "stress" <= 100);
ALTER TABLE "artists" ADD CONSTRAINT "artists_creativity_check" CHECK ("creativity" >= 0 AND "creativity" <= 100);
ALTER TABLE "artists" ADD CONSTRAINT "artists_mass_appeal_check" CHECK ("mass_appeal" >= 0 AND "mass_appeal" <= 100);
