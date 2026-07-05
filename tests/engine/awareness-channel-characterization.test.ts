/**
 * Exec-meetings-revival PR-5 (C3) — characterization test.
 *
 * Proves the awareness channel is a REAL, end-to-end delayed consequence riding
 * the LIVE awareness economy: a meeting choice banks +3 awareness_boost (mirroring
 * cmo_platform_exclusive/spotify_exclusive-style banking), then a planned release
 * executes and that release's song is seeded with +3 × 8 = +24 initial awareness
 * versus the SAME seed/setup with no bank. Because song awareness multiplies
 * weekly streams (up to 2× via FinancialSystem), the with-boost game also earns
 * measurably MORE weekly streams in the weeks after release.
 *
 * Uses the same DB-backed harness pattern as press-channel-characterization.test.ts
 * (real GameEngine + real DatabaseStorage against the Docker test DB on 5433).
 * Asserts an EXACT +24 awareness delta (fixed points × knob) plus a directional
 * streams-gap in a later week.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { GameEngine } from '@shared/engine/game-engine';
import * as schema from '@shared/schema';
import { DatabaseStorage } from '../../server/storage';
import { createTestDatabase, clearDatabase, setupDatabase } from '../helpers/test-db';
import { createGameData, makeGameState } from './golden-master-fixtures';

let db: ReturnType<typeof createTestDatabase>;

async function seedGame(id: string, week: number, overrides: Record<string, any> = {}) {
  await db.insert(schema.gameStates).values({
    id,
    currentWeek: week,
    money: 500000,
    reputation: 10,
    venueAccess: 'clubs',
    playlistAccess: 'niche',
    rngSeed: `awareness-char-${id}`,
    ...overrides,
  });
}

async function seedArtist(gameId: string, over: Record<string, any> = {}) {
  const id = crypto.randomUUID();
  await db.insert(schema.artists).values({
    id,
    gameId,
    name: over.name ?? 'Awareness Artist',
    archetype: 'Workhorse',
    genre: 'pop',
    talent: 60,
    workEthic: 70,
    popularity: 50,
    temperament: 50,
    energy: 50,
    mood: 50,
    signed: true,
  });
  return id;
}

/** Seeds a planned release (song + release + releaseSong) landing on `releaseWeek`, with real marketing so the weeks-1-4 awareness build path runs. */
async function seedPlannedRelease(gameId: string, artistId: string, releaseWeek: number) {
  const releaseId = crypto.randomUUID();
  const songId = crypto.randomUUID();
  await db.insert(schema.songs).values({
    id: songId,
    gameId,
    artistId,
    title: 'Planned Track',
    quality: 75,
    genre: 'pop',
    isRecorded: true,
    isReleased: false,
  });
  await db.insert(schema.releases).values({
    id: releaseId,
    gameId,
    artistId,
    title: 'Planned Single',
    type: 'single',
    status: 'planned',
    releaseWeek,
    marketingBudget: 5000,
    metadata: { marketingBudget: { digital: 5000 }, marketingBudgetBreakdown: { digital: 5000 }, totalInvestment: 5000 },
  });
  await db.insert(schema.releaseSongs).values({
    releaseId,
    songId,
    trackNumber: 1,
    isSingle: true,
  });
  return songId;
}

