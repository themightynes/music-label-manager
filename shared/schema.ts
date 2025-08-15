import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, uuid, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (for save games)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game saves
export const gameSaves = pgTable("game_saves", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  gameState: jsonb("game_state").notNull(),
  month: integer("month").notNull(),
  isAutosave: boolean("is_autosave").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Artists
export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  archetype: text("archetype").notNull(), // Visionary, Workhorse, Trendsetter
  mood: integer("mood").default(50),
  loyalty: integer("loyalty").default(50),
  popularity: integer("popularity").default(0),
  signedMonth: integer("signed_month"),
  isSigned: boolean("is_signed").default(false),
  gameId: uuid("game_id"),
});

// Industry roles
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // Manager, A&R, Producer, etc.
  relationship: integer("relationship").default(50),
  accessLevel: integer("access_level").default(0),
  gameId: uuid("game_id"),
});

// Projects (Singles, EPs, Tours)
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").notNull(), // Single, EP, Mini-Tour
  artistId: uuid("artist_id").references(() => artists.id),
  stage: text("stage").default("planning"), // planning, production, marketing, released
  quality: integer("quality").default(0),
  budget: integer("budget").default(0),
  budgetUsed: integer("budget_used").default(0),
  dueMonth: integer("due_month"),
  startMonth: integer("start_month"),
  gameId: uuid("game_id"),
  metadata: jsonb("metadata"), // Additional project-specific data
});

// Dialogue choices and effects
export const dialogueChoices = pgTable("dialogue_choices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  roleType: text("role_type").notNull(),
  sceneId: text("scene_id").notNull(),
  choiceText: text("choice_text").notNull(),
  immediateEffects: jsonb("immediate_effects"), // { money: -2000, reputation: 5 }
  delayedEffects: jsonb("delayed_effects"), // Effects that happen at month end
  requirements: jsonb("requirements"), // Conditions to show this choice
});

// Game events (side stories)
export const gameEvents = pgTable("game_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").default("side_story"),
  triggerConditions: jsonb("trigger_conditions"),
  choices: jsonb("choices"), // Array of choice objects
  oneTime: boolean("one_time").default(true),
});

// Game state tracking
export const gameStates = pgTable("game_states", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  currentMonth: integer("current_month").default(1),
  money: integer("money").default(75000),
  reputation: integer("reputation").default(0),
  creativeCapital: integer("creative_capital").default(0),
  focusSlots: integer("focus_slots").default(3),
  usedFocusSlots: integer("used_focus_slots").default(0),
  playlistAccess: text("playlist_access").default("None"), // None, Niche, Mid
  pressAccess: text("press_access").default("None"), // None, Blogs, Mid-Tier
  venueAccess: text("venue_access").default("None"), // None, Clubs
  campaignType: text("campaign_type").default("Balanced"), // Commercial, Critical, Balanced
  rngSeed: text("rng_seed"),
  flags: jsonb("flags").default('{}'), // Game flags for delayed effects
  monthlyStats: jsonb("monthly_stats").default('{}'), // Track monthly performance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monthly actions (for tracking player choices)
export const monthlyActions = pgTable("monthly_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").references(() => gameStates.id),
  month: integer("month").notNull(),
  actionType: text("action_type").notNull(),
  targetId: uuid("target_id"), // Role ID, Project ID, etc.
  choiceId: uuid("choice_id"), // For dialogue choices
  results: jsonb("results"), // Outcome of the action
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const gameSavesRelations = relations(gameSaves, ({ one }) => ({
  user: one(users, {
    fields: [gameSaves.userId],
    references: [users.id],
  }),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  artist: one(artists, {
    fields: [projects.artistId],
    references: [artists.id],
  }),
}));

export const monthlyActionsRelations = relations(monthlyActions, ({ one }) => ({
  gameState: one(gameStates, {
    fields: [monthlyActions.gameId],
    references: [gameStates.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameSaveSchema = createInsertSchema(gameSaves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArtistSchema = createInsertSchema(artists).omit({
  id: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

export const insertGameStateSchema = createInsertSchema(gameStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMonthlyActionSchema = createInsertSchema(monthlyActions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type GameSave = typeof gameSaves.$inferSelect;
export type InsertGameSave = z.infer<typeof insertGameSaveSchema>;

export type Artist = typeof artists.$inferSelect;
export type InsertArtist = z.infer<typeof insertArtistSchema>;

export type Role = typeof roles.$inferSelect;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type DialogueChoice = typeof dialogueChoices.$inferSelect;

export type GameEvent = typeof gameEvents.$inferSelect;

export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;

export type MonthlyAction = typeof monthlyActions.$inferSelect;
export type InsertMonthlyAction = z.infer<typeof insertMonthlyActionSchema>;
