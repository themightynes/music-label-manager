import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase, clearDatabase, seedMinimalGame, seedArtist, seedSong } from '../helpers/test-db';
import * as schema from '@shared/schema';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Snapshot Integrity', () => {
  let db: NodePgDatabase<typeof schema>;

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('captures release songs, executives, and mood events in saved snapshots', async () => {
    const game = await seedMinimalGame(db, { currentWeek: 4 });
    const userId = crypto.randomUUID();

    await db.insert(schema.users).values({
      id: userId,
      clerkId: `clerk_${userId}`,
      email: 'snapshot@test.com',
    });

    await db.update(schema.gameStates)
      .set({ userId })
      .where(eq(schema.gameStates.id, game.id));

    const artist = await seedArtist(db, game.id);
    const song = await seedSong(db, game.id, artist.id, { isRecorded: true, isReleased: true });

    const releaseId = crypto.randomUUID();
    await db.insert(schema.releases).values({
      id: releaseId,
      gameId: game.id,
      artistId: artist.id,
      title: 'Test Release',
      type: 'single',
      status: 'released',
    });

    await db.insert(schema.releaseSongs).values({
      releaseId,
      songId: song.id,
      trackNumber: 1,
      isSingle: true,
    });

    const executiveId = crypto.randomUUID();
    await db.insert(schema.executives).values({
      id: executiveId,
      gameId: game.id,
      role: 'head_ar',
      level: 2,
      mood: 65,
      loyalty: 70,
    });

    const moodEventId = crypto.randomUUID();
    await db.insert(schema.moodEvents).values({
      id: moodEventId,
      artistId: artist.id,
      gameId: game.id,
      eventType: 'release_success',
      moodChange: 5,
      moodBefore: 50,
      moodAfter: 55,
      description: 'Release boosted morale',
      weekOccurred: 4,
    });

    const releaseSongs = await db.select().from(schema.releaseSongs).where(eq(schema.releaseSongs.releaseId, releaseId));
    const releases = await db.select().from(schema.releases).where(eq(schema.releases.id, releaseId));
    const executives = await db.select().from(schema.executives).where(eq(schema.executives.gameId, game.id));
    const moodEvents = await db.select().from(schema.moodEvents).where(eq(schema.moodEvents.gameId, game.id));

    const snapshot: schema.GameSaveSnapshot = {
      snapshotVersion: schema.SNAPSHOT_VERSION,
      gameState: {
        id: game.id,
        currentWeek: 4,
        money: game.money,
        reputation: game.reputation,
        creativeCapital: 80,
      },
      artists: [artist],
      projects: [],
      roles: [],
      songs: [song],
      releases,
      releaseSongs,
      executives,
      moodEvents,
      weeklyActions: [],
    } as schema.GameSaveSnapshot;

    const saveId = crypto.randomUUID();
    await db.insert(schema.gameSaves).values({
      id: saveId,
      userId,
      name: 'Integrity Snapshot',
      week: 4,
      gameState: snapshot,
      isAutosave: false,
    });

    const storedSave = await db.select().from(schema.gameSaves).where(eq(schema.gameSaves.id, saveId));
    expect(storedSave).toHaveLength(1);

    const storedSnapshot = storedSave[0].gameState as schema.GameSaveSnapshot;
    expect(storedSnapshot.releaseSongs).toHaveLength(1);
    expect(storedSnapshot.executives).toHaveLength(1);
    expect(storedSnapshot.moodEvents).toHaveLength(1);
    expect(storedSnapshot.releaseSongs?.[0].songId).toBe(song.id);
    expect(storedSnapshot.executives?.[0].role).toBe('head_ar');
    expect(storedSnapshot.moodEvents?.[0].eventType).toBe('release_success');
  });
});
