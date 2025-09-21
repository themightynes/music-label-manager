-- Add music_labels table
CREATE TABLE IF NOT EXISTS "music_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"game_id" uuid NOT NULL,
	"founded_month" integer DEFAULT 1,
	"description" text,
	"genre_focus" text,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign key constraint with cascade delete
DO $$ BEGIN
 ALTER TABLE "music_labels" ADD CONSTRAINT "music_labels_game_id_game_states_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_states"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add unique constraint on game_id to enforce one-to-one relationship
DO $$ BEGIN
 ALTER TABLE "music_labels" ADD CONSTRAINT "music_labels_game_id_unique" UNIQUE ("game_id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add index for game_id lookups
CREATE INDEX IF NOT EXISTS "idx_music_labels_game_id" ON "music_labels" ("game_id");