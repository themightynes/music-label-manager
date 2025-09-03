CREATE TABLE "mood_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid,
	"game_id" uuid,
	"event_type" text NOT NULL,
	"mood_change" integer NOT NULL,
	"mood_before" integer NOT NULL,
	"mood_after" integer NOT NULL,
	"description" text NOT NULL,
	"month_occurred" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "game_states" ALTER COLUMN "playlist_access" SET DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "game_states" ALTER COLUMN "press_access" SET DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "game_states" ALTER COLUMN "venue_access" SET DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "monthly_fee" integer DEFAULT 1200;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "talent" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "work_ethic" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "stress" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "creativity" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "mass_appeal" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "last_attention_month" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "experience" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "mood_history" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "last_mood_event" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "mood_trend" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "budget_per_song" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "total_cost" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cost_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "producer_tier" text DEFAULT 'local';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "time_investment" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "recorded_at" timestamp;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "released_at" timestamp;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "production_budget" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "marketing_allocation" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "total_investment" integer GENERATED ALWAYS AS (production_budget + marketing_allocation) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "roi_percentage" real GENERATED ALWAYS AS (
    CASE 
      WHEN (production_budget + marketing_allocation) > 0 THEN 
        ((total_revenue - (production_budget + marketing_allocation))::REAL / (production_budget + marketing_allocation)::REAL * 100)
      ELSE NULL 
    END
  ) STORED;--> statement-breakpoint
ALTER TABLE "mood_events" ADD CONSTRAINT "mood_events_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_events" ADD CONSTRAINT "mood_events_game_id_game_states_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;