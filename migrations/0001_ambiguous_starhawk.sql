ALTER TABLE "songs" ADD COLUMN "initial_streams" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "total_streams" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "total_revenue" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "monthly_streams" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "last_month_revenue" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "release_month" integer;