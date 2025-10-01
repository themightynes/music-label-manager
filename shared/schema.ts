import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, uuid, real, date, uniqueIndex, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (linked to Clerk identities)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  username: text("username"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game saves
export const gameSaves = pgTable("game_saves", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  gameState: jsonb("game_state").notNull(),
  week: integer("week").notNull(),
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
  signedWeek: integer("signed_week"),
  isSigned: boolean("is_signed").default(false),
  weeklyFee: integer("weekly_fee").default(1200), // Ongoing weekly cost for this artist
  gameId: uuid("game_id"),
  // Additional artist attributes
  talent: integer("talent").default(50), // 0-100
  workEthic: integer("work_ethic").default(50), // 0-100
  stress: integer("stress").default(0), // 0-100
  creativity: integer("creativity").default(50), // 0-100
  massAppeal: integer("mass_appeal").default(50), // 0-100
  lastAttentionWeek: integer("last_attention_week").default(1),
  experience: integer("experience").default(0),
  // Mood tracking
  moodHistory: jsonb("mood_history").default('[]'), // Array of mood change events
  lastMoodEvent: text("last_mood_event"), // Nullable - description of last mood event
  moodTrend: integer("mood_trend").default(0), // -1 (declining), 0 (stable), 1 (improving)
});

// Mood Events - Track artist mood changes over time
export const moodEvents = pgTable("mood_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: uuid("artist_id").references(() => artists.id),
  gameId: uuid("game_id").references(() => gameStates.id),
  eventType: text("event_type").notNull(), // e.g., "release_success", "neglected", "creative_breakthrough"
  moodChange: integer("mood_change").notNull(), // Amount of mood change (+/-)
  moodBefore: integer("mood_before").notNull(), // Mood value before the event
  moodAfter: integer("mood_after").notNull(), // Mood value after the event
  description: text("description").notNull(), // Human-readable description of the event
  weekOccurred: integer("week_occurred").notNull(), // Game week when this happened
  metadata: jsonb("metadata").default('{}'), // Additional event-specific data
  createdAt: timestamp("created_at").defaultNow(),
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
  stage: text("stage").default("planning"), // planning, production, released
  quality: integer("quality").default(0),
  budget: integer("budget").default(0), // Total budget allocated for the project
  budgetUsed: integer("budget_used").default(0), // Budget already spent
  budgetPerSong: integer("budget_per_song").default(0),
  totalCost: integer("total_cost").default(0),
  costUsed: integer("cost_used").default(0),
  dueWeek: integer("due_week"),
  startWeek: integer("start_week"),
  gameId: uuid("game_id"),
  metadata: jsonb("metadata"), // Additional project-specific data
  // NEW FIELDS for multi-song support
  songCount: integer("song_count").default(1),
  songsCreated: integer("songs_created").default(0),
  // Project-level economic decision fields
  producerTier: text("producer_tier").default("local"), // local, regional, national, legendary  
  timeInvestment: text("time_investment").default("standard"), // rushed, standard, extended, perfectionist
  
  // Tour ROI tracking (mirrors song ROI system)
  totalRevenue: integer("total_revenue").default(0), // Aggregated revenue for tours
  roiPercentage: real("roi_percentage").generatedAlwaysAs(sql`
    CASE 
      WHEN total_cost > 0 THEN 
        ((total_revenue - total_cost)::REAL / total_cost::REAL * 100)
      ELSE NULL 
    END
  `), // Auto-calculated ROI percentage
  completionStatus: text("completion_status").default("active"), // active, completed, cancelled
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
  createdWeek: integer("created_week"),
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
  weeklyStreams: integer("weekly_streams").default(0),
  lastWeekRevenue: integer("last_week_revenue").default(0),
  releaseWeek: integer("release_week"),
  
  // Investment tracking for ROI analysis
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  productionBudget: integer("production_budget").default(0), // Recording/production costs
  marketingAllocation: integer("marketing_allocation").default(0), // Marketing spend allocated
  totalInvestment: integer("total_investment").generatedAlwaysAs(sql`production_budget + marketing_allocation`),
  roiPercentage: real("roi_percentage").generatedAlwaysAs(sql`
    CASE 
      WHEN (production_budget + marketing_allocation) > 0 THEN 
        ((total_revenue - (production_budget + marketing_allocation))::REAL / (production_budget + marketing_allocation)::REAL * 100)
      ELSE NULL 
    END
  `),
  
  metadata: jsonb("metadata").default('{}'), // hooks, features, special attributes, decay data

  // Awareness system columns
  awareness: integer("awareness").default(0).notNull(), // Current cultural penetration (0-100 scale)
  breakthrough_achieved: boolean("breakthrough_achieved").default(false).notNull(), // Has song achieved cultural breakthrough
  peak_awareness: integer("peak_awareness").default(0).notNull(), // Historical peak awareness for analytics
  awareness_decay_rate: real("awareness_decay_rate").default(0.05).notNull(), // Custom decay rate (breakthrough songs decay slower)

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Performance-optimized indexes for producer tier and time investment systems
  portfolioAnalysisIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_portfolio_analysis" ON ${table} ("game_id", "is_recorded", "producer_tier", "time_investment")`,
  weeklyProcessingIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_weekly_processing" ON ${table} ("game_id", "created_week") WHERE "created_week" IS NOT NULL`,
  artistHistoryIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_artist_history" ON ${table} ("artist_id", "is_released", "created_week" DESC) WHERE "is_released" = true`,
  tierPerformanceIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_tier_performance" ON ${table} ("game_id", "is_released", "producer_tier", "total_revenue", "total_streams") WHERE "is_released" = true`,
  recordedQualityIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_recorded_quality" ON ${table} ("game_id", "quality", "producer_tier") WHERE "is_recorded" = true`,
  revenueTrackingIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_revenue_tracking" ON ${table} ("game_id", "is_released", "total_revenue" DESC, "total_streams" DESC) WHERE "is_released" = true AND "total_revenue" > 0`,
  weeklyRevenueIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_weekly_revenue" ON ${table} ("release_week", "last_week_revenue") WHERE "release_week" IS NOT NULL`,
  
  // Investment and ROI tracking indexes
  projectSongsIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_by_project" ON ${table} ("project_id") WHERE "project_id" IS NOT NULL`,
  artistRoiIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_artist_roi" ON ${table} ("artist_id", "roi_percentage" DESC) WHERE "is_released" = true AND "roi_percentage" IS NOT NULL`,
  producerRoiIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_producer_roi" ON ${table} ("producer_tier", "roi_percentage" DESC) WHERE "is_released" = true AND "roi_percentage" IS NOT NULL`,
  investmentAnalysisIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_investment_analysis" ON ${table} ("game_id", "total_investment", "total_revenue") WHERE "is_released" = true`,

  // Awareness system indexes
  awarenessQueriesIdx: sql`CREATE INDEX IF NOT EXISTS "idx_songs_awareness_queries" ON ${table} ("game_id", "awareness" DESC, "breakthrough_achieved") WHERE "is_released" = true`,
}));

