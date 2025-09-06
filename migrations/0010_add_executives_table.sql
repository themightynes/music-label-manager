-- Add executives table
CREATE TABLE IF NOT EXISTS "executives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid,
	"role" text,
	"level" integer DEFAULT 1,
	"mood" integer DEFAULT 50,
	"loyalty" integer DEFAULT 50,
	"last_action_month" integer,
	"metadata" jsonb
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "executives" ADD CONSTRAINT "executives_game_id_game_states_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_states"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add index for game_id lookups
CREATE INDEX IF NOT EXISTS "idx_executives_game_id" ON "executives" ("game_id");