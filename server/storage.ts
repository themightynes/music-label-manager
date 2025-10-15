import {
  users, gameSaves, artists, roles, projects, dialogueChoices,
  gameEvents, gameStates, weeklyActions, songs, releases, releaseSongs, executives, chartEntries, musicLabels, emails, moodEvents,
  type User, type InsertUser, type GameSave, type InsertGameSave,
  type Artist, type InsertArtist, type Project, type InsertProject,
  type GameState, type InsertGameState, type WeeklyAction, type InsertWeeklyAction,
  type DialogueChoice, type GameEvent, type Role,
  type Song, type InsertSong, type Release, type InsertRelease,
  type ReleaseSong, type InsertReleaseSong, type ChartEntry as DbChartEntry, type InsertChartEntry,
  type MusicLabel, type InsertMusicLabel, type Email, type InsertEmail,
  type MoodEvent, type InsertMoodEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, sql, lte } from "drizzle-orm";
import type { ReleasedSongData } from "@shared/engine/ChartService";

export type GameSaveSummary = Pick<GameSave, "id" | "name" | "week" | "isAutosave" | "createdAt" | "updatedAt">;

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByClerkId(clerkId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Game saves
  getGameSaves(userId: string): Promise<GameSaveSummary[]>;
  getGameSave(id: string): Promise<GameSave | undefined>;
  getGameSaveForUser(id: string, userId: string): Promise<GameSave | undefined>;
  createGameSave(gameSave: InsertGameSave & { userId: string }): Promise<GameSave>;
  updateGameSave(id: string, gameSave: Partial<InsertGameSave>): Promise<GameSave>;
  deleteGameSave(id: string, userId: string): Promise<number>;
  purgeOldAutosaves(userId: string, gameId: string, keep: number): Promise<void>;

  // Game state
  getGameState(id: string): Promise<GameState | undefined>;
  createGameState(gameState: InsertGameState, dbTransaction?: any): Promise<GameState>;
  updateGameState(id: string, gameState: Partial<InsertGameState>): Promise<GameState>;

  // Artists
  getArtistsByGame(gameId: string): Promise<Artist[]>;
  getArtist(id: string): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  updateArtist(id: string, artist: Partial<InsertArtist>): Promise<Artist>;

  // Projects
  getProjectsByGame(gameId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  getActiveRecordingProjects(gameId: string): Promise<Project[]>;

  // Songs 
  getSongsByGame(gameId: string): Promise<Song[]>;
  getSongsByArtist(artistId: string, gameId: string): Promise<Song[]>;
  getSong(id: string): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: string, song: Partial<InsertSong>): Promise<Song>;
  getReleasedSongs(gameId: string): Promise<Song[]>;
  getSongsByProject(projectId: string): Promise<Song[]>;
  updateSongs(songUpdates: { songId: string; [key: string]: any }[], dbTransaction?: any): Promise<void>;

  // Releases
  getReleasesByGame(gameId: string, dbTransaction?: any): Promise<Release[]>;
  getReleasesByArtist(artistId: string, gameId: string): Promise<Release[]>;
  getRelease(id: string): Promise<Release | undefined>;
  createRelease(release: InsertRelease): Promise<Release>;
  updateRelease(id: string, release: Partial<InsertRelease>): Promise<Release>;
  getPlannedReleases(gameId: string, week: number, dbTransaction?: any): Promise<Release[]>;
  getSongsByRelease(releaseId: string, dbTransaction?: any): Promise<Song[]>;
  updateReleaseStatus(releaseId: string, status: string, metadata?: any, dbTransaction?: any): Promise<Release>;

  // Release Songs (junction)
  getReleaseSongs(releaseId: string): Promise<ReleaseSong[]>;
  getReleaseSongsByGame(gameId: string): Promise<ReleaseSong[]>;
  createReleaseSong(releaseSong: InsertReleaseSong): Promise<ReleaseSong>;
  deleteReleaseSong(releaseId: string, songId: string): Promise<void>;

  // Roles
  getRolesByGame(gameId: string): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  updateRole(id: string, role: Partial<Role>): Promise<Role>;

  // Dialogue and events
  getDialogueChoices(roleType: string, sceneId?: string): Promise<DialogueChoice[]>;
  getGameEvents(): Promise<GameEvent[]>;

  // Weekly actions
  getWeeklyActions(gameId: string, week?: number): Promise<WeeklyAction[]>;
  createWeeklyAction(action: InsertWeeklyAction): Promise<WeeklyAction>;

  // Chart operations
  getReleasedSongsByGame(gameId: string, dbTransaction?: any): Promise<ReleasedSongData[]>;
  createChartEntries(entries: InsertChartEntry[], dbTransaction?: any): Promise<void>;
  getChartEntriesBySongAndGame(songId: string, gameId: string, dbTransaction?: any): Promise<DbChartEntry[]>;
  getChartEntriesByWeekAndGame(chartWeek: Date, gameId: string, dbTransaction?: any): Promise<DbChartEntry[]>;
  getChartEntriesBySongsAndGame(songIds: string[], gameId: string, dbTransaction?: any): Promise<DbChartEntry[]>;

  // Music Labels
  getMusicLabel(gameId: string): Promise<MusicLabel | undefined>;
  createMusicLabel(label: InsertMusicLabel, dbTransaction?: any): Promise<MusicLabel>;
  updateMusicLabel(gameId: string, label: Partial<InsertMusicLabel>): Promise<MusicLabel | undefined>;

  // Emails
  getEmailsByGame(gameId: string, params?: {
    isRead?: boolean;
    category?: string;
    week?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ emails: Email[]; total: number; unreadCount: number }>;
  getEmailById(gameId: string, emailId: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail, dbTransaction?: any): Promise<Email>;
  createEmails(emails: InsertEmail[], dbTransaction?: any): Promise<Email[]>;
  markEmailRead(gameId: string, emailId: string, isRead: boolean): Promise<Email>;
  deleteEmail(gameId: string, emailId: string): Promise<void>;

  // Mood Events
  createMoodEvent(moodEvent: InsertMoodEvent, dbTransaction?: any): Promise<MoodEvent>;
  getMoodEventsByGame(gameId: string): Promise<MoodEvent[]>;
  getMoodEventsByArtist(artistId: string, gameId: string): Promise<MoodEvent[]>;
  getGlobalMoodEvents(gameId: string): Promise<MoodEvent[]>;
  getMoodEventsByWeekRange(gameId: string, startWeek: number, endWeek: number): Promise<MoodEvent[]>;
}

export class DatabaseStorage implements IStorage {
  private db: typeof db;

  constructor(database?: typeof db) {
    // Allow injecting a database connection for testing
    // If not provided, use the default production db
    this.db = database || db;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.clerkId, clerkId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  // Game saves
  async getGameSaves(userId: string): Promise<GameSaveSummary[]> {
    return await this.db
      .select({
        id: gameSaves.id,
        name: gameSaves.name,
        week: gameSaves.week,
        isAutosave: gameSaves.isAutosave,
        createdAt: gameSaves.createdAt,
        updatedAt: gameSaves.updatedAt,
      })
      .from(gameSaves)
      .where(eq(gameSaves.userId, userId))
      .orderBy(desc(gameSaves.updatedAt));
  }

  async getGameSave(id: string): Promise<GameSave | undefined> {
    const [save] = await this.db.select().from(gameSaves).where(eq(gameSaves.id, id));
    return save || undefined;
  }

  async getGameSaveForUser(id: string, userId: string): Promise<GameSave | undefined> {
    const [save] = await this.db
      .select()
      .from(gameSaves)
      .where(and(eq(gameSaves.id, id), eq(gameSaves.userId, userId)))
      .limit(1);
    return save || undefined;
  }

  async createGameSave(gameSave: InsertGameSave & { userId: string }): Promise<GameSave> {
    const [save] = await this.db.insert(gameSaves).values(gameSave).returning();
    return save;
  }

  async updateGameSave(id: string, gameSave: Partial<InsertGameSave>): Promise<GameSave> {
    const [save] = await this.db.update(gameSaves)
      .set({ ...gameSave, updatedAt: new Date() })
      .where(eq(gameSaves.id, id))
      .returning();
    return save;
  }

  async deleteGameSave(id: string, userId: string): Promise<number> {
    const deleted = await this.db
      .delete(gameSaves)
      .where(and(eq(gameSaves.id, id), eq(gameSaves.userId, userId)))
      .returning({ id: gameSaves.id });
    return deleted.length;
  }

  async purgeOldAutosaves(userId: string, gameId: string, keep: number): Promise<void> {
    if (keep <= 0) {
      return;
    }

    const autosaves = await this.db
      .select()
      .from(gameSaves)
      .where(and(eq(gameSaves.userId, userId), eq(gameSaves.isAutosave, true)))
      .orderBy(desc(gameSaves.updatedAt));

    const idsToDelete: string[] = [];
    let seenForGame = 0;

    for (const save of autosaves) {
      const snapshotGameId = (save.gameState as any)?.gameState?.id;
      if (snapshotGameId !== gameId) {
        continue;
      }

      if (seenForGame < keep) {
        seenForGame += 1;
        continue;
      }

      idsToDelete.push(save.id);
    }

    if (idsToDelete.length > 0) {
      await this.db.delete(gameSaves).where(inArray(gameSaves.id, idsToDelete));
    }
  }

  // Game state
  async getGameState(id: string): Promise<GameState | undefined> {
    const [state] = await this.db.select().from(gameStates).where(eq(gameStates.id, id));
    return state || undefined;
  }

  async createGameState(gameState: InsertGameState, dbTransaction?: any): Promise<GameState> {
    const dbContext = dbTransaction || this.db;
    const [state] = await dbContext.insert(gameStates).values(gameState).returning();
    return state;
  }

  async updateGameState(id: string, gameState: Partial<InsertGameState>): Promise<GameState> {
    console.log('[Storage.updateGameState] Updating game:', id);
    console.log('[Storage.updateGameState] Updates:', gameState);
    
    const result = await this.db.update(gameStates)
      .set({ ...gameState, updatedAt: new Date() })
      .where(eq(gameStates.id, id))
      .returning();
    
    console.log('[Storage.updateGameState] Update result:', result);
    console.log('[Storage.updateGameState] Number of rows updated:', result.length);
    
    if (!result || result.length === 0) {
      console.error('[Storage.updateGameState] No rows updated for game ID:', id);
      // Try to fetch the game to see if it exists
      const [existingGame] = await this.db.select().from(gameStates).where(eq(gameStates.id, id));
      if (!existingGame) {
        console.error('[Storage.updateGameState] Game does not exist in database:', id);
      }
      return null as any;
    }
    
    const [state] = result;
    return state;
  }

  // Artists
  async getArtistsByGame(gameId: string): Promise<Artist[]> {
    return await this.db.select().from(artists).where(eq(artists.gameId, gameId));
  }

  async getArtist(id: string): Promise<Artist | undefined> {
    const [artist] = await this.db.select().from(artists).where(eq(artists.id, id));
    return artist || undefined;
  }

  async createArtist(artist: InsertArtist): Promise<Artist> {
    const [newArtist] = await this.db.insert(artists).values(artist).returning();
    return newArtist;
  }

  async updateArtist(id: string, artist: Partial<InsertArtist>): Promise<Artist> {
    const [updatedArtist] = await this.db.update(artists)
      .set(artist)
      .where(eq(artists.id, id))
      .returning();
    return updatedArtist;
  }

  // Projects
  async getProjectsByGame(gameId: string): Promise<Project[]> {
    return await this.db.select().from(projects).where(eq(projects.gameId, gameId));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await this.db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await this.db.update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, id));
  }

  async getActiveRecordingProjects(gameId: string): Promise<Project[]> {
    console.log('[DEBUG] getActiveRecordingProjects query conditions:', {
      gameId,
      expectedStage: 'production',
      expectedTypes: ['Single', 'EP']
    });
    
    // First, let's check what projects exist at all for this game
    const allProjects = await this.db.select().from(projects)
      .where(eq(projects.gameId, gameId));
    
    console.log('[DEBUG] All projects for game:', allProjects.length);
    allProjects.forEach(project => {
      console.log('[DEBUG] Found project:', {
        title: project.title,
        type: project.type,
        stage: project.stage,
        gameId: project.gameId
      });
    });
    
    const result = await this.db.select().from(projects)
      .where(and(
        eq(projects.gameId, gameId),
        eq(projects.stage, 'production'),
        // Only recording projects (Singles and EPs create songs)
        inArray(projects.type, ['Single', 'EP'])
      ));
      
    console.log('[DEBUG] getActiveRecordingProjects found projects:', result.length);
    result.forEach(project => {
      console.log('[DEBUG] Active project:', {
        title: project.title,
        type: project.type,
        stage: project.stage,
        gameId: project.gameId,
        songCount: project.songCount,
        songsCreated: project.songsCreated,
        producerTier: project.producerTier,
        timeInvestment: project.timeInvestment,
        budgetPerSong: project.budgetPerSong
      });
    });
    
    return result;
  }

  // Songs
  async getSongsByGame(gameId: string): Promise<Song[]> {
    return await this.db.select().from(songs).where(eq(songs.gameId, gameId));
  }

  async getSongsByArtist(artistId: string, gameId: string): Promise<Song[]> {
    console.log('[DatabaseStorage] getSongsByArtist query:', { artistId, gameId });
    const result = await this.db.select().from(songs)
      .where(and(eq(songs.artistId, artistId), eq(songs.gameId, gameId)))
      .orderBy(desc(songs.createdAt));
    console.log('[DatabaseStorage] getSongsByArtist found:', result.length, 'songs');
    
    // Also try a simpler query to debug
    if (result.length === 0) {
      console.log('[DatabaseStorage] DEBUG: Checking all songs for this game...');
      const allGameSongs = await this.db.select().from(songs)
        .where(eq(songs.gameId, gameId));
      console.log('[DatabaseStorage] DEBUG: Total songs in game:', allGameSongs.length);
      if (allGameSongs.length > 0) {
        console.log('[DatabaseStorage] DEBUG: Sample song:', {
          id: allGameSongs[0].id,
          title: allGameSongs[0].title,
          artistId: allGameSongs[0].artistId,
          gameId: allGameSongs[0].gameId
        });
      }
    }
    
    return result;
  }

  async getSong(id: string): Promise<Song | undefined> {
    const [song] = await this.db.select().from(songs).where(eq(songs.id, id));
    return song || undefined;
  }

  async createSong(song: InsertSong): Promise<Song> {
    console.log('[DatabaseStorage] createSong called with:', {
      title: song.title,
      artistId: song.artistId,
      gameId: song.gameId,
      quality: song.quality
    });
    const [newSong] = await this.db.insert(songs).values(song).returning();
    console.log('[DatabaseStorage] Song created in DB:', {
      id: newSong.id,
      title: newSong.title,
      artistId: newSong.artistId,
      gameId: newSong.gameId
    });
    return newSong;
  }

  async updateSong(id: string, song: Partial<InsertSong>, dbTransaction?: any): Promise<Song> {
    const dbContext = dbTransaction || this.db;
    const [updatedSong] = await dbContext.update(songs)
      .set(song)
      .where(eq(songs.id, id))
      .returning();
    return updatedSong;
  }

  async getReleasedSongs(gameId: string): Promise<Song[]> {
    return await this.db.select().from(songs)
      .where(and(
        eq(songs.gameId, gameId),
        eq(songs.isReleased, true)
      ))
      .orderBy(desc(songs.releaseWeek));
  }

  async getSongsByProject(projectId: string): Promise<Song[]> {
    return await this.db.select().from(songs)
      .where(eq(songs.projectId, projectId))
      .orderBy(songs.createdAt);
  }

  async updateSongs(songUpdates: { songId: string; [key: string]: any }[], dbTransaction?: any): Promise<void> {
    const dbContext = dbTransaction || this.db;
    console.log(`[STORAGE] 💾💾💾 === UPDATING SONGS === 💾💾💾`);
    console.log(`[STORAGE] 📦 Total songs to update: ${songUpdates.length}`);
    console.log(`[STORAGE] 📌 Using transaction: ${!!dbTransaction}`);
    
    // Batch update songs with their new metrics
    for (let i = 0; i < songUpdates.length; i++) {
      const update = songUpdates[i];
      const { songId, ...updateData } = update;
      
      console.log(`[STORAGE] 🎵 Song #${i + 1}/${songUpdates.length}: ${songId}`);
      console.log(`[STORAGE] 📝 Update data:`, {
        songId: songId,
        isReleased: updateData.isReleased,
        releaseWeek: updateData.releaseWeek,
        initialStreams: updateData.initialStreams,
        weeklyStreams: updateData.weeklyStreams,
        totalStreams: updateData.totalStreams,
        totalRevenue: updateData.totalRevenue,
        lastWeekRevenue: updateData.lastWeekRevenue,
        ...Object.keys(updateData).filter(k => !['isReleased', 'releaseWeek', 'initialStreams', 'weeklyStreams', 'totalStreams', 'totalRevenue', 'lastWeekRevenue'].includes(k))
          .reduce((obj, key) => ({ ...obj, [key]: updateData[key] }), {})
      });
      
      try {
        const result = await dbContext.update(songs)
          .set(updateData)
          .where(eq(songs.id, songId));
        console.log(`[STORAGE] ✅ Song ${songId} updated successfully`);
      } catch (error) {
        console.error(`[STORAGE] ❌ Failed to update song ${songId}:`, error);
        throw error;
      }
    }
    
    console.log(`[STORAGE] 🎉 === UPDATE COMPLETE === 🎉`);
    console.log(`[STORAGE] 📊 Successfully updated ${songUpdates.length} songs`);
  }

  // Releases
  async getReleasesByGame(gameId: string, dbTransaction?: any): Promise<Release[]> {
    const dbContext = dbTransaction || this.db;
    return await dbContext.select().from(releases).where(eq(releases.gameId, gameId));
  }

  async getReleasesByArtist(artistId: string, gameId: string): Promise<Release[]> {
    return await this.db.select().from(releases)
      .where(and(eq(releases.artistId, artistId), eq(releases.gameId, gameId)))
      .orderBy(desc(releases.createdAt));
  }

  async getRelease(id: string): Promise<Release | undefined> {
    const [release] = await this.db.select().from(releases).where(eq(releases.id, id));
    return release || undefined;
  }

  async createRelease(release: InsertRelease): Promise<Release> {
    const [newRelease] = await this.db.insert(releases).values(release).returning();
    return newRelease;
  }

  async updateRelease(id: string, release: Partial<InsertRelease>): Promise<Release> {
    const [updatedRelease] = await this.db.update(releases)
      .set(release)
      .where(eq(releases.id, id))
      .returning();
    return updatedRelease;
  }

  async getPlannedReleases(gameId: string, week: number, dbTransaction?: any): Promise<Release[]> {
    const dbContext = dbTransaction || this.db;
    console.log(`[STORAGE] getPlannedReleases: gameId=${gameId}, week=${week}, usingTransaction=${!!dbTransaction}`);
    
    const result = await dbContext.select().from(releases)
      .where(and(
        eq(releases.gameId, gameId),
        eq(releases.status, 'planned'),
        lte(releases.releaseWeek, week)
      ))
      .orderBy(releases.createdAt);
    
    const overdueCount = result.filter((r: any) => r.releaseWeek && r.releaseWeek < week).length;
    console.log(`[STORAGE] getPlannedReleases: found ${result.length} releases (${overdueCount} overdue)`);
    
    if (overdueCount > 0) {
      console.log(`[STORAGE] ✅ OVERDUE RELEASE DETECTION: Processing ${overdueCount} releases that should have been executed in previous weeks`);
    }
    return result;
  }

  async getSongsByRelease(releaseId: string, dbTransaction?: any): Promise<Song[]> {
    const dbContext = dbTransaction || this.db;
    console.log(`[STORAGE] getSongsByRelease: releaseId=${releaseId}, usingTransaction=${!!dbTransaction}`);
    
    // First, try to get songs from the junction table (proper releases)
    const junctionResults = await dbContext.select()
    .from(songs)
    .innerJoin(releaseSongs, eq(songs.id, releaseSongs.songId))
    .where(eq(releaseSongs.releaseId, releaseId))
    .orderBy(releaseSongs.trackNumber);
    
    const junctionSongs = junctionResults.map((result: any) => result.songs);
    console.log(`[STORAGE] getSongsByRelease: found ${junctionSongs.length} songs via junction table`);
    
    // If junction table has songs, return them
    if (junctionSongs.length > 0) {
      return junctionSongs;
    }
    
    // Fallback: check direct releaseId field on songs (for legacy/incomplete data)
    console.log(`[STORAGE] getSongsByRelease: falling back to direct releaseId field`);
    const directResults = await dbContext.select()
    .from(songs)
    .where(eq(songs.releaseId, releaseId))
    .orderBy(songs.createdAt);
    
    console.log(`[STORAGE] getSongsByRelease: found ${directResults.length} songs via direct releaseId field`);
    return directResults;
  }

  async updateReleaseStatus(releaseId: string, status: string, metadata?: any, dbTransaction?: any): Promise<Release> {
    const dbContext = dbTransaction || this.db;
    console.log(`[STORAGE] updateReleaseStatus: releaseId=${releaseId}, status=${status}, usingTransaction=${!!dbTransaction}`);
    
    // First, get the existing release to preserve its metadata
    const [existingRelease] = await dbContext.select().from(releases)
      .where(eq(releases.id, releaseId));
    
    const updateData: Partial<InsertRelease> = {
      status
    };

    // Merge new metadata with existing metadata instead of replacing it
    if (metadata) {
      const existingMetadata = (existingRelease?.metadata as any) || {};
      updateData.metadata = {
        ...existingMetadata,  // Preserve existing metadata (including leadSingleStrategy)
        ...metadata,          // Add new metadata fields
        executedAt: new Date().toISOString()
      };
    }

    const [updatedRelease] = await dbContext.update(releases)
      .set(updateData)
      .where(eq(releases.id, releaseId))
      .returning();
    
    console.log(`[STORAGE] updateReleaseStatus: successfully updated release to status=${updatedRelease.status}`);
    return updatedRelease;
  }

  // Release Songs (junction)
  async getReleaseSongs(releaseId: string): Promise<ReleaseSong[]> {
    return await this.db.select().from(releaseSongs)
      .where(eq(releaseSongs.releaseId, releaseId))
      .orderBy(releaseSongs.trackNumber);
  }

  async getReleaseSongsByGame(gameId: string): Promise<ReleaseSong[]> {
    const rows = await this.db
      .select({
        releaseId: releaseSongs.releaseId,
        songId: releaseSongs.songId,
        trackNumber: releaseSongs.trackNumber,
        isSingle: releaseSongs.isSingle
      })
      .from(releaseSongs)
      .innerJoin(releases, eq(releaseSongs.releaseId, releases.id))
      .where(eq(releases.gameId, gameId))
      .orderBy(releaseSongs.releaseId, releaseSongs.trackNumber);

    return rows.map(row => ({
      releaseId: row.releaseId,
      songId: row.songId,
      trackNumber: row.trackNumber,
      isSingle: row.isSingle
    }));
  }

  async createReleaseSong(releaseSong: InsertReleaseSong): Promise<ReleaseSong> {
    const [newReleaseSong] = await this.db.insert(releaseSongs).values(releaseSong).returning();
    return newReleaseSong;
  }

  async deleteReleaseSong(releaseId: string, songId: string): Promise<void> {
    await this.db.delete(releaseSongs)
      .where(and(
        eq(releaseSongs.releaseId, releaseId),
        eq(releaseSongs.songId, songId)
      ));
  }

  // Roles
  async getRolesByGame(gameId: string): Promise<Role[]> {
    return await this.db.select().from(roles).where(eq(roles.gameId, gameId));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await this.db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async updateRole(id: string, role: Partial<Role>): Promise<Role> {
    const [updatedRole] = await this.db.update(roles)
      .set(role)
      .where(eq(roles.id, id))
      .returning();
    return updatedRole;
  }

  // Dialogue and events
  async getDialogueChoices(roleType: string, sceneId?: string): Promise<DialogueChoice[]> {
    const conditions = sceneId 
      ? and(eq(dialogueChoices.roleType, roleType), eq(dialogueChoices.sceneId, sceneId))
      : eq(dialogueChoices.roleType, roleType);
    
    return await this.db.select().from(dialogueChoices).where(conditions);
  }

  async getGameEvents(): Promise<GameEvent[]> {
    return await this.db.select().from(gameEvents);
  }

  // Weekly actions
  async getWeeklyActions(gameId: string, week?: number): Promise<WeeklyAction[]> {
    const conditions = week 
      ? and(eq(weeklyActions.gameId, gameId), eq(weeklyActions.week, week))
      : eq(weeklyActions.gameId, gameId);
    
    return await this.db.select().from(weeklyActions).where(conditions);
  }

  async createWeeklyAction(action: InsertWeeklyAction): Promise<WeeklyAction> {
    const [newAction] = await this.db.insert(weeklyActions).values(action).returning();
    return newAction;
  }

  // Executives
  async getExecutivesByGame(gameId: string): Promise<any[]> {
    console.log('[STORAGE] getExecutivesByGame called with gameId:', gameId);
    const result = await this.db.select().from(executives).where(eq(executives.gameId, gameId));
    console.log('[STORAGE] Executives found:', result);
    console.log('[STORAGE] Number of executives:', result ? result.length : 0);
    return result;
  }

  async getExecutive(execId: string): Promise<any | null> {
    console.log('[STORAGE] getExecutive called with execId:', execId);
    const result = await this.db.select().from(executives)
      .where(eq(executives.id, execId))
      .limit(1);
    console.log('[STORAGE] Executive found:', result[0] || null);
    return result[0] || null;
  }

  async updateExecutive(
    execId: string,
    updates: Partial<any>,
    transaction?: any
  ): Promise<void> {
    console.log('[STORAGE] updateExecutive called with execId:', execId, 'updates:', updates);
    const dbToUse = transaction || db;
    await dbToUse.update(executives)
      .set(updates)
      .where(eq(executives.id, execId));
    console.log('[STORAGE] Executive updated successfully');
  }

  // Chart operations implementation
  async getReleasedSongsByGame(gameId: string, dbTransaction?: any): Promise<ReleasedSongData[]> {
    const dbToUse = dbTransaction || this.db;
    const releasedSongs = await dbToUse
      .select({
        id: songs.id,
        title: songs.title,
        artistName: artists.name,
        totalStreams: songs.totalStreams,
        weeklyStreams: songs.weeklyStreams
      })
      .from(songs)
      .innerJoin(artists, eq(songs.artistId, artists.id))
      .where(
        and(
          eq(songs.gameId, gameId),
          eq(songs.isReleased, true)
        )
      );

    return releasedSongs.map((song: any) => ({
      id: song.id,
      title: song.title,
      artistName: song.artistName,
      totalStreams: song.totalStreams || 0,
      weeklyStreams: song.weeklyStreams || 0
    }));
  }

  async createChartEntries(entries: InsertChartEntry[], dbTransaction?: any): Promise<void> {
    if (entries.length === 0) return;

    const dbToUse = dbTransaction || this.db;

    // Split entries by type to use different conflict targets
    const playerEntries = entries.filter((e: any) => !e.isCompetitorSong);
    const competitorEntries = entries.filter((e: any) => e.isCompetitorSong);

    // Insert player entries with songId-based conflict resolution
    if (playerEntries.length > 0) {
      await dbToUse
        .insert(chartEntries)
        .values(playerEntries)
        .onConflictDoNothing({
          target: [chartEntries.gameId, chartEntries.songId, chartEntries.chartWeek]
        });
    }

    // Insert competitor entries with competitor-specific conflict resolution
    if (competitorEntries.length > 0) {
      await dbToUse
        .insert(chartEntries)
        .values(competitorEntries)
        .onConflictDoNothing();
        // Note: Competitor uniqueness is enforced by the partial unique index on the database level
    }
  }

  async getChartEntriesBySongAndGame(songId: string, gameId: string, dbTransaction?: any): Promise<DbChartEntry[]> {
    const dbToUse = dbTransaction || this.db;
    return await dbToUse
      .select()
      .from(chartEntries)
      .where(
        and(
          eq(chartEntries.songId, songId),
          eq(chartEntries.gameId, gameId)
        )
      )
      .orderBy(desc(chartEntries.chartWeek));
  }

  async getChartEntriesByWeekAndGame(chartWeek: Date, gameId: string, dbTransaction?: any): Promise<DbChartEntry[]> {
    const dbToUse = dbTransaction || this.db;
    // Convert Date to ISO string format (YYYY-MM-DD) for database comparison
    const chartWeekString = chartWeek.toISOString().split('T')[0];
    return await dbToUse
      .select()
      .from(chartEntries)
      .where(
        and(
          eq(chartEntries.chartWeek, chartWeekString),
          eq(chartEntries.gameId, gameId)
        )
      )
      .orderBy(
        sql`${chartEntries.position} IS NULL ASC`, // Nulls last
        chartEntries.position // Then by position ascending
      );
  }

  async getChartEntriesBySongsAndGame(songIds: string[], gameId: string, dbTransaction?: any): Promise<DbChartEntry[]> {
    if (songIds.length === 0) return [];

    const dbToUse = dbTransaction || this.db;
    return await dbToUse
      .select()
      .from(chartEntries)
      .where(
        and(
          inArray(chartEntries.songId, songIds),
          eq(chartEntries.gameId, gameId)
        )
      )
      .orderBy(
        chartEntries.songId,
        desc(chartEntries.chartWeek)
      );
  }

  // Email storage implementation
  async getEmailsByGame(
    gameId: string,
    params: {
      isRead?: boolean;
      category?: string;
      week?: number;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ emails: Email[]; total: number; unreadCount: number }> {
    const { isRead, category, week, limit = 50, offset = 0 } = params;
    const filters: any[] = [eq(emails.gameId, gameId)];

    if (typeof isRead === "boolean") {
      filters.push(eq(emails.isRead, isRead));
    }
    if (category) {
      filters.push(eq(emails.category, category));
    }
    if (typeof week === "number") {
      filters.push(eq(emails.week, week));
    }

    let whereClause = filters[0];
    if (filters.length > 1) {
      whereClause = and(...filters);
    }

    const resultLimit = typeof limit === "number" ? Math.max(limit, 0) : 50;
    const resultOffset = typeof offset === "number" ? Math.max(offset, 0) : 0;

    const [totalResult, unreadResult, emailRows] = await Promise.all([
      db.select({ value: sql<number>`count(*)::int` }).from(emails).where(whereClause),
      db.select({ value: sql<number>`count(*)::int` }).from(emails).where(and(eq(emails.gameId, gameId), eq(emails.isRead, false))),
      db.select().from(emails)
        .where(whereClause)
        .orderBy(desc(emails.createdAt))
        .limit(resultLimit)
        .offset(resultOffset)
    ]);

    const total = Number(totalResult[0]?.value ?? 0);
    const unreadCount = Number(unreadResult[0]?.value ?? 0);

    return {
      emails: emailRows,
      total,
      unreadCount,
    };
  }

  async getEmailById(gameId: string, emailId: string): Promise<Email | undefined> {
    const [email] = await this.db.select()
      .from(emails)
      .where(and(eq(emails.gameId, gameId), eq(emails.id, emailId)))
      .limit(1);

    return email || undefined;
  }

  async createEmail(emailInput: InsertEmail, dbTransaction?: any): Promise<Email> {
    const dbContext = dbTransaction || this.db;
    const [created] = await dbContext.insert(emails).values(emailInput).returning();
    return created;
  }

  async createEmails(emailInputs: InsertEmail[], dbTransaction?: any): Promise<Email[]> {
    if (emailInputs.length === 0) return [];

    const dbContext = dbTransaction || this.db;
    return await dbContext.insert(emails).values(emailInputs).returning();
  }

  async markEmailRead(gameId: string, emailId: string, isRead: boolean): Promise<Email> {
    const [updated] = await this.db.update(emails)
      .set({
        isRead,
        updatedAt: new Date(),
      })
      .where(and(eq(emails.gameId, gameId), eq(emails.id, emailId)))
      .returning();

    if (!updated) {
      throw new Error(`Email ${emailId} not found for game ${gameId}`);
    }

    return updated;
  }

  async deleteEmail(gameId: string, emailId: string): Promise<void> {
    await this.db.delete(emails)
      .where(and(eq(emails.gameId, gameId), eq(emails.id, emailId)));
  }

  // Music Labels implementation
  async getMusicLabel(gameId: string): Promise<MusicLabel | undefined> {
    const [label] = await this.db
      .select()
      .from(musicLabels)
      .where(eq(musicLabels.gameId, gameId));
    return label || undefined;
  }

  async createMusicLabel(label: InsertMusicLabel, dbTransaction?: any): Promise<MusicLabel> {
    const dbContext = dbTransaction || this.db;
    const [created] = await dbContext
      .insert(musicLabels)
      .values(label)
      .returning();
    return created;
  }

  async updateMusicLabel(gameId: string, label: Partial<InsertMusicLabel>): Promise<MusicLabel | undefined> {
    const [updated] = await this.db
      .update(musicLabels)
      .set(label)
      .where(eq(musicLabels.gameId, gameId))
      .returning();
    return updated || undefined;
  }

  // Mood Events
  async createMoodEvent(moodEvent: InsertMoodEvent, dbTransaction?: any): Promise<MoodEvent> {
    const dbContext = dbTransaction || this.db;
    const [created] = await dbContext
      .insert(moodEvents)
      .values(moodEvent)
      .returning();
    return created;
  }

  async getMoodEventsByGame(gameId: string): Promise<MoodEvent[]> {
    return await this.db
      .select()
      .from(moodEvents)
      .where(eq(moodEvents.gameId, gameId))
      .orderBy(desc(moodEvents.weekOccurred));
  }

  async getMoodEventsByArtist(artistId: string, gameId: string): Promise<MoodEvent[]> {
    return await this.db
      .select()
      .from(moodEvents)
      .where(
        and(
          eq(moodEvents.artistId, artistId),
          eq(moodEvents.gameId, gameId)
        )
      )
      .orderBy(desc(moodEvents.weekOccurred));
  }

  async getGlobalMoodEvents(gameId: string): Promise<MoodEvent[]> {
    return await this.db
      .select()
      .from(moodEvents)
      .where(
        and(
          eq(moodEvents.gameId, gameId),
          sql`${moodEvents.artistId} IS NULL`
        )
      )
      .orderBy(desc(moodEvents.weekOccurred));
  }

  async getMoodEventsByWeekRange(gameId: string, startWeek: number, endWeek: number): Promise<MoodEvent[]> {
    return await this.db
      .select()
      .from(moodEvents)
      .where(
        and(
          eq(moodEvents.gameId, gameId),
          sql`${moodEvents.weekOccurred} >= ${startWeek}`,
          sql`${moodEvents.weekOccurred} <= ${endWeek}`
        )
      )
      .orderBy(desc(moodEvents.weekOccurred));
  }
}

export const storage = new DatabaseStorage();