// Releases (Singles, EPs, Albums, Compilations)
export const releases = pgTable("releases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").notNull(), // single, ep, album, compilation
  artistId: uuid("artist_id").references(() => artists.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => gameStates.id, { onDelete: "cascade" }).notNull(),
  releaseWeek: integer("release_week"),
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
  // Performance indexes for efficient queries
  releaseTracksIdx: sql`CREATE INDEX IF NOT EXISTS "idx_release_songs_by_release" ON ${table} ("release_id", "track_number")`,
  songReleasesIdx: sql`CREATE INDEX IF NOT EXISTS "idx_release_songs_by_song" ON ${table} ("song_id")`,
  leadSinglesIdx: sql`CREATE INDEX IF NOT EXISTS "idx_release_songs_lead_singles" ON ${table} ("release_id") WHERE "is_single" = true`,
}));

// TODO: Remove or redesign legacy dialogue storage after rebuilding the executive system UI (removed 2025-09-19).
// Dialogue choices and effects
export const dialogueChoices = pgTable("dialogue_choices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  roleType: text("role_type").notNull(),
  sceneId: text("scene_id").notNull(),
  choiceText: text("choice_text").notNull(),
  immediateEffects: jsonb("immediate_effects"), // { money: -2000, reputation: 5 }
  delayedEffects: jsonb("delayed_effects"), // Effects that happen at week end
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
  currentWeek: integer("current_week").default(1),
  money: integer("money").default(75000),
  reputation: integer("reputation").default(0),
  creativeCapital: integer("creative_capital").default(0),
  focusSlots: integer("focus_slots").default(3),
  usedFocusSlots: integer("used_focus_slots").default(0),
  // A&R Office fields
  arOfficeSlotUsed: boolean("ar_office_slot_used").default(false),
  arOfficeSourcingType: text("ar_office_sourcing_type"),
  arOfficePrimaryGenre: text("ar_office_primary_genre"),
  arOfficeSecondaryGenre: text("ar_office_secondary_genre"),
  arOfficeOperationStart: bigint("ar_office_operation_start", { mode: "number" }),
  playlistAccess: text("playlist_access").default("none"), // none, niche, mid, flagship
  pressAccess: text("press_access").default("none"), // none, blogs, mid_tier, national
  venueAccess: text("venue_access").default("none"), // none, clubs, theaters, arenas
  campaignType: text("campaign_type").default("Balanced"), // Commercial, Critical, Balanced
  rngSeed: text("rng_seed"),
  campaignCompleted: boolean("campaign_completed").default(false),
  flags: jsonb("flags").default('{}'), // Game flags for delayed effects
  weeklyStats: jsonb("weekly_stats").default('{}'), // Track weekly performance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for producer tier performance optimization
  reputationLookupIdx: sql`CREATE INDEX IF NOT EXISTS "idx_game_states_reputation_lookup" ON ${table} ("id", "reputation")`,
  userReputationIdx: sql`CREATE INDEX IF NOT EXISTS "idx_game_states_user_reputation" ON ${table} ("user_id", "reputation", "current_week")`,
}));

export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").references(() => gameStates.id, { onDelete: "cascade" }).notNull(),
  week: integer("week").notNull(),
  category: text("category").notNull(),
  sender: text("sender").notNull(),
  senderRoleId: text("sender_role_id"),
  subject: text("subject").notNull(),
  preview: text("preview"),
  body: jsonb("body").notNull(),
  metadata: jsonb("metadata").default('{}'),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  gameIdx: sql`CREATE INDEX IF NOT EXISTS "idx_emails_game_id" ON ${table} ("game_id")`,
  unreadIdx: sql`CREATE INDEX IF NOT EXISTS "idx_emails_game_is_read" ON ${table} ("game_id", "is_read")`,
  weekIdx: sql`CREATE INDEX IF NOT EXISTS "idx_emails_game_week" ON ${table} ("game_id", "week")`,
}));

// TODO: Legacy executive state persisted for compatibility while the client UI is rebuilt (UI removed 2025-09-19).
// Executives table
export const executives = pgTable("executives", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").references(() => gameStates.id),
  role: text("role"), // 'head_of_ar', 'cmo', 'cco', 'head_distribution'
  level: integer("level").default(1),
  mood: integer("mood").default(50), // 0-100
  loyalty: integer("loyalty").default(50), // 0-100
  lastActionWeek: integer("last_action_week"),
  metadata: jsonb("metadata"), // For personality traits, history
});

// Chart entries table for music charts
export const chartEntries = pgTable("chart_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  songId: uuid("song_id").references(() => songs.id, { onDelete: "cascade" }), // Made optional for competitor songs
  gameId: uuid("game_id").references(() => gameStates.id, { onDelete: "cascade" }).notNull(),
  chartWeek: date("chart_week").notNull(), // DATE format for weekly snapshots
  streams: integer("streams").notNull(), // Stream count for chart calculation
  position: integer("position"), // Chart position 1-100+, nullable if not charting
  isCharting: boolean("is_charting").generatedAlwaysAs(sql`position IS NOT NULL AND position <= 100`),
  isDebut: boolean("is_debut").default(false), // First-time charting
  movement: integer("movement").default(0), // Position change from previous week
  isCompetitorSong: boolean("is_competitor_song").default(false), // Distinguishes competitor vs player songs
  competitorTitle: text("competitor_title"), // Title for competitor songs (when songId is null)
  competitorArtist: text("competitor_artist"), // Artist for competitor songs (when songId is null)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to enforce idempotency and prevent duplicates with game partitioning
  // For player songs: unique by gameId + songId + chartWeek
  chartEntriesUniquePlayerIdx: uniqueIndex('idx_chart_entries_unique_player').on(table.gameId, table.songId, table.chartWeek),
  // For competitor songs: unique by gameId + chartWeek + competitorTitle + competitorArtist (where songId IS NULL)
  chartEntriesUniqueCompetitorIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_chart_entries_unique_competitor" ON ${table} ("game_id", "chart_week", "competitor_title", "competitor_artist") WHERE "song_id" IS NULL`,
  // Performance indexes for chart queries
  chartEntriesGameWeekPositionIdx: sql`CREATE INDEX IF NOT EXISTS "idx_chart_entries_game_week_position" ON ${table} ("game_id", "chart_week", "position") WHERE "position" IS NOT NULL`,
  chartEntriesWeekPositionIdx: sql`CREATE INDEX IF NOT EXISTS "idx_chart_entries_week_position" ON ${table} ("chart_week", "position") WHERE "position" IS NOT NULL`,
  chartEntriesStreamRankIdx: sql`CREATE INDEX IF NOT EXISTS "idx_chart_entries_stream_rank" ON ${table} ("chart_week", "streams" DESC)`,
}));

// Music Labels table
export const musicLabels = pgTable("music_labels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  gameId: uuid("game_id").references(() => gameStates.id, { onDelete: "cascade" }).notNull().unique(),
  foundedWeek: integer("founded_week").default(1),
  foundedYear: integer("founded_year"),
  description: text("description"),
  genreFocus: text("genre_focus"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Weekly actions (for tracking player choices)
export const weeklyActions = pgTable("weekly_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").references(() => gameStates.id),
  week: integer("week").notNull(),
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
  moodEvents: many(moodEvents),
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

export const weeklyActionsRelations = relations(weeklyActions, ({ one }) => ({
  gameState: one(gameStates, {
    fields: [weeklyActions.gameId],
    references: [gameStates.id],
  }),
}));

export const moodEventsRelations = relations(moodEvents, ({ one }) => ({
  artist: one(artists, {
    fields: [moodEvents.artistId],
    references: [artists.id],
  }),
  gameState: one(gameStates, {
    fields: [moodEvents.gameId],
    references: [gameStates.id],
  }),
}));

export const chartEntriesRelations = relations(chartEntries, ({ one }) => ({
  song: one(songs, {
    fields: [chartEntries.songId],
    references: [songs.id],
  }),
  gameState: one(gameStates, {
    fields: [chartEntries.gameId],
    references: [gameStates.id],
  }),
}));

export const emailsRelations = relations(emails, ({ one }) => ({
  gameState: one(gameStates, {
    fields: [emails.gameId],
    references: [gameStates.id],
  }),
}));

export const musicLabelsRelations = relations(musicLabels, ({ one }) => ({
  gameState: one(gameStates, {
    fields: [musicLabels.gameId],
    references: [gameStates.id],
  }),
}));

export const gameStatesRelations = relations(gameStates, ({ one, many }) => ({
  user: one(users, {
    fields: [gameStates.userId],
    references: [users.id],
  }),
  musicLabel: one(musicLabels, {
    fields: [gameStates.id],
    references: [musicLabels.gameId],
  }),
  artists: many(artists),
  songs: many(songs),
  releases: many(releases),
  moodEvents: many(moodEvents),
  chartEntries: many(chartEntries),
  weeklyActions: many(weeklyActions),
  emails: many(emails),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  clerkId: true,
  email: true,
  username: true,
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

export const insertEmailSchema = createInsertSchema(emails, {
  metadata: (schema) => schema.metadata.default({}),
  preview: (schema) => schema.preview.default(null),
  senderRoleId: (schema) => schema.senderRoleId.default(null),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWeeklyActionSchema = createInsertSchema(weeklyActions).omit({
  id: true,
  createdAt: true,
});

// TODO: Remove once executive persistence is retired with the new systems rollout.
export const insertExecutiveSchema = createInsertSchema(executives).omit({
  id: true,
});

export const insertMoodEventSchema = createInsertSchema(moodEvents).omit({
  id: true,
  createdAt: true,
});

export const insertChartEntrySchema = createInsertSchema(chartEntries).omit({
  id: true,
  createdAt: true,
});

export const insertMusicLabelSchema = createInsertSchema(musicLabels).omit({
  id: true,
  createdAt: true,
});

export const labelRequestSchema = createInsertSchema(musicLabels).pick({
  name: true,
  description: true,
  genreFocus: true,
  foundedWeek: true,
  foundedYear: true,
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

// TODO: Clean up once the dialogue schema is retired with the executive system overhaul.
export type DialogueChoice = typeof dialogueChoices.$inferSelect;

export type GameEvent = typeof gameEvents.$inferSelect;

export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;

export type WeeklyAction = typeof weeklyActions.$inferSelect;
export type InsertWeeklyAction = z.infer<typeof insertWeeklyActionSchema>;

export type MoodEvent = typeof moodEvents.$inferSelect;
export type InsertMoodEvent = z.infer<typeof insertMoodEventSchema>;

export type ChartEntry = typeof chartEntries.$inferSelect;
export type InsertChartEntry = z.infer<typeof insertChartEntrySchema>;

export type MusicLabel = typeof musicLabels.$inferSelect;
export type InsertMusicLabel = z.infer<typeof insertMusicLabelSchema>;
export type LabelRequest = z.infer<typeof labelRequestSchema>;

export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