describe('Awareness channel characterization — banked awareness_boost seeds the next release', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('a +3 banked boost seeds the released song EXACTLY +24 awareness vs the same seed without it, and lifts later weekly streams', async () => {
    const gameIdWithBoost = '30000000-0000-4000-8000-000000000001';
    const gameIdNoBoost = '30000000-0000-4000-8000-000000000002';

    await seedGame(gameIdWithBoost, 4, { reputation: 0 });
    const artistWithBoost = await seedArtist(gameIdWithBoost, { name: 'Releaser' });
    const songIdWithBoost = await seedPlannedRelease(gameIdWithBoost, artistWithBoost, 5);

    await seedGame(gameIdNoBoost, 4, { reputation: 0 });
    const artistNoBoost = await seedArtist(gameIdNoBoost, { name: 'Releaser' });
    const songIdNoBoost = await seedPlannedRelease(gameIdNoBoost, artistNoBoost, 5);

    const SEED = 'ascan-0';

    // --- Game WITH a +3 banked boost ---
    const storageWithBoost = new DatabaseStorage(db as any);
    const gameDataWithBoost = createGameData(storageWithBoost, []);
    const gameStateWithBoost = makeGameState(gameIdWithBoost, {
      id: gameIdWithBoost,
      currentWeek: 4,
      reputation: 0,
      playlistAccess: 'niche',
      flags: { pendingAwarenessBoost: 3, pendingAwarenessBoostWeek: 4 },
    });
    const engineWithBoost = new GameEngine(gameStateWithBoost, gameDataWithBoost, storageWithBoost, SEED);

    // Advance into the release week (4 -> 5): the boost seeds song awareness.
    await (db as any).transaction(async (tx: any) => {
      await engineWithBoost.advanceWeek([], tx);
    });

    // --- Control game with NO boost ---
    const storageNoBoost = new DatabaseStorage(db as any);
    const gameDataNoBoost = createGameData(storageNoBoost, []);
    const gameStateNoBoost = makeGameState(gameIdNoBoost, {
      id: gameIdNoBoost,
      currentWeek: 4,
      reputation: 0,
      playlistAccess: 'niche',
      flags: {},
    });
    const engineNoBoost = new GameEngine(gameStateNoBoost, gameDataNoBoost, storageNoBoost, SEED);

    await (db as any).transaction(async (tx: any) => {
      await engineNoBoost.advanceWeek([], tx);
    });

    // Release-week awareness: with-boost song is seeded exactly +24 higher.
    const [songWithBoostW5] = await db.select().from(schema.songs).where(eq(schema.songs.id, songIdWithBoost));
    const [songNoBoostW5] = await db.select().from(schema.songs).where(eq(schema.songs.id, songIdNoBoost));

    expect(songWithBoostW5).toBeDefined();
    expect(songNoBoostW5).toBeDefined();
    expect(songWithBoostW5.awareness).toBe(songNoBoostW5.awareness + 24);

    // The bank is consumed (zeroed) after the release week.
    expect((gameStateWithBoost.flags as any).pendingAwarenessBoost).toBe(0);
    expect((gameStateWithBoost.flags as any).pendingAwarenessBoostWeek).toBeUndefined();
    // Control game never had a bank — stays unset (not merely falsy).
    expect((gameStateNoBoost.flags as any).pendingAwarenessBoost).toBeUndefined();

    // Advance to week 10 (weeksSinceRelease = 5), where FinancialSystem applies
    // the awareness stream modifier (weeks 5+). The seeded-awareness difference
    // has compounded through the weeks-1-4 build path, so the with-boost song now
    // out-streams the control — proving the seed rides the LIVE awareness economy.
    for (let w = 6; w <= 10; w++) {
      await (db as any).transaction(async (tx: any) => {
        await engineWithBoost.advanceWeek([], tx);
      });
      await (db as any).transaction(async (tx: any) => {
        await engineNoBoost.advanceWeek([], tx);
      });
    }

    const [songWithBoostLate] = await db.select().from(schema.songs).where(eq(schema.songs.id, songIdWithBoost));
    const [songNoBoostLate] = await db.select().from(schema.songs).where(eq(schema.songs.id, songIdNoBoost));

    // Higher awareness => higher weekly streams (the live awareness economy).
    expect(songWithBoostLate.awareness).toBeGreaterThan(songNoBoostLate.awareness);
    expect(songWithBoostLate.weeklyStreams ?? 0).toBeGreaterThan(songNoBoostLate.weeklyStreams ?? 0);
  });
});
