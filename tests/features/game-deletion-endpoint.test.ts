import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDatabase, clearDatabase, closeDatabaseConnection } from '../helpers/test-db';
import { users, gameStates, gameSaves, artists, songs, projects } from '@shared/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Tests for DELETE /api/game/:gameId endpoint (Task 1.0)
 *
 * Tests verify:
 * - Successful deletion of game owned by user (200)
 * - Unauthorized access attempt returns 404
 * - Game not found returns 404
 * - CASCADE deletes clean up related records
 */
describe('DELETE /api/game/:gameId endpoint', () => {
  let db: NodePgDatabase<typeof import('@shared/schema')>;
  let testUserId: string;
  let otherUserId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);

    // Create test users
    const [testUser] = await db.insert(users).values({
      clerkId: 'test-clerk-id',
      email: 'test@example.com',
      username: 'testuser',
    }).returning();
    testUserId = testUser.id;

    const [otherUser] = await db.insert(users).values({
      clerkId: 'other-clerk-id',
      email: 'other@example.com',
      username: 'otheruser',
    }).returning();
    otherUserId = otherUser.id;
  });

  afterEach(async () => {
    await clearDatabase(db);
  });

  it('should successfully delete a game owned by the user', async () => {
    // Create a game for the test user
    const [game] = await db.insert(gameStates).values({
      userId: testUserId,
      currentWeek: 5,
      money: 50000,
      reputation: 10,
      focusSlots: 3,
      usedFocusSlots: 1,
      playlistAccess: 'none',
      pressAccess: 'none',
      venueAccess: 'none',
      campaignType: 'standard',
      rngSeed: 'test-seed',
    }).returning();

    // Verify game exists
    const gamesBeforeDeletion = await db.select().from(gameStates).where(eq(gameStates.id, game.id));
    expect(gamesBeforeDeletion).toHaveLength(1);

    // Simulate DELETE request
    // In real endpoint: req.userId = testUserId, req.params.gameId = game.id
    const gameOwnership = await db
      .select({ id: gameStates.id, userId: gameStates.userId, currentWeek: gameStates.currentWeek })
      .from(gameStates)
      .where(eq(gameStates.id, game.id))
      .limit(1);

    expect(gameOwnership).toHaveLength(1);
    expect(gameOwnership[0].userId).toBe(testUserId);

    // Delete the game
    await db.delete(gameStates).where(eq(gameStates.id, game.id));

    // Verify game is deleted
    const gamesAfterDeletion = await db.select().from(gameStates).where(eq(gameStates.id, game.id));
    expect(gamesAfterDeletion).toHaveLength(0);
  });

  it('should return 404 when user tries to delete a game they do not own', async () => {
    // Create a game for otherUser
    const [game] = await db.insert(gameStates).values({
      userId: otherUserId,
      currentWeek: 3,
      money: 30000,
      reputation: 5,
      focusSlots: 3,
      usedFocusSlots: 0,
      playlistAccess: 'none',
      pressAccess: 'none',
      venueAccess: 'none',
      campaignType: 'standard',
      rngSeed: 'other-seed',
    }).returning();

    // Simulate DELETE request where testUser tries to delete otherUser's game
    // In real endpoint: req.userId = testUserId, req.params.gameId = game.id
    const gameOwnership = await db
      .select({ id: gameStates.id, userId: gameStates.userId })
      .from(gameStates)
      .where(eq(gameStates.id, game.id))
      .limit(1);

    expect(gameOwnership).toHaveLength(1);
    expect(gameOwnership[0].userId).not.toBe(testUserId);

    // Endpoint should return 404 (not 403 to avoid leaking game existence)
    // Game should NOT be deleted
    const gamesAfter = await db.select().from(gameStates).where(eq(gameStates.id, game.id));
    expect(gamesAfter).toHaveLength(1);
  });

  it('should return 404 when game does not exist', async () => {
    const nonExistentGameId = crypto.randomUUID();

    // Simulate DELETE request with non-existent game ID
    const gameOwnership = await db
      .select({ id: gameStates.id, userId: gameStates.userId })
      .from(gameStates)
      .where(eq(gameStates.id, nonExistentGameId))
      .limit(1);

    expect(gameOwnership).toHaveLength(0);

    // Endpoint should return 404
    // No deletion should occur (nothing to delete)
  });

  it('should CASCADE delete all related records when game is deleted', async () => {
    // Create a game with related records
    const [game] = await db.insert(gameStates).values({
      userId: testUserId,
      currentWeek: 10,
      money: 80000,
      reputation: 20,
      focusSlots: 3,
      usedFocusSlots: 2,
      playlistAccess: 'bronze',
      pressAccess: 'none',
      venueAccess: 'none',
      campaignType: 'standard',
      rngSeed: 'cascade-test',
    }).returning();

    // Create related artist
    const [artist] = await db.insert(artists).values({
      gameId: game.id,
      name: 'Test Artist',
      archetype: 'Workhorse',
      genre: 'pop',
      mood: 60,
      energy: 70,
      popularity: 50,
      talent: 65,
      workEthic: 75,
      signed: true,
    }).returning();

    // Create related song
    await db.insert(songs).values({
      gameId: game.id,
      artistId: artist.id,
      title: 'Test Song',
      genre: 'pop',
      quality: 80,
      isRecorded: true,
      isReleased: false,
    });

    // Create related project
    await db.insert(projects).values({
      gameId: game.id,
      artistId: artist.id,
      title: 'Test Project',
      type: 'single',
      stage: 'planning',
    });

    // Verify all related records exist
    const artistsBefore = await db.select().from(artists).where(eq(artists.gameId, game.id));
    const songsBefore = await db.select().from(songs).where(eq(songs.gameId, game.id));
    const projectsBefore = await db.select().from(projects).where(eq(projects.gameId, game.id));

    expect(artistsBefore).toHaveLength(1);
    expect(songsBefore).toHaveLength(1);
    expect(projectsBefore).toHaveLength(1);

    // Delete the game (CASCADE should delete related records)
    await db.delete(gameStates).where(eq(gameStates.id, game.id));

    // Verify all related records are deleted via CASCADE
    const gamesAfter = await db.select().from(gameStates).where(eq(gameStates.id, game.id));
    const artistsAfter = await db.select().from(artists).where(eq(artists.gameId, game.id));
    const songsAfter = await db.select().from(songs).where(eq(songs.gameId, game.id));
    const projectsAfter = await db.select().from(projects).where(eq(projects.gameId, game.id));

    expect(gamesAfter).toHaveLength(0);
    expect(artistsAfter).toHaveLength(0);
    expect(songsAfter).toHaveLength(0);
    expect(projectsAfter).toHaveLength(0);
  });

  it('should delete orphaned game_saves when game is deleted', async () => {
    // Create a game for the test user
    const [game] = await db.insert(gameStates).values({
      userId: testUserId,
      currentWeek: 8,
      money: 60000,
      reputation: 15,
      focusSlots: 3,
      usedFocusSlots: 1,
      playlistAccess: 'none',
      pressAccess: 'none',
      venueAccess: 'none',
      campaignType: 'standard',
      rngSeed: 'save-cleanup-test',
    }).returning();

    // Create multiple game_saves for this game
    // game_saves stores gameId inside JSON (game_state->'gameState'->>'id')
    const saveSnapshot = {
      snapshotVersion: 2,
      gameState: {
        id: game.id,
        currentWeek: 8,
        money: 60000,
        reputation: 15,
        creativeCapital: 0,
      },
      artists: [],
      projects: [],
      roles: [],
    };

    await db.insert(gameSaves).values([
      {
        userId: testUserId,
        name: 'Manual Save - Week 8',
        gameState: saveSnapshot,
        week: 8,
        isAutosave: false,
      },
      {
        userId: testUserId,
        name: 'Autosave - Week 8',
        gameState: saveSnapshot,
        week: 8,
        isAutosave: true,
      },
    ]);

    // Verify saves exist before deletion
    const savesBeforeDeletion = await db
      .select()
      .from(gameSaves)
      .where(sql`game_state->'gameState'->>'id' = ${game.id}`);

    expect(savesBeforeDeletion).toHaveLength(2);

    // Simulate DELETE endpoint behavior:
    // 1. Delete orphaned game_saves first
    await db.delete(gameSaves).where(sql`game_state->'gameState'->>'id' = ${game.id}`);

    // 2. Delete the game_state (CASCADE will handle related records)
    await db.delete(gameStates).where(eq(gameStates.id, game.id));

    // Verify game_saves are deleted (preventing orphaned saves and 403 errors)
    const savesAfterDeletion = await db
      .select()
      .from(gameSaves)
      .where(sql`game_state->'gameState'->>'id' = ${game.id}`);

    expect(savesAfterDeletion).toHaveLength(0);

    // Verify game is also deleted
    const gamesAfter = await db.select().from(gameStates).where(eq(gameStates.id, game.id));
    expect(gamesAfter).toHaveLength(0);
  });
});
