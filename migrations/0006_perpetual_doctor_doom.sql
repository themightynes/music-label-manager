DROP INDEX "idx_chart_entries_unique_game_song_week";--> statement-breakpoint
ALTER TABLE "chart_entries" ALTER COLUMN "song_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chart_entries" ADD COLUMN "is_competitor_song" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "chart_entries" ADD COLUMN "competitor_title" text;--> statement-breakpoint
ALTER TABLE "chart_entries" ADD COLUMN "competitor_artist" text;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_chart_entries_unique_player" ON "chart_entries" USING btree ("game_id","song_id","chart_week");