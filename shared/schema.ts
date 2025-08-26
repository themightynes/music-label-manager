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
  monthlyFee: integer("monthly_fee").default(1200), // Ongoing monthly cost for this artist
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
  budgetPerSong: integer("budget_per_song").default(0),
  totalCost: integer("total_cost").default(0),
  costUsed: integer("cost_used").default(0),
  dueMonth: integer("due_month"),
  startMonth: integer("start_month"),
  gameId: uuid("game_id"),
  metadata: jsonb("metadata"), // Additional project-specific data
  // NEW FIELDS for multi-song support
  songCount: integer("song_count").default(1),
  songsCreated: integer("songs_created").default(0),
  // Project-level economic decision fields
  producerTier: text("producer_tier").default("local"), // local, regional, national, legendary  
  timeInvestment: text("time_investment").default("standard"), // rushed, standard, extended, perfectionist
});

// Songs (Individual tracks)
export const songs = pgTable("songs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  artistId: uuid("artist_id").references(() => artists.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => gameStates.id, { onDelete: "cascade" }).notNull(),
  quality: integer("quality").notNull(), // 20-100
  genre: text("genre"),
  mood: text("mood"), // upbeat, melancholic, aggressive, chill
  createdMonth: integer("created_month"),
  producerTier: text("producer_tier").default("local"), // local, regional, national, legendary
  timeInvestment: text("time_investment").default("standard"), // rushed, standard, extended, perfectionist
  isRecorded: boolean("is_recorded").default(false),
  isReleased: boolean("is_released").default(false),
  releaseId: uuid("release_id").references(() => releases.id, { onDelete: "set null" }),
  
  // Timestamps for recording and release events
  recordedAt: timestamp("recorded_at"), // When recording was completed
  releasedAt: timestamp("released_at"), // When actually released via Plan Release
  
  // Individual song revenue and streaming metrics
  initialStreams: integer("initial_streams").default(0),
  totalStreams: integer("total_streams").default(0),
  totalRevenue: integer("total_revenue").default(0),
  monthlyStreams: integer("monthly_streams").default(0),
  lastMonthRevenue: integer("last_month_revenue").default(0),
  releaseMonth: integer("release_month"),
  
  metadata: jsonb("metadata").default('{}'), // hooks, features, special attributes, decay data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Performance-optimized indexes for producer tier and time investment systems
  portfolioAnalysisIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_portfolio_analysis" ON ${table} ("game_id", "is_recorded", "producer_tier", "time_investment")`,
  monthlyProcessingIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_monthly_processing" ON ${table} ("game_id", "created_month") WHERE "created_month" IS NOT NULL`,
  artistHistoryIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_artist_history" ON ${table} ("artist_id", "is_released", "created_month" DESC) WHERE "is_released" = true`,
  tierPerformanceIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_tier_performance" ON ${table} ("game_id", "is_released", "producer_tier", "total_revenue", "total_streams") WHERE "is_released" = true`,
  recordedQualityIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_recorded_quality" ON ${table} ("game_id", "quality", "producer_tier") WHERE "is_recorded" = true`,
  revenueTrackingIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_revenue_tracking" ON ${table} ("game_id", "is_released", "total_revenue" DESC, "total_streams" DESC) WHERE "is_released" = true AND "total_revenue" > 0`,
  monthlyRevenueIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_monthly_revenue" ON ${table} ("release_month", "last_month_revenue") WHERE "release_month" IS NOT NULL`,
}));

// Releases (Singles, EPs, Albums, Compilations)
export const releases = pgTable("releases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").notNull(), // single, ep, album, compilation
  artistId: uuid("artist_id").references(() => artists.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => gameStates.id, { onDelete: "cascade" }).notNull(),
  releaseMonth: integer("release_month"),
  totalQuality: integer("total_quality").default(0), // aggregate of song qualities
  marketingBudget: integer("marketing_budget").default(0),
  status: text("status").default("planned"), // planned, released, catalog
  revenueGenerated: integer("revenue_generated").default(0),
  streamsGenerated: integer("streams_generated").default(0),
  peakChartPosition: integer("peak_chart_position"),
  metadata: jsonb("metadata").default('{}'), // track listing, bonus content, etc
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for release-song relationships
export const releaseSongs = pgTable("release_songs", {
  releaseId: uuid("release_id").references(() => releases.id, { onDelete: "cascade" }).notNull(),
  songId: uuid("song_id").references(() => songs.id, { onDelete: "cascade" }).notNull(),
  trackNumber: integer("track_number").notNull(),
  isSingle: boolean("is_single").default(false), // was this pushed as a single?
}, (table) => ({
  pk: sql`PRIMARY KEY (${table.releaseId}, ${table.songId})`,
}));

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
  campaignCompleted: boolean("campaign_completed").default(false),
  flags: jsonb("flags").default('{}'), // Game flags for delayed effects
  monthlyStats: jsonb("monthly_stats").default('{}'), // Track monthly performance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for producer tier performance optimization
  reputationLookupIdx: sql`CREATE INDEX IF NOT EXISTS "idx_game_states_reputation_lookup" ON ${table} ("id", "reputation")`,
  userReputationIdx: sql`CREATE INDEX IF NOT EXISTS "idx_game_states_user_reputation" ON ${table} ("user_id", "reputation", "current_month")`,
}));

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
  songs: many(songs),
  releases: many(releases),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  artist: one(artists, {
    fields: [projects.artistId],
    references: [artists.id],
  }),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  artist: one(artists, {
    fields: [songs.artistId],
    references: [artists.id],
  }),
  gameState: one(gameStates, {
    fields: [songs.gameId],
    references: [gameStates.id],
  }),
  release: one(releases, {
    fields: [songs.releaseId],
    references: [releases.id],
  }),
  releaseSongs: many(releaseSongs),
}));

export const releasesRelations = relations(releases, ({ one, many }) => ({
  artist: one(artists, {
    fields: [releases.artistId],
    references: [artists.id],
  }),
  gameState: one(gameStates, {
    fields: [releases.gameId],
    references: [gameStates.id],
  }),
  songs: many(songs),
  releaseSongs: many(releaseSongs),
}));

export const releaseSongsRelations = relations(releaseSongs, ({ one }) => ({
  release: one(releases, {
    fields: [releaseSongs.releaseId],
    references: [releases.id],
  }),
  song: one(songs, {
    fields: [releaseSongs.songId],
    references: [songs.id],
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
  userId: true, // Will be set by middleware
  createdAt: true,
  updatedAt: true,
});

export const insertArtistSchema = createInsertSchema(artists).omit({
  id: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
});

export const insertReleaseSchema = createInsertSchema(releases).omit({
  id: true,
  createdAt: true,
});

export const insertReleaseSongSchema = createInsertSchema(releaseSongs);

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

export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;

export type Release = typeof releases.$inferSelect;
export type InsertRelease = z.infer<typeof insertReleaseSchema>;

export type ReleaseSong = typeof releaseSongs.$inferSelect;
export type InsertReleaseSong = z.infer<typeof insertReleaseSongSchema>;

export type DialogueChoice = typeof dialogueChoices.$inferSelect;

export type GameEvent = typeof gameEvents.$inferSelect;

export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;

export type MonthlyAction = typeof monthlyActions.$inferSelect;
export type InsertMonthlyAction = z.infer<typeof insertMonthlyActionSchema>;
