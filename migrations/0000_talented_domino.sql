CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"archetype" text NOT NULL,
	"mood" integer DEFAULT 50,
	"loyalty" integer DEFAULT 50,
	"popularity" integer DEFAULT 0,
	"signed_month" integer,
	"is_signed" boolean DEFAULT false,
	"game_id" uuid
);
--> statement-breakpoint
CREATE TABLE "dialogue_choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_type" text NOT NULL,
	"scene_id" text NOT NULL,
	"choice_text" text NOT NULL,
	"immediate_effects" jsonb,
	"delayed_effects" jsonb,
	"requirements" jsonb
);
--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text DEFAULT 'side_story',
	"trigger_conditions" jsonb,
	"choices" jsonb,
	"one_time" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "game_saves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"game_state" jsonb NOT NULL,
	"month" integer NOT NULL,
	"is_autosave" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"current_month" integer DEFAULT 1,
	"money" integer DEFAULT 75000,
	"reputation" integer DEFAULT 0,
	"creative_capital" integer DEFAULT 0,
	"focus_slots" integer DEFAULT 3,
	"used_focus_slots" integer DEFAULT 0,
	"playlist_access" text DEFAULT 'None',
	"press_access" text DEFAULT 'None',
	"venue_access" text DEFAULT 'None',
	"campaign_type" text DEFAULT 'Balanced',
	"rng_seed" text,
	"campaign_completed" boolean DEFAULT false,
	"flags" jsonb DEFAULT '{}',
	"monthly_stats" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid,
	"month" integer NOT NULL,
	"action_type" text NOT NULL,
	"target_id" uuid,
	"choice_id" uuid,
	"results" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"artist_id" uuid,
	"stage" text DEFAULT 'planning',
	"quality" integer DEFAULT 0,
	"budget" integer DEFAULT 0,
	"budget_used" integer DEFAULT 0,
	"due_month" integer,
	"start_month" integer,
	"game_id" uuid,
	"metadata" jsonb,
	"song_count" integer DEFAULT 1,
	"songs_created" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "release_songs" (
	"release_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"track_number" integer NOT NULL,
	"is_single" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"artist_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"release_month" integer,
	"total_quality" integer DEFAULT 0,
	"marketing_budget" integer DEFAULT 0,
	"status" text DEFAULT 'planned',
	"revenue_generated" integer DEFAULT 0,
	"streams_generated" integer DEFAULT 0,
	"peak_chart_position" integer,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"relationship" integer DEFAULT 50,
	"access_level" integer DEFAULT 0,
	"game_id" uuid
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"artist_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"quality" integer NOT NULL,
	"genre" text,
	"mood" text,
	"created_month" integer,
	"producer_tier" text DEFAULT 'local',
	"time_investment" text DEFAULT 'standard',
	"is_recorded" boolean DEFAULT false,
	"is_released" boolean DEFAULT false,
	"release_id" uuid,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "game_saves" ADD CONSTRAINT "game_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_states" ADD CONSTRAINT "game_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_actions" ADD CONSTRAINT "monthly_actions_game_id_game_states_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_songs" ADD CONSTRAINT "release_songs_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_songs" ADD CONSTRAINT "release_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_game_id_game_states_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_game_id_game_states_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;