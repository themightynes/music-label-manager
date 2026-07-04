/**
 * Exec-meetings-revival PR-6 (C4) — characterization test.
 *
 * Proves the variance channel is a REAL, end-to-end delayed consequence: a
 * meeting choice banks variance_up:2 (mirroring ar_single_choice/greenlight_weird's
 * combined variance authoring), then a recording project in 'production' stage
 * generates its song in the SAME week. With the same seed/setup, the banked
 * game's song quality DIFFERS from the same-seed control run (either direction —
 * variance widens the band symmetrically, so the sign of the difference depends
 * on which side of the normal-variance draw the seed lands on), while a
 * variance-free control run with the identical seed matches an independent
 * baseline run exactly (proving the channel doesn't leak into unrelated games
 * and that determinism holds).
 *
 * Uses the same DB-backed harness pattern as
 * quality-channel-characterization.test.ts (real GameEngine + real
 * DatabaseStorage against the Docker test DB on 5433).
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
    rngSeed: `variance-char-${id}`,
    ...overrides,
  });
}

async function seedArtist(gameId: string, over: Record<string, any> = {}) {
  const id = crypto.randomUUID();
  await db.insert(schema.artists).values({
    id,
    gameId,
    name: over.name ?? 'Variance Artist',
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

/** Seeds a recording project mid-production so processRecordingProjects generates its song this week. */
async function seedRecordingProject(gameId: string, artistId: string) {
  const id = crypto.randomUUID();
  await db.insert(schema.projects).values({
    id,
    gameId,
    artistId,
    title: 'In-Progress Single',
    type: 'Single',
    stage: 'production',
    songCount: 1,
    songsCreated: 0,
    producerTier: 'local',
    timeInvestment: 'standard',
    budgetPerSong: 4000,
    totalCost: 4000,
  });
  return id;
}

describe('Variance channel characterization — banked variance_up changes the next generated song quality', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('a game with a +2 banked variance pool produces a DIFFERENT song quality than the same seed without it', async () => {
    const gameIdWithVariance = '30000000-0000-4000-8000-000000000001';
    const gameIdNoVariance = '30000000-0000-4000-8000-000000000002';

    await seedGame(gameIdWithVariance, 4, { reputation: 0 });
    const artistWithVariance = await seedArtist(gameIdWithVariance, { name: 'Recorder' });
    await seedRecordingProject(gameIdWithVariance, artistWithVariance);

    await seedGame(gameIdNoVariance, 4, { reputation: 0 });
    const artistNoVariance = await seedArtist(gameIdNoVariance, { name: 'Recorder' });
    await seedRecordingProject(gameIdNoVariance, artistNoVariance);

    const SEED = 'vscan-0';

    const storageWithVariance = new DatabaseStorage(db as any);
    const gameDataWithVariance = createGameData(storageWithVariance, []);
    const gameStateWithVariance = makeGameState(gameIdWithVariance, {
      id: gameIdWithVariance,
      currentWeek: 4,
      reputation: 0,
      flags: { pendingVariance: 2, pendingVarianceWeek: 4 },
    });
    const engineWithVariance = new GameEngine(gameStateWithVariance, gameDataWithVariance, storageWithVariance, SEED);

    await (db as any).transaction(async (tx: any) => {
      await engineWithVariance.advanceWeek([], tx);
    });

    const storageNoVariance = new DatabaseStorage(db as any);
    const gameDataNoVariance = createGameData(storageNoVariance, []);
    const gameStateNoVariance = makeGameState(gameIdNoVariance, {
      id: gameIdNoVariance,
      currentWeek: 4,
      reputation: 0,
      flags: {},
    });
    const engineNoVariance = new GameEngine(gameStateNoVariance, gameDataNoVariance, storageNoVariance, SEED);

    await (db as any).transaction(async (tx: any) => {
      await engineNoVariance.advanceWeek([], tx);
    });

    const [songWithVariance] = await db
      .select()
      .from(schema.songs)
      .where(eq(schema.songs.gameId, gameIdWithVariance));
    const [songNoVariance] = await db
      .select()
      .from(schema.songs)
      .where(eq(schema.songs.gameId, gameIdNoVariance));

    expect(songWithVariance).toBeDefined();
    expect(songNoVariance).toBeDefined();
    // Widened band => a different (not necessarily higher) quality outcome for
    // the same seed, proving the channel is a real, measurable consequence.
    expect(songWithVariance.quality).not.toBe(songNoVariance.quality);

    // Consumption semantics: the pool is zeroed after the week that consumed it.
    expect((gameStateWithVariance.flags as any).pendingVariance).toBe(0);
    expect((gameStateWithVariance.flags as any).pendingVarianceWeek).toBeUndefined();
    // Control game never had a pool — must stay unset (not merely falsy).
    expect((gameStateNoVariance.flags as any).pendingVariance).toBeUndefined();
  });

  it('a variance-free control run with the SAME seed matches an independent baseline run exactly', async () => {
    const gameIdControlA = '30000000-0000-4000-8000-000000000003';
    const gameIdControlB = '30000000-0000-4000-8000-000000000004';

    await seedGame(gameIdControlA, 4, { reputation: 0 });
    const artistA = await seedArtist(gameIdControlA, { name: 'Recorder' });
    await seedRecordingProject(gameIdControlA, artistA);

    await seedGame(gameIdControlB, 4, { reputation: 0 });
    const artistB = await seedArtist(gameIdControlB, { name: 'Recorder' });
    await seedRecordingProject(gameIdControlB, artistB);

    const SEED = 'vscan-control';

    const storageA = new DatabaseStorage(db as any);
    const gameDataA = createGameData(storageA, []);
    const gameStateA = makeGameState(gameIdControlA, {
      id: gameIdControlA,
      currentWeek: 4,
      reputation: 0,
      flags: {},
    });
    const engineA = new GameEngine(gameStateA, gameDataA, storageA, SEED);
    await (db as any).transaction(async (tx: any) => {
      await engineA.advanceWeek([], tx);
    });

    const storageB = new DatabaseStorage(db as any);
    const gameDataB = createGameData(storageB, []);
    const gameStateB = makeGameState(gameIdControlB, {
      id: gameIdControlB,
      currentWeek: 4,
      reputation: 0,
      flags: {},
    });
    const engineB = new GameEngine(gameStateB, gameDataB, storageB, SEED);
    await (db as any).transaction(async (tx: any) => {
      await engineB.advanceWeek([], tx);
    });

    const [songA] = await db.select().from(schema.songs).where(eq(schema.songs.gameId, gameIdControlA));
    const [songB] = await db.select().from(schema.songs).where(eq(schema.songs.gameId, gameIdControlB));

    expect(songA).toBeDefined();
    expect(songB).toBeDefined();
    expect(songA.quality).toBe(songB.quality);
  });
});
