/**
 * Exec-meetings-revival PR-4 (C1) — characterization test.
 *
 * Proves the quality channel is a REAL, end-to-end delayed consequence: a
 * meeting choice fires in week N, banking +6 quality_bonus (mirroring
 * cco_timeline/add_revision), then a recording project in 'production' stage
 * generates its song in week N (the same week — this channel is consumed by
 * the NEXT song generation, which can be the same advanceWeek call if a
 * recording project is already mid-production). The banked game's song quality
 * is exactly the additive delta higher than the SAME seed/setup with no bank —
 * proving the bonus is a real, measurable, additive consequence rather than a
 * no-op, and that it is cleared after being consumed.
 *
 * Uses the same DB-backed harness pattern as
 * press-channel-characterization.test.ts (real GameEngine + real
 * DatabaseStorage against the Docker test DB on 5433). Asserts an EXACT
 * additive delta (not just direction) since this channel is a fixed points
 * adjustment, not a probabilistic roll.
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
    rngSeed: `quality-char-${id}`,
    ...overrides,
  });
}

async function seedArtist(gameId: string, over: Record<string, any> = {}) {
  const id = crypto.randomUUID();
  await db.insert(schema.artists).values({
    id,
    gameId,
    name: over.name ?? 'Quality Artist',
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

describe('Quality channel characterization — banked quality_bonus raises the next generated song quality', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('a game with a +6 banked bonus generates a song EXACTLY 6 quality points higher than the same seed without it', async () => {
    const gameIdWithBonus = '20000000-0000-4000-8000-000000000001';
    const gameIdNoBonus = '20000000-0000-4000-8000-000000000002';

    await seedGame(gameIdWithBonus, 4, { reputation: 0 });
    const artistWithBonus = await seedArtist(gameIdWithBonus, { name: 'Recorder' });
    await seedRecordingProject(gameIdWithBonus, artistWithBonus);

    await seedGame(gameIdNoBonus, 4, { reputation: 0 });
    const artistNoBonus = await seedArtist(gameIdNoBonus, { name: 'Recorder' });
    await seedRecordingProject(gameIdNoBonus, artistNoBonus);

    const SEED = 'qscan-0';

    const storageWithBonus = new DatabaseStorage(db as any);
    const gameDataWithBonus = createGameData(storageWithBonus, []);
    const gameStateWithBonus = makeGameState(gameIdWithBonus, {
      id: gameIdWithBonus,
      currentWeek: 4,
      reputation: 0,
      flags: { pendingQualityBonus: 6, pendingQualityBonusWeek: 4 },
    });
    const engineWithBonus = new GameEngine(gameStateWithBonus, gameDataWithBonus, storageWithBonus, SEED);

    await (db as any).transaction(async (tx: any) => {
      await engineWithBonus.advanceWeek([], tx);
    });

    const storageNoBonus = new DatabaseStorage(db as any);
    const gameDataNoBonus = createGameData(storageNoBonus, []);
    const gameStateNoBonus = makeGameState(gameIdNoBonus, {
      id: gameIdNoBonus,
      currentWeek: 4,
      reputation: 0,
      flags: {},
    });
    const engineNoBonus = new GameEngine(gameStateNoBonus, gameDataNoBonus, storageNoBonus, SEED);

    await (db as any).transaction(async (tx: any) => {
      await engineNoBonus.advanceWeek([], tx);
    });

    const [songWithBonus] = await db
      .select()
      .from(schema.songs)
      .where(eq(schema.songs.gameId, gameIdWithBonus));
    const [songNoBonus] = await db
      .select()
      .from(schema.songs)
      .where(eq(schema.songs.gameId, gameIdNoBonus));

    expect(songWithBonus).toBeDefined();
    expect(songNoBonus).toBeDefined();
    expect(songWithBonus.quality).toBe(songNoBonus.quality + 6);

    // Consumption semantics: the bank is zeroed after the week that consumed it.
    expect((gameStateWithBonus.flags as any).pendingQualityBonus).toBe(0);
    expect((gameStateWithBonus.flags as any).pendingQualityBonusWeek).toBeUndefined();
    // Control game never had a bank — must stay unset (not merely falsy).
    expect((gameStateNoBonus.flags as any).pendingQualityBonus).toBeUndefined();
  });
});
