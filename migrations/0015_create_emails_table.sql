CREATE TABLE IF NOT EXISTS "emails" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "game_id" uuid NOT NULL REFERENCES "game_states"("id") ON DELETE CASCADE,
    "week" integer NOT NULL,
    "category" text NOT NULL,
    "sender" text NOT NULL,
    "sender_role_id" text,
    "subject" text NOT NULL,
    "preview" text,
    "body" jsonb NOT NULL,
    "metadata" jsonb DEFAULT '{}',
    "is_read" boolean NOT NULL DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_emails_game_id" ON "emails" ("game_id");
CREATE INDEX IF NOT EXISTS "idx_emails_game_is_read" ON "emails" ("game_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_emails_game_week" ON "emails" ("game_id", "week");