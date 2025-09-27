import { pgTable, foreignKey, uuid, text, integer, jsonb, real, boolean, timestamp, unique, uniqueIndex, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	type: text().notNull(),
	artistId: uuid("artist_id"),
	stage: text().default('planning'),
	quality: integer().default(0),
	budget: integer().default(0),
	budgetUsed: integer("budget_used").default(0),
	budgetPerSong: integer("budget_per_song").default(0),
	totalCost: integer("total_cost").default(0),
	costUsed: integer("cost_used").default(0),
	dueWeek: integer("due_week"),
	startWeek: integer("start_week"),
	gameId: uuid("game_id"),
	metadata: jsonb(),
	songCount: integer("song_count").default(1),
	songsCreated: integer("songs_created").default(0),
	producerTier: text("producer_tier").default('local'),
	timeInvestment: text("time_investment").default('standard'),
	totalRevenue: integer("total_revenue").default(0),
	roiPercentage: real("roi_percentage").generatedAlwaysAs(sql`
CASE
    WHEN (total_cost > 0) THEN ((((total_revenue - total_cost))::real / (total_cost)::real) * (100)::double precision)
    ELSE NULL::double precision
END`),
	completionStatus: text("completion_status").default('active'),
}, (table) => [
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "projects_artist_id_artists_id_fk"
		}),
]);

export const dialogueChoices = pgTable("dialogue_choices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	roleType: text("role_type").notNull(),
	sceneId: text("scene_id").notNull(),
	choiceText: text("choice_text").notNull(),
	immediateEffects: jsonb("immediate_effects"),
	delayedEffects: jsonb("delayed_effects"),
	requirements: jsonb(),
});

export const gameSaves = pgTable("game_saves", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	gameState: jsonb("game_state").notNull(),
	week: integer().notNull(),
	isAutosave: boolean("is_autosave").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "game_saves_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const gameEvents = pgTable("game_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	type: text().default('side_story'),
	triggerConditions: jsonb("trigger_conditions"),
	choices: jsonb(),
	oneTime: boolean("one_time").default(true),
});

export const artists = pgTable("artists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	archetype: text().notNull(),
	mood: integer().default(50),
	loyalty: integer().default(50),
	popularity: integer().default(0),
	signedWeek: integer("signed_week"),
	isSigned: boolean("is_signed").default(false),
	weeklyFee: integer("weekly_fee").default(1200),
	gameId: uuid("game_id"),
	talent: integer().default(50),
	workEthic: integer("work_ethic").default(50),
	stress: integer().default(0),
	creativity: integer().default(50),
	massAppeal: integer("mass_appeal").default(50),
	lastAttentionWeek: integer("last_attention_week").default(1),
	experience: integer().default(0),
	moodHistory: jsonb("mood_history").default([]),
	lastMoodEvent: text("last_mood_event"),
	moodTrend: integer("mood_trend").default(0),
});

export const gameStates = pgTable("game_states", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	currentWeek: integer("current_week").default(1),
	money: integer().default(75000),
	reputation: integer().default(0),
	creativeCapital: integer("creative_capital").default(0),
	focusSlots: integer("focus_slots").default(3),
	usedFocusSlots: integer("used_focus_slots").default(0),
	playlistAccess: text("playlist_access").default('none'),
	pressAccess: text("press_access").default('none'),
	venueAccess: text("venue_access").default('none'),
	campaignType: text("campaign_type").default('Balanced'),
	rngSeed: text("rng_seed"),
	campaignCompleted: boolean("campaign_completed").default(false),
	flags: jsonb().default({}),
	weeklyStats: jsonb("weekly_stats").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "game_states_user_id_users_id_fk"
		}),
]);

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	title: text().notNull(),
	type: text().notNull(),
	relationship: integer().default(50),
	accessLevel: integer("access_level").default(0),
	gameId: uuid("game_id"),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	clerkId: text("clerk_id").notNull(),
	email: text().notNull(),
}, (table) => [
	unique("users_clerk_id_unique").on(table.clerkId),
]);

export const releaseSongs = pgTable("release_songs", {
	releaseId: uuid("release_id").notNull(),
	songId: uuid("song_id").notNull(),
	trackNumber: integer("track_number").notNull(),
	isSingle: boolean("is_single").default(false),
}, (table) => [
	foreignKey({
			columns: [table.releaseId],
			foreignColumns: [releases.id],
			name: "release_songs_release_id_releases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.songId],
			foreignColumns: [songs.id],
			name: "release_songs_song_id_songs_id_fk"
		}).onDelete("cascade"),
]);

export const songs = pgTable("songs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	artistId: uuid("artist_id").notNull(),
	gameId: uuid("game_id").notNull(),
	quality: integer().notNull(),
	genre: text(),
	mood: text(),
	createdWeek: integer("created_week"),
	producerTier: text("producer_tier").default('local'),
	timeInvestment: text("time_investment").default('standard'),
	isRecorded: boolean("is_recorded").default(false),
	isReleased: boolean("is_released").default(false),
	releaseId: uuid("release_id"),
	recordedAt: timestamp("recorded_at", { mode: 'string' }),
	releasedAt: timestamp("released_at", { mode: 'string' }),
	initialStreams: integer("initial_streams").default(0),
	totalStreams: integer("total_streams").default(0),
	totalRevenue: integer("total_revenue").default(0),
	weeklyStreams: integer("weekly_streams").default(0),
	lastWeekRevenue: integer("last_week_revenue").default(0),
	releaseWeek: integer("release_week"),
	projectId: uuid("project_id"),
	productionBudget: integer("production_budget").default(0),
	marketingAllocation: integer("marketing_allocation").default(0),
	totalInvestment: integer("total_investment").generatedAlwaysAs(sql`(production_budget + marketing_allocation)`),
	roiPercentage: real("roi_percentage").generatedAlwaysAs(sql`
CASE
    WHEN ((production_budget + marketing_allocation) > 0) THEN ((((total_revenue - (production_budget + marketing_allocation)))::real / ((production_budget + marketing_allocation))::real) * (100)::double precision)
    ELSE NULL::double precision
END`),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	awareness: integer().default(0).notNull(),
	breakthroughAchieved: boolean("breakthrough_achieved").default(false).notNull(),
	peakAwareness: integer("peak_awareness").default(0).notNull(),
	awarenessDecayRate: real("awareness_decay_rate").default(0.05).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "songs_artist_id_artists_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [gameStates.id],
			name: "songs_game_id_game_states_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.releaseId],
			foreignColumns: [releases.id],
			name: "songs_release_id_releases_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "songs_project_id_projects_id_fk"
		}).onDelete("set null"),
]);

export const chartEntries = pgTable("chart_entries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	songId: uuid("song_id"),
	gameId: uuid("game_id").notNull(),
	chartWeek: date("chart_week").notNull(),
	streams: integer().notNull(),
	position: integer(),
	isCharting: boolean("is_charting").generatedAlwaysAs(sql`(("position" IS NOT NULL) AND ("position" <= 100))`),
	isDebut: boolean("is_debut").default(false),
	movement: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	isCompetitorSong: boolean("is_competitor_song").default(false),
	competitorTitle: text("competitor_title"),
	competitorArtist: text("competitor_artist"),
}, (table) => [
	uniqueIndex("idx_chart_entries_unique_player").using("btree", table.gameId.asc().nullsLast().op("date_ops"), table.songId.asc().nullsLast().op("date_ops"), table.chartWeek.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.songId],
			foreignColumns: [songs.id],
			name: "chart_entries_song_id_songs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [gameStates.id],
			name: "chart_entries_game_id_game_states_id_fk"
		}).onDelete("cascade"),
]);

export const musicLabels = pgTable("music_labels", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	gameId: uuid("game_id").notNull(),
	foundedWeek: integer("founded_week").default(1),
	description: text(),
	genreFocus: text("genre_focus"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	foundedYear: integer("founded_year"),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [gameStates.id],
			name: "music_labels_game_id_game_states_id_fk"
		}).onDelete("cascade"),
	unique("music_labels_game_id_unique").on(table.gameId),
]);

export const weeklyActions = pgTable("weekly_actions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	gameId: uuid("game_id"),
	week: integer().notNull(),
	actionType: text("action_type").notNull(),
	targetId: uuid("target_id"),
	choiceId: uuid("choice_id"),
	results: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [gameStates.id],
			name: "weekly_actions_game_id_game_states_id_fk"
		}),
]);

export const executives = pgTable("executives", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	gameId: uuid("game_id"),
	role: text(),
	level: integer().default(1),
	mood: integer().default(50),
	loyalty: integer().default(50),
	lastActionWeek: integer("last_action_week"),
	metadata: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [gameStates.id],
			name: "executives_game_id_game_states_id_fk"
		}),
]);

export const moodEvents = pgTable("mood_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	artistId: uuid("artist_id"),
	gameId: uuid("game_id"),
	eventType: text("event_type").notNull(),
	moodChange: integer("mood_change").notNull(),
	moodBefore: integer("mood_before").notNull(),
	moodAfter: integer("mood_after").notNull(),
	description: text().notNull(),
	weekOccurred: integer("week_occurred").notNull(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "mood_events_artist_id_artists_id_fk"
		}),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [gameStates.id],
			name: "mood_events_game_id_game_states_id_fk"
		}),
]);

export const releases = pgTable("releases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	type: text().notNull(),
	artistId: uuid("artist_id").notNull(),
	gameId: uuid("game_id").notNull(),
	releaseWeek: integer("release_week"),
	totalQuality: integer("total_quality").default(0),
	marketingBudget: integer("marketing_budget").default(0),
	status: text().default('planned'),
	revenueGenerated: integer("revenue_generated").default(0),
	streamsGenerated: integer("streams_generated").default(0),
	peakChartPosition: integer("peak_chart_position"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "releases_artist_id_artists_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [gameStates.id],
			name: "releases_game_id_game_states_id_fk"
		}).onDelete("cascade"),
]);
