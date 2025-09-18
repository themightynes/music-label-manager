TRUNCATE TABLE "game_saves", "game_states" CASCADE;

ALTER TABLE "game_saves" DROP CONSTRAINT IF EXISTS "game_saves_user_id_users_id_fk";
ALTER TABLE "game_states" DROP CONSTRAINT IF EXISTS "game_states_user_id_users_id_fk";

DROP TABLE IF EXISTS "users";

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerk_id" text NOT NULL UNIQUE,
  "email" text NOT NULL,
  "username" text,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE "game_saves"
  ADD CONSTRAINT "game_saves_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "game_states"
  ADD CONSTRAINT "game_states_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id");
