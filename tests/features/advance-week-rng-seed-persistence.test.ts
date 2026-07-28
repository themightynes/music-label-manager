// @vitest-environment node
/**
 * C109 — RNG-seed determinism heisenbug net for POST /api/advance-week
 * (AdvanceWeekService.advanceWeek).
 *
 * THE BUG: advanceWeekService built the engine's game state with
 *   rngSeed: gameState.rngSeed ?? Math.random().toString(36).substring(7)
 * so any game_states row that LACKED a persisted seed received a FRESH random
 * seed on EVERY advance. The fallback was computed inline and thrown away — never
 * written back — so the same row got a different seed each week, silently breaking
 * the seeded-RNG determinism the engine otherwise maintains (golden-master
 * reproduction, save replay, seeded gambles). A heisenbug: only rows without a
 * seed were affected.
 *
 * THE FIX (persist-on-first-use): when the row has no seed, generate ONE, persist
 * it to game_states.rng_seed inside the same transaction, and use it — so the
 * fallback can never fire twice for the same row. Rows that ALREADY have a seed
 * take no extra write and behave identically.
 *
 * These tests assert the determinism-restoring behavior:
 *   1. A row seeded with rngSeed = null gets a NON-NULL, persisted seed after the
 *      first advance, and that seed does NOT change on a second advance (the
 *      fallback did not re-fire).
 *   2. A row that already has a seed keeps that exact seed across an advance (no
 *      overwrite) — the seeded path is behavior-identical.
 *
 * Harness: mirrors tests/features/advance-week-atomicity.test.ts — constructs
 * AdvanceWeekService with INJECTED test-DB-backed deps and NEVER imports server/db.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// server/storage.ts imports server/db.ts at module load, which throws unless
// DATABASE_URL is set (and would otherwise open an SSL pool to production). We
// INJECT our own test-DB-backed storage/db into the service, so the real
// `server/db` module is never used for queries — mock it (hoisted, same pattern as
// tests/features/advance-week-atomicity.test.ts).
vi.mock('../../server/db', async () => {
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const pg = await import('pg');
  const schema = await import('@shared/schema');
  const pool = new pg.Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5433/music_label_test',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const db = drizzle(pool, { schema });
  return { pool, db, testDatabaseConnection: async () => true };
});

import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { DatabaseStorage } from '../../server/storage';
import { AdvanceWeekService } from '../../server/services/advanceWeekService';
import { createTestDatabase, clearDatabase, setupDatabase } from '../helpers/test-db';
import { createGameData, type TestDb } from '../engine/golden-master-fixtures';

const IDS = {
  nullSeed: '00000000-0000-4000-8000-0000000000c1',
  hasSeed: '00000000-0000-4000-8000-0000000000c2',
};

let db: TestDb;

/**
 * gameData bridge for AdvanceWeekService — identical to the atomicity test's
 * bridge: reuse the golden-master createGameData (real balance JSON + row
 * reads/writes via the test-DB storage) and add the two service-only methods plus
 * the tx-honoring song bridges that mirror production.
 */
function makeServiceGameData(storage: DatabaseStorage) {
  const gameData = createGameData(storage);
  return {
    ...gameData,
    initialize: async () => {},
    getStartingValues: async () => ({ money: 500000, reputation: 10, creativeCapital: 0 }),
    createSong: async (song: any, tx?: any) => {
      if (tx) {
        const [created] = await tx.insert(schema.songs).values(song).returning();
        return created;
      }
      return storage.createSong(song);
    },
    updateSong: async (songId: string, updates: any, tx?: any) => storage.updateSong(songId, updates, tx),
  };
}

async function seedGame(id: string, week: number, overrides: Record<string, any> = {}) {
  await db.insert(schema.gameStates).values({
    id,
    currentWeek: week,
    money: 500000,
    reputation: 10,
    venueAccess: 'clubs',
    // NOTE: rngSeed intentionally set via overrides per-test (null vs a fixed seed).
    ...overrides,
  });
}

async function seedArtist(gameId: string, over: Record<string, any> = {}) {
  const id = crypto.randomUUID();
  await db.insert(schema.artists).values({
    id,
    gameId,
    name: over.name ?? 'C109 Artist',
    archetype: over.archetype ?? 'Workhorse',
    genre: over.genre ?? 'pop',
    talent: over.talent ?? 60,
    workEthic: over.workEthic ?? 70,
    popularity: over.popularity ?? 50,
    temperament: over.temperament ?? 50,
    energy: over.energy ?? 50,
    mood: over.mood ?? 50,
    signed: true,
  });
  return id;
}

describe('C109 — advance-week persists a fresh RNG seed on first use (determinism restored)', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('a null rngSeed is generated, persisted, and STABLE across a second advance (fallback does not re-fire)', async () => {
    const gameId = IDS.nullSeed;
    // The heisenbug row: no persisted seed.
    await seedGame(gameId, 5, { rngSeed: null });
    await seedArtist(gameId, { name: 'Null Seed' });

    // Sanity: the seed really is null before any advance.
    const [gsBefore] = await db
      .select()
      .from(schema.gameStates)
      .where(eq(schema.gameStates.id, gameId));
    expect(gsBefore.rngSeed).toBeNull();

    const storage = new DatabaseStorage(db);
    const service = new AdvanceWeekService(storage as any, db as any, makeServiceGameData(storage) as any);

    // First advance: the fix generates a seed and persists it to the row.
    await service.advanceWeek(gameId, []);

    const [gsAfterFirst] = await db
      .select()
      .from(schema.gameStates)
      .where(eq(schema.gameStates.id, gameId));
    expect(gsAfterFirst.rngSeed).not.toBeNull();
    expect(typeof gsAfterFirst.rngSeed).toBe('string');
    expect((gsAfterFirst.rngSeed as string).length).toBeGreaterThan(0);

    const persistedSeed = gsAfterFirst.rngSeed;

    // Second advance: because the seed is now persisted, the fallback must NOT
    // re-fire — the seed value stays IDENTICAL. (Pre-fix, this row got a brand-new
    // random seed every advance, breaking determinism.)
    await service.advanceWeek(gameId, []);

    const [gsAfterSecond] = await db
      .select()
      .from(schema.gameStates)
      .where(eq(schema.gameStates.id, gameId));
    expect(gsAfterSecond.rngSeed).toBe(persistedSeed);
  });

  it('a row that already has a seed keeps it unchanged across an advance (no overwrite of the seeded path)', async () => {
    const gameId = IDS.hasSeed;
    const originalSeed = 'c109-fixed-seed';
    await seedGame(gameId, 5, { rngSeed: originalSeed });
    await seedArtist(gameId, { name: 'Has Seed' });

    const storage = new DatabaseStorage(db);
    const service = new AdvanceWeekService(storage as any, db as any, makeServiceGameData(storage) as any);

    await service.advanceWeek(gameId, []);

    const [gsAfter] = await db
      .select()
      .from(schema.gameStates)
      .where(eq(schema.gameStates.id, gameId));
    // Untouched — the persist-on-first-use branch only runs when the seed is absent.
    expect(gsAfter.rngSeed).toBe(originalSeed);
  });
});
