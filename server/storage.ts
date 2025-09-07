import { 
  users, gameSaves, artists, roles, projects, dialogueChoices, 
  gameEvents, gameStates, monthlyActions, songs, releases, releaseSongs, executives,
  type User, type InsertUser, type GameSave, type InsertGameSave,
  type Artist, type InsertArtist, type Project, type InsertProject,
  type GameState, type InsertGameState, type MonthlyAction, type InsertMonthlyAction,
  type DialogueChoice, type GameEvent, type Role,
  type Song, type InsertSong, type Release, type InsertRelease, 
  type ReleaseSong, type InsertReleaseSong
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, sql, lte } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Game saves
  getGameSaves(userId: string): Promise<GameSave[]>;
  getGameSave(id: string): Promise<GameSave | undefined>;
  createGameSave(gameSave: InsertGameSave & { userId: string }): Promise<GameSave>;
  updateGameSave(id: string, gameSave: Partial<InsertGameSave>): Promise<GameSave>;
  deleteGameSave(id: string): Promise<void>;

  // Game state
  getGameState(id: string): Promise<GameState | undefined>;
  createGameState(gameState: InsertGameState): Promise<GameState>;
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
  getPlannedReleases(gameId: string, month: number, dbTransaction?: any): Promise<Release[]>;
  getSongsByRelease(releaseId: string, dbTransaction?: any): Promise<Song[]>;
  updateReleaseStatus(releaseId: string, status: string, metadata?: any, dbTransaction?: any): Promise<Release>;

  // Release Songs (junction)
  getReleaseSongs(releaseId: string): Promise<ReleaseSong[]>;
  createReleaseSong(releaseSong: InsertReleaseSong): Promise<ReleaseSong>;
  deleteReleaseSong(releaseId: string, songId: string): Promise<void>;

  // Roles
  getRolesByGame(gameId: string): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  updateRole(id: string, role: Partial<Role>): Promise<Role>;

  // Dialogue and events
  getDialogueChoices(roleType: string, sceneId?: string): Promise<DialogueChoice[]>;
  getGameEvents(): Promise<GameEvent[]>;

  // Monthly actions
  getMonthlyActions(gameId: string, month?: number): Promise<MonthlyAction[]>;
  createMonthlyAction(action: InsertMonthlyAction): Promise<MonthlyAction>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Game saves
  async getGameSaves(userId: string): Promise<GameSave[]> {
    return await db.select().from(gameSaves)
      .where(eq(gameSaves.userId, userId))
      .orderBy(desc(gameSaves.updatedAt));
  }

  async getGameSave(id: string): Promise<GameSave | undefined> {
    const [save] = await db.select().from(gameSaves).where(eq(gameSaves.id, id));
    return save || undefined;
  }

  async createGameSave(gameSave: InsertGameSave & { userId: string }): Promise<GameSave> {
    const [save] = await db.insert(gameSaves).values(gameSave).returning();
    return save;
  }

  async updateGameSave(id: string, gameSave: Partial<InsertGameSave>): Promise<GameSave> {
    const [save] = await db.update(gameSaves)
      .set({ ...gameSave, updatedAt: new Date() })
      .where(eq(gameSaves.id, id))
      .returning();
    return save;
  }

  async deleteGameSave(id: string): Promise<void> {
    await db.delete(gameSaves).where(eq(gameSaves.id, id));
  }

  // Game state
  async getGameState(id: string): Promise<GameState | undefined> {
    const [state] = await db.select().from(gameStates).where(eq(gameStates.id, id));
    return state || undefined;
  }

  async createGameState(gameState: InsertGameState): Promise<GameState> {
    const [state] = await db.insert(gameStates).values(gameState).returning();
    return state;
  }

  async updateGameState(id: string, gameState: Partial<InsertGameState>): Promise<GameState> {
    const [state] = await db.update(gameStates)
      .set({ ...gameState, updatedAt: new Date() })
      .where(eq(gameStates.id, id))
      .returning();
    return state;
  }

  // Artists
  async getArtistsByGame(gameId: string): Promise<Artist[]> {
    return await db.select().from(artists).where(eq(artists.gameId, gameId));
  }

  async getArtist(id: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist || undefined;
  }

  async createArtist(artist: InsertArtist): Promise<Artist> {
    const [newArtist] = await db.insert(artists).values(artist).returning();
    return newArtist;
  }

  async updateArtist(id: string, artist: Partial<InsertArtist>): Promise<Artist> {
    const [updatedArtist] = await db.update(artists)
      .set(artist)
      .where(eq(artists.id, id))
      .returning();
    return updatedArtist;
  }

  // Projects
  async getProjectsByGame(gameId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.gameId, gameId));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db.update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async getActiveRecordingProjects(gameId: string): Promise<Project[]> {
    console.log('[DEBUG] getActiveRecordingProjects query conditions:', {
      gameId,
      expectedStage: 'production',
      expectedTypes: ['Single', 'EP']
    });
    
    // First, let's check what projects exist at all for this game
    const allProjects = await db.select().from(projects)
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
    
    const result = await db.select().from(projects)
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
    return await db.select().from(songs).where(eq(songs.gameId, gameId));
  }

  async getSongsByArtist(artistId: string, gameId: string): Promise<Song[]> {
    console.log('[DatabaseStorage] getSongsByArtist query:', { artistId, gameId });
    const result = await db.select().from(songs)
      .where(and(eq(songs.artistId, artistId), eq(songs.gameId, gameId)))
      .orderBy(desc(songs.createdAt));
    console.log('[DatabaseStorage] getSongsByArtist found:', result.length, 'songs');
    
    // Also try a simpler query to debug
    if (result.length === 0) {
      console.log('[DatabaseStorage] DEBUG: Checking all songs for this game...');
      const allGameSongs = await db.select().from(songs)
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
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song || undefined;
  }

  async createSong(song: InsertSong): Promise<Song> {
    console.log('[DatabaseStorage] createSong called with:', {
      title: song.title,
      artistId: song.artistId,
      gameId: song.gameId,
      quality: song.quality
    });
    const [newSong] = await db.insert(songs).values(song).returning();
    console.log('[DatabaseStorage] Song created in DB:', {
      id: newSong.id,
      title: newSong.title,
      artistId: newSong.artistId,
      gameId: newSong.gameId
    });
    return newSong;
  }

  async updateSong(id: string, song: Partial<InsertSong>, dbTransaction?: any): Promise<Song> {
    const dbContext = dbTransaction || db;
    const [updatedSong] = await dbContext.update(songs)
      .set(song)
      .where(eq(songs.id, id))
      .returning();
    return updatedSong;
  }

  async getReleasedSongs(gameId: string): Promise<Song[]> {
    return await db.select().from(songs)
      .where(and(
        eq(songs.gameId, gameId),
        eq(songs.isReleased, true)
      ))
      .orderBy(desc(songs.releaseMonth));
  }

  async getSongsByProject(projectId: string): Promise<Song[]> {
    return await db.select().from(songs)
      .where(eq(songs.projectId, projectId))
      .orderBy(songs.createdAt);
  }

  async updateSongs(songUpdates: { songId: string; [key: string]: any }[], dbTransaction?: any): Promise<void> {
    const dbContext = dbTransaction || db;
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
        releaseMonth: updateData.releaseMonth,
        initialStreams: updateData.initialStreams,
        monthlyStreams: updateData.monthlyStreams,
        totalStreams: updateData.totalStreams,
        totalRevenue: updateData.totalRevenue,
        lastMonthRevenue: updateData.lastMonthRevenue,
        ...Object.keys(updateData).filter(k => !['isReleased', 'releaseMonth', 'initialStreams', 'monthlyStreams', 'totalStreams', 'totalRevenue', 'lastMonthRevenue'].includes(k))
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
    const dbContext = dbTransaction || db;
    return await dbContext.select().from(releases).where(eq(releases.gameId, gameId));
  }

  async getReleasesByArtist(artistId: string, gameId: string): Promise<Release[]> {
    return await db.select().from(releases)
      .where(and(eq(releases.artistId, artistId), eq(releases.gameId, gameId)))
      .orderBy(desc(releases.createdAt));
  }

  async getRelease(id: string): Promise<Release | undefined> {
    const [release] = await db.select().from(releases).where(eq(releases.id, id));
    return release || undefined;
  }

  async createRelease(release: InsertRelease): Promise<Release> {
    const [newRelease] = await db.insert(releases).values(release).returning();
    return newRelease;
  }

  async updateRelease(id: string, release: Partial<InsertRelease>): Promise<Release> {
    const [updatedRelease] = await db.update(releases)
      .set(release)
      .where(eq(releases.id, id))
      .returning();
    return updatedRelease;
  }

  async getPlannedReleases(gameId: string, month: number, dbTransaction?: any): Promise<Release[]> {
    const dbContext = dbTransaction || db;
    console.log(`[STORAGE] getPlannedReleases: gameId=${gameId}, month=${month}, usingTransaction=${!!dbTransaction}`);
    
    const result = await dbContext.select().from(releases)
      .where(and(
        eq(releases.gameId, gameId),
        eq(releases.status, 'planned'),
        lte(releases.releaseMonth, month)
      ))
      .orderBy(releases.createdAt);
    
    const overdueCount = result.filter((r: any) => r.releaseMonth && r.releaseMonth < month).length;
    console.log(`[STORAGE] getPlannedReleases: found ${result.length} releases (${overdueCount} overdue)`);
    
    if (overdueCount > 0) {
      console.log(`[STORAGE] ✅ OVERDUE RELEASE DETECTION: Processing ${overdueCount} releases that should have been executed in previous months`);
    }
    return result;
  }

  async getSongsByRelease(releaseId: string, dbTransaction?: any): Promise<Song[]> {
    const dbContext = dbTransaction || db;
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
    const dbContext = dbTransaction || db;
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
    return await db.select().from(releaseSongs)
      .where(eq(releaseSongs.releaseId, releaseId))
      .orderBy(releaseSongs.trackNumber);
  }

  async createReleaseSong(releaseSong: InsertReleaseSong): Promise<ReleaseSong> {
    const [newReleaseSong] = await db.insert(releaseSongs).values(releaseSong).returning();
    return newReleaseSong;
  }

  async deleteReleaseSong(releaseId: string, songId: string): Promise<void> {
    await db.delete(releaseSongs)
      .where(and(
        eq(releaseSongs.releaseId, releaseId),
        eq(releaseSongs.songId, songId)
      ));
  }

  // Roles
  async getRolesByGame(gameId: string): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.gameId, gameId));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async updateRole(id: string, role: Partial<Role>): Promise<Role> {
    const [updatedRole] = await db.update(roles)
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
    
    return await db.select().from(dialogueChoices).where(conditions);
  }

  async getGameEvents(): Promise<GameEvent[]> {
    return await db.select().from(gameEvents);
  }

  // Monthly actions
  async getMonthlyActions(gameId: string, month?: number): Promise<MonthlyAction[]> {
    const conditions = month 
      ? and(eq(monthlyActions.gameId, gameId), eq(monthlyActions.month, month))
      : eq(monthlyActions.gameId, gameId);
    
    return await db.select().from(monthlyActions).where(conditions);
  }

  async createMonthlyAction(action: InsertMonthlyAction): Promise<MonthlyAction> {
    const [newAction] = await db.insert(monthlyActions).values(action).returning();
    return newAction;
  }

  // Executives
  async getExecutivesByGame(gameId: string): Promise<any[]> {
    console.log('[STORAGE] getExecutivesByGame called with gameId:', gameId);
    const result = await db.select().from(executives).where(eq(executives.gameId, gameId));
    console.log('[STORAGE] Executives found:', result);
    console.log('[STORAGE] Number of executives:', result ? result.length : 0);
    return result;
  }
}

export const storage = new DatabaseStorage();
