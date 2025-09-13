CREATE TABLE "executives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid,
	"role" text,
	"level" integer DEFAULT 1,
	"mood" integer DEFAULT 50,
	"loyalty" integer DEFAULT 50,
	"last_action_month" integer,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "total_revenue" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "roi_percentage" real GENERATED ALWAYS AS (
    CASE 
      WHEN total_cost > 0 THEN 
        ((total_revenue - total_cost)::REAL / total_cost::REAL * 100)
      ELSE NULL 
    END
  ) STORED;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "completion_status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "executives" ADD CONSTRAINT "executives_game_id_game_states_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_states"("id") ON DELETE no action ON UPDATE no action;