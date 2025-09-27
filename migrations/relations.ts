import { relations } from "drizzle-orm/relations";
import { artists, projects, users, gameSaves, gameStates, releases, releaseSongs, songs, chartEntries, musicLabels, weeklyActions, executives, moodEvents } from "./schema";

export const projectsRelations = relations(projects, ({one, many}) => ({
	artist: one(artists, {
		fields: [projects.artistId],
		references: [artists.id]
	}),
	songs: many(songs),
}));

export const artistsRelations = relations(artists, ({many}) => ({
	projects: many(projects),
	songs: many(songs),
	moodEvents: many(moodEvents),
	releases: many(releases),
}));

export const gameSavesRelations = relations(gameSaves, ({one}) => ({
	user: one(users, {
		fields: [gameSaves.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	gameSaves: many(gameSaves),
	gameStates: many(gameStates),
}));

export const gameStatesRelations = relations(gameStates, ({one, many}) => ({
	user: one(users, {
		fields: [gameStates.userId],
		references: [users.id]
	}),
	songs: many(songs),
	chartEntries: many(chartEntries),
	musicLabels: many(musicLabels),
	weeklyActions: many(weeklyActions),
	executives: many(executives),
	moodEvents: many(moodEvents),
	releases: many(releases),
}));

export const releaseSongsRelations = relations(releaseSongs, ({one}) => ({
	release: one(releases, {
		fields: [releaseSongs.releaseId],
		references: [releases.id]
	}),
	song: one(songs, {
		fields: [releaseSongs.songId],
		references: [songs.id]
	}),
}));

export const releasesRelations = relations(releases, ({one, many}) => ({
	releaseSongs: many(releaseSongs),
	songs: many(songs),
	artist: one(artists, {
		fields: [releases.artistId],
		references: [artists.id]
	}),
	gameState: one(gameStates, {
		fields: [releases.gameId],
		references: [gameStates.id]
	}),
}));

export const songsRelations = relations(songs, ({one, many}) => ({
	releaseSongs: many(releaseSongs),
	artist: one(artists, {
		fields: [songs.artistId],
		references: [artists.id]
	}),
	gameState: one(gameStates, {
		fields: [songs.gameId],
		references: [gameStates.id]
	}),
	release: one(releases, {
		fields: [songs.releaseId],
		references: [releases.id]
	}),
	project: one(projects, {
		fields: [songs.projectId],
		references: [projects.id]
	}),
	chartEntries: many(chartEntries),
}));

export const chartEntriesRelations = relations(chartEntries, ({one}) => ({
	song: one(songs, {
		fields: [chartEntries.songId],
		references: [songs.id]
	}),
	gameState: one(gameStates, {
		fields: [chartEntries.gameId],
		references: [gameStates.id]
	}),
}));

export const musicLabelsRelations = relations(musicLabels, ({one}) => ({
	gameState: one(gameStates, {
		fields: [musicLabels.gameId],
		references: [gameStates.id]
	}),
}));

export const weeklyActionsRelations = relations(weeklyActions, ({one}) => ({
	gameState: one(gameStates, {
		fields: [weeklyActions.gameId],
		references: [gameStates.id]
	}),
}));

export const executivesRelations = relations(executives, ({one}) => ({
	gameState: one(gameStates, {
		fields: [executives.gameId],
		references: [gameStates.id]
	}),
}));

export const moodEventsRelations = relations(moodEvents, ({one}) => ({
	artist: one(artists, {
		fields: [moodEvents.artistId],
		references: [artists.id]
	}),
	gameState: one(gameStates, {
		fields: [moodEvents.gameId],
		references: [gameStates.id]
	}),
}));