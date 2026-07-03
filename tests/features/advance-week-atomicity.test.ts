// @vitest-environment node
/**
 * D6 PR-1 — Failure-injection characterization net for POST /api/advance-week.
 *
 * These tests PIN THE CURRENT (BROKEN) transaction behavior of
 * `AdvanceWeekService.advanceWeek` so the D6 atomicity work (PR-2 / PR-3) can be
 * proven to change it. Today the week advance is NOT atomic:
 *
 *   TX 1 (advanceWeekService.ts:50-254): loads state, runs the whole GameEngine
 *         (song creation, emails, charts, project stage advance) — committed as a
 *         unit... EXCEPT for a set of "escaping" writes that go through storage
 *         methods with no tx param (e.g. `updateArtist`, storage.ts:348) and thus
 *         run on the GLOBAL pool connection, autocommitting independently of tx1.
 *   TX 2 (advanceWeekService.ts:267-378): persists the advanced gameState
 *         (currentWeek/money/...) and inserts weekly_actions.
 *
 * Because tx1 and tx2 are SEPARATE transactions, a crash between them leaves a
 * half-applied week: the engine's rows are committed but the week/money never
 * advance (Test A). And because some writes escape tx1 entirely, an error during
 * tx1 rolls back the tx-bound writes yet leaves the escaping artist writes
 * committed (Test B).
 *
 * Every assertion tagged `// PINS CURRENT BROKEN BEHAVIOR (D6):` is deliberately
 * pinning today's broken behavior and is expected to be FLIPPED (inverted) by a
 * later D6 PR:
 *   - Test A flips in PR-3 (single transaction): a crash leaves the game exactly
 *     at week N — the engine rows must ALSO roll back.
 *   - Test B flips in PR-2 (plumb tx through escaping writes): the escaping artist
 *     mood write must ALSO roll back with tx1.
 *
 * Harness: constructs `AdvanceWeekService` with INJECTED deps (test-DB-backed
 * `DatabaseStorage`, a `db` proxy that can inject a tx failure, and a gameData
 * bridge reusing the golden-master fixture). NEVER imports `server/db`.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// server/storage.ts imports server/db.ts at module load, which throws unless
// DATABASE_URL is set (and would otherwise open an SSL pool to production).
// We INJECT our own test-DB-backed storage/db into the service, so the real
// `server/db` module is never used for queries — mock it (hoisted, same pattern
// as tests/endpoints/advance-week.characterization.test.ts) so importing
// server/storage succeeds without touching production config.
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

// Fixed, human-readable-ish UUIDs per scenario for stability.
const IDS = {
  crashBetween: '00000000-0000-4000-8000-0000000000d1',
  escapeInTx1: '00000000-0000-4000-8000-0000000000d2',
};

let db: TestDb;

/**
 * gameData bridge for AdvanceWeekService.
 *
 * The service calls `serverGameData.getStartingValues()` (fallback defaults only —
 * seeded games set money/reputation so these never fire) and
 * `serverGameData.initialize()` (JSON load). The production singleton hard-imports
 * server/db for its engine-bridge methods, so we inject a test-DB-backed
 * equivalent: reuse the golden-master `createGameData` (real balance JSON + row
 * reads/writes delegated to the test-DB storage) and add the two service-only
 * methods.
 */
function makeServiceGameData(storage: DatabaseStorage) {
  const gameData = createGameData(storage);
  return {
    ...gameData,
    initialize: async () => {},
    getStartingValues: async () => ({ money: 500000, reputation: 10, creativeCapital: 0 }),
    // Mirror production ServerGameData.createSong (server/data/gameData.ts:827):
    // honor the passed transaction so song creation is tx-BOUND (as it is in
    // production). The golden-master bridge deliberately drops the tx (it never
    // exercises rollback), which would make Test B's "songs roll back" assertion
    // false-green; here we must match production so the pin is faithful.
    createSong: async (song: any, tx?: any) => {
      if (tx) {
        const [created] = await tx.insert(schema.songs).values(song).returning();
        return created;
      }
      return storage.createSong(song);
    },
  };
}

async function seedGame(id: string, week: number, overrides: Record<string, any> = {}) {
  await db.insert(schema.gameStates).values({
    id,
    currentWeek: week,
    money: 500000,
    reputation: 10,
    venueAccess: 'clubs',
    rngSeed: `d6-${id}`,
    ...overrides,
  });
}

