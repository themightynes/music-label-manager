CREATE TABLE "chart_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"chart_week" date NOT NULL,
	"streams" integer NOT NULL,
	"position" integer,
	"is_charting" boolean GENERATED ALWAYS AS (position IS NOT NULL AND position <= 100) STORED,
	"is_debut" boolean DEFAULT false,
	"movement" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chart_entries" ADD CONSTRAINT "chart_entries_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_entries" ADD CONSTRAINT "chart_entries_game_id_game_states_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_chart_entries_unique_game_song_week" ON "chart_entries" USING btree ("game_id","song_id","chart_week");