async function seedArtist(gameId: string, over: Record<string, any> = {}) {
  const id = crypto.randomUUID();
  await db.insert(schema.artists).values({
    id,
    gameId,
    name: over.name ?? 'D6 Artist',
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

/** Seeds a production-stage recording Single that generates songs (tx1-bound write). */
async function seedRecordingProject(gameId: string, artistId: string, startWeek: number) {
  await db.insert(schema.projects).values({
    id: crypto.randomUUID(),
    gameId,
    artistId,
    title: 'D6 Debut Single',
    type: 'Single',
    stage: 'production',
    songCount: 2,
    songsCreated: 0,
    startWeek,
    totalCost: 8000,
    budgetPerSong: 4000,
    producerTier: 'local',
    timeInvestment: 'standard',
    quality: 0,
  });
}

describe('D6 PR-1 — advance-week failure-injection characterization (pins broken behavior)', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('Test A — a crash BETWEEN tx1 and tx2 leaves a HALF-APPLIED week', async () => {
    const gameId = IDS.crashBetween;
    await seedGame(gameId, 2);
    const artistId = await seedArtist(gameId, { name: 'Recorder' });
    // A production Single with no songs yet generates songs this week (tx1-bound).
    await seedRecordingProject(gameId, artistId, 2);

    const storage = new DatabaseStorage(db);
    const gameData = makeServiceGameData(storage);

    // db proxy: pass through the FIRST transaction (tx1 — the engine run), then
    // simulate a crash BEFORE the SECOND transaction (tx2 — gameState/actions
    // persistence) by throwing before its callback runs.
    let txCall = 0;
    const dbProxy: any = {
      transaction: (cb: any, ...rest: any[]) => {
        txCall += 1;
        if (txCall === 1) {
          return (db as any).transaction(cb, ...rest);
        }
        // txCall === 2: crash between the two transactions.
        throw new Error('[D6 TEST] injected crash between tx1 and tx2');
      },
    };

    const service = new AdvanceWeekService(storage as any, dbProxy, gameData as any);

    await expect(service.advanceWeek(gameId, [])).rejects.toThrow(
      /injected crash between tx1 and tx2/,
    );

    const [gsAfter] = await db
      .select()
      .from(schema.gameStates)
      .where(eq(schema.gameStates.id, gameId));
    const songsAfter = await db
      .select()
      .from(schema.songs)
      .where(eq(schema.songs.gameId, gameId));
    const actionsAfter = await db
      .select()
      .from(schema.weeklyActions)
      .where(eq(schema.weeklyActions.gameId, gameId));

    // PINS CURRENT BROKEN BEHAVIOR (D6): tx1's engine writes are already COMMITTED
    // even though the week never finished advancing — the song-generation rows
    // survive the crash. PR-3 (single tx) flips this: these rows must roll back.
    expect(songsAfter.length).toBeGreaterThan(0);

    // PINS CURRENT BROKEN BEHAVIOR (D6): tx2 never ran, so the week/money were NOT
    // advanced despite tx1's writes being committed — the classic half-applied
    // week. Replaying the week would DOUBLE-apply the committed engine effects.
    // PR-3 flips this into an all-or-nothing outcome (week stays exactly at N with
    // no orphaned engine rows).
    expect(gsAfter.currentWeek).toBe(2); // NOT advanced to 3
    expect(gsAfter.money).toBe(500000); // NOT burned down by tx2's UPDATE

    // PINS CURRENT BROKEN BEHAVIOR (D6): weekly_actions is written in tx2, which
    // never ran — so it is empty here. (No actions were passed, but the row-count
    // assertion still documents that tx2's INSERT did not run.)
    expect(actionsAfter.length).toBe(0);
  });

  it('Test B — an error DURING tx1 rolls back tx-bound writes but LEAKS escaping artist writes', async () => {
    const gameId = IDS.escapeInTx1;
    await seedGame(gameId, 2);
    // Mood 70 (>55) => natural drift of -3 in processWeeklyMoodChanges, applied via
    // storage.updateArtist(...) which has NO tx param => it commits on the GLOBAL
    // pool connection, escaping tx1.
    const artistId = await seedArtist(gameId, { name: 'Escaper', mood: 70 });
    // Recording project so tx1 ALSO produces tx-bound song writes we can assert
    // roll back.
    await seedRecordingProject(gameId, artistId, 2);

    const storage = new DatabaseStorage(db);
    const gameData = makeServiceGameData(storage);

    // db proxy: run the REAL tx1 callback (so all engine writes execute — the
    // escaping artist mood write autocommits on the global connection, and the
    // tx-bound writes stage inside tx1), then throw BEFORE tx1 commits so drizzle
    // rolls tx1 back. This faithfully models "an error occurred during tx1".
    const dbProxy: any = {
      transaction: async (cb: any) => {
        return (db as any).transaction(async (tx: any) => {
          await cb(tx);
          throw new Error('[D6 TEST] injected error during tx1 (post-engine, pre-commit)');
        });
      },
    };

    const service = new AdvanceWeekService(storage as any, dbProxy, gameData as any);

    await expect(service.advanceWeek(gameId, [])).rejects.toThrow(
      /injected error during tx1/,
    );

    const [artistAfter] = await db
      .select()
      .from(schema.artists)
      .where(eq(schema.artists.id, artistId));
    const songsAfter = await db
      .select()
      .from(schema.songs)
      .where(eq(schema.songs.gameId, gameId));
    const emailsAfter = await db
      .select()
      .from(schema.emails)
      .where(eq(schema.emails.gameId, gameId));
    const chartsAfter = await db
      .select()
      .from(schema.chartEntries)
      .where(eq(schema.chartEntries.gameId, gameId));

    // tx-bound writes correctly rolled back with tx1.
    expect(songsAfter.length).toBe(0);
    expect(emailsAfter.length).toBe(0);
    expect(chartsAfter.length).toBe(0);

    // PINS CURRENT BROKEN BEHAVIOR (D6): the artist mood write ESCAPED tx1 (it ran
    // on the global connection via storage.updateArtist, which takes no tx param)
    // and stayed committed even though tx1 rolled back. mood drifted 70 -> 67.
    // PR-2 (plumb the tx handle through updateArtist) flips this: the mood write
    // must roll back WITH tx1, so mood stays at its seeded 70.
    expect(artistAfter.mood).not.toBe(70);
    expect(artistAfter.mood).toBe(67);
  });
});
