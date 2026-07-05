// @vitest-environment node
/**
 * D6 — Whole-week transaction atomicity net for POST /api/advance-week.
 *
 * As of D6 PR-3 the ENTIRE week advance runs in ONE PostgreSQL transaction
 * (`AdvanceWeekService.advanceWeek`). The former split — TX 1 (engine run) and
 * TX 2 (gameStates UPDATE + weekly_actions INSERT + debug read-backs) — was
 * merged into a single `db.transaction`, so a crash ANYWHERE mid-advance rolls
 * the whole week back: all-or-nothing.
 *
 *   SINGLE TX (advanceWeekService.ts): SELECT ... FOR UPDATE on the game row,
 *         loads state, runs the whole GameEngine (song creation, emails, charts,
 *         project stage advance, tour city writes, planned-release marketing
 *         idempotency flags), THEN persists the advanced gameState
 *         (currentWeek/money/...) + inserts weekly_actions + reads back the debug
 *         envelope. All bound to the same `tx`.
 *
 * History of these tests:
 *   - Test A previously PINNED the broken two-tx behavior (a crash between tx1
 *     and tx2 left a half-applied week: engine rows committed, week/money not
 *     advanced). D6 PR-3 FLIPPED it: a crash at the persistence step now rolls
 *     back the engine writes too — no orphaned songs/tour writes/planned-release
 *     flags, week unchanged, weekly_actions empty. All-or-nothing.
 *   - Test B was FLIPPED in D6 PR-2: the artist mood/energy writes that once
 *     escaped tx1 (via storage.updateArtist, which had no tx param) now honor the
 *     threaded dbTransaction and roll back WITH the transaction.
 *
 * Harness: constructs `AdvanceWeekService` with INJECTED deps (test-DB-backed
 * `DatabaseStorage`, a `db` proxy that can inject a mid-transaction failure, and
 * a gameData bridge reusing the golden-master fixture). NEVER imports `server/db`.
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
import { AdvanceWeekService, AdvanceWeekConflictError } from '../../server/services/advanceWeekService';
import { createTestDatabase, clearDatabase, setupDatabase } from '../helpers/test-db';
import { createGameData, type TestDb } from '../engine/golden-master-fixtures';

// Fixed, human-readable-ish UUIDs per scenario for stability.
const IDS = {
  crashPersist: '00000000-0000-4000-8000-0000000000d1',
  escapeInTx1: '00000000-0000-4000-8000-0000000000d2',
  concurrentA: '00000000-0000-4000-8000-0000000000d3',
  staleGuard: '00000000-0000-4000-8000-0000000000d4',
  freshGuard: '00000000-0000-4000-8000-0000000000d5',
  noGuard: '00000000-0000-4000-8000-0000000000d6',
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
 * methods plus the tx-honoring createSong/updateSong bridges.
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
    // exercises rollback), which would make the "songs roll back" assertions
    // false-green; here we must match production so the pin is faithful.
    createSong: async (song: any, tx?: any) => {
      if (tx) {
        const [created] = await tx.insert(schema.songs).values(song).returning();
        return created;
      }
      return storage.createSong(song);
    },
    // Mirror production ServerGameData.updateSong (server/data/gameData.ts:1080):
    // honor the passed transaction (ReleaseProcessor.processSongRelease threads
    // ctx.dbTransaction as of D6 PR-3) so song-release writes are tx-BOUND.
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

/**
 * Seeds an active Mini-Tour in production stage. With game at week 3 and
 * startWeek 2, the week advances to 4 -> weeksElapsed=2 -> weeksInProduction=1 ->
 * TourProcessor processes city 1 and writes `metadata.tourStats` via
 * storage.updateProject(..., dbTransaction) (D6 PR-2 threaded the tx through it).
 * Fixture mirrors golden-master-advance-week.test.ts's tour-week scenario.
 */
async function seedTourProject(gameId: string, artistId: string) {
  const id = crypto.randomUUID();
  await db.insert(schema.projects).values({
    id,
    gameId,
    artistId,
    title: 'D6 World Tour',
    type: 'Mini-Tour',
    stage: 'production',
    startWeek: 2,
    totalCost: 30000,
    quality: 50,
    metadata: {
      cities: 3,
      venueAccess: 'clubs',
      venueCapacity: 500,
    },
  });
  return id;
}

/**
 * Seeds a planned release scheduled for the current week with a recorded (not yet
 * released) song and a marketing budget. When the engine's processPlannedReleases
 * runs, FinancialSystem.allocateMarketingInvestment flips the release's
 * `metadata.baseMarketingAllocated` idempotency flag via
 * storage.updateRelease(..., dbTransaction) (D6 PR-2 threaded the tx through it).
 * On rollback, that flag must NOT be set.
 */
async function seedPlannedRelease(gameId: string, artistId: string, week: number) {
  const releaseId = crypto.randomUUID();
  const songId = crypto.randomUUID();
  await db.insert(schema.songs).values({
    id: songId,
    title: 'D6 Planned Track',
    artistId,
    gameId,
    quality: 60,
    isRecorded: true,
    isReleased: false,
    productionBudget: 5000,
  });
  await db.insert(schema.releases).values({
    id: releaseId,
    title: 'D6 Planned Single',
    type: 'single',
    artistId,
    gameId,
    releaseWeek: week,
    status: 'planned',
    marketingBudget: 10000,
    metadata: {
      totalInvestment: 10000,
      marketingBudget: { radio: 10000 },
    },
  });
  await db.insert(schema.releaseSongs).values({
    releaseId,
    songId,
    trackNumber: 1,
    isSingle: false,
  });
  return { releaseId, songId };
}

describe('D6 — advance-week whole-week transaction atomicity', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('Test A — a crash at the persistence step rolls back the ENTIRE week (all-or-nothing)', async () => {
    const gameId = IDS.crashPersist;
    // Week 3 so the tour (startWeek 2) processes city 1 this advance.
    await seedGame(gameId, 3);
    // Mood 70 (>55) => -3 natural drift applied via storage.updateArtist (tx-bound
    // as of D6 PR-2). Must NOT persist after rollback.
    const artistId = await seedArtist(gameId, { name: 'Recorder', mood: 70 });
    // (1) A production Single with no songs yet generates songs this week (tx-bound).
    await seedRecordingProject(gameId, artistId, 3);
    // (2) An active Mini-Tour writes project.metadata.tourStats this week (tx-bound
    //     via ProjectStageProcessor/TourProcessor).
    const tourId = await seedTourProject(gameId, artistId);
    // (3) A planned release scheduled for this week flips its
    //     metadata.baseMarketingAllocated idempotency flag (tx-bound via
    //     FinancialSystem InvestmentTracker -> storage.updateRelease).
    const { releaseId } = await seedPlannedRelease(gameId, artistId, 3);

    const storage = new DatabaseStorage(db);
    const gameData = makeServiceGameData(storage);

    // db proxy: run the REAL single transaction, but wrap the `tx` passed to the
    // callback so the FIRST `update(gameStates)` call — the very first statement of
    // the merged persistence block (the former tx1/tx2 boundary, now inside one
    // tx) — throws. This models "the process crashes at the final persistence step"
    // AFTER the engine fully ran and staged all its writes. Because it is one
    // transaction, that crash must roll back everything the engine wrote.
    const dbProxy: any = {
      transaction: async (cb: any) => {
        return (db as any).transaction(async (tx: any) => {
          const wrapped = new Proxy(tx, {
            get(target, prop, receiver) {
              if (prop === 'update') {
                return (table: any) => {
                  if (table === schema.gameStates) {
                    throw new Error('[D6 TEST] injected crash at persistence step');
                  }
                  return (target as any).update(table);
                };
              }
              return Reflect.get(target, prop, receiver);
            },
          });
          return cb(wrapped);
        });
      },
    };

    const service = new AdvanceWeekService(storage as any, dbProxy, gameData as any);

    await expect(service.advanceWeek(gameId, [])).rejects.toThrow(
      /injected crash at persistence step/,
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
    const emailsAfter = await db
      .select()
      .from(schema.emails)
      .where(eq(schema.emails.gameId, gameId));
    const [artistAfter] = await db
      .select()
      .from(schema.artists)
      .where(eq(schema.artists.id, artistId));
    const [tourAfter] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, tourId));
    const [releaseAfter] = await db
      .select()
      .from(schema.releases)
      .where(eq(schema.releases.id, releaseId));

    // D6 PR-3 GUARANTEE (flipped from the pinned broken two-tx behavior): the whole
    // week advance is ONE transaction, so a crash at the persistence step rolls back
    // EVERYTHING the engine wrote. There must be NO committed engine rows and NO
    // week/money change — the game is left exactly at week N.

    // Only the planned-release's pre-seeded song remains; no engine-created
    // recording songs survived the rollback.
    expect(songsAfter.length).toBe(1);
    // No engine-generated emails survived.
    expect(emailsAfter.length).toBe(0);

    // Week/money NOT advanced — exactly at week N.
    expect(gsAfter.currentWeek).toBe(3);
    expect(gsAfter.money).toBe(500000);

    // weekly_actions never written (persistence rolled back).
    expect(actionsAfter.length).toBe(0);

    // Escaping-writes-now-tx-bound (PR-2) roll back with the tx: mood stays seeded 70.
    expect(artistAfter.mood).toBe(70);

    // Tour project write rolled back: metadata.tourStats was never committed.
    expect((tourAfter.metadata as any)?.tourStats).toBeUndefined();

    // Planned-release marketing idempotency flag rolled back: NOT set.
    expect((releaseAfter.metadata as any)?.baseMarketingAllocated).toBeUndefined();
    // Release still 'planned' (updateReleaseStatus rolled back too).
    expect(releaseAfter.status).toBe('planned');
  });

  it('Test B — an error DURING the engine run rolls back tx-bound AND formerly-escaping writes', async () => {
    const gameId = IDS.escapeInTx1;
    await seedGame(gameId, 2);
    // Mood 70 (>55) => natural drift of -3 in processWeeklyMoodChanges, applied via
    // storage.updateArtist(...). As of D6 PR-2 that write honors the threaded
    // dbTransaction, so it rolls back WITH the transaction (it no longer escapes on
    // the global connection).
    const artistId = await seedArtist(gameId, { name: 'Escaper', mood: 70 });
    // Recording project so the engine ALSO produces tx-bound song writes we can
    // assert roll back.
    await seedRecordingProject(gameId, artistId, 2);

    const storage = new DatabaseStorage(db);
    const gameData = makeServiceGameData(storage);

    // db proxy: run the REAL callback (so all engine writes execute and stage inside
    // the tx), then throw BEFORE the tx commits so drizzle rolls it back. This
    // faithfully models "an error occurred during the engine run".
    const dbProxy: any = {
      transaction: async (cb: any) => {
        return (db as any).transaction(async (tx: any) => {
          await cb(tx);
          throw new Error('[D6 TEST] injected error during engine run (pre-commit)');
        });
      },
    };

    const service = new AdvanceWeekService(storage as any, dbProxy, gameData as any);

    await expect(service.advanceWeek(gameId, [])).rejects.toThrow(
      /injected error during engine run/,
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

    // tx-bound writes correctly rolled back.
    expect(songsAfter.length).toBe(0);
    expect(emailsAfter.length).toBe(0);
    expect(chartsAfter.length).toBe(0);

    // D6 PR-2 GUARANTEE: the artist mood write is tx-BOUND. storage.updateArtist
    // honors the dbTransaction threaded through ArtistStateProcessor, so when the
    // tx rolls back the mood write rolls back WITH it — no longer escaping on the
    // global connection. mood stays at its seeded 70 instead of drifting to 67.
    expect(artistAfter.mood).toBe(70);
  });

  it('Concurrency smoke — two concurrent advances for the same game serialize (FOR UPDATE), advancing exactly once each', async () => {
    const gameId = IDS.concurrentA;
    await seedGame(gameId, 5);
    await seedArtist(gameId, { name: 'Concurrent' });

    // Two services sharing the SAME underlying test DB (separate DatabaseStorage
    // instances, real db.transaction — no failure injection). The initial
    // SELECT ... FOR UPDATE serializes them: the second blocks until the first
    // commits week 6, then advances 6 -> 7. Final week must be start+2 with no
    // deadlock and no double-apply of a single week.
    const storageA = new DatabaseStorage(db);
    const storageB = new DatabaseStorage(db);
    const serviceA = new AdvanceWeekService(storageA as any, db as any, makeServiceGameData(storageA) as any);
    const serviceB = new AdvanceWeekService(storageB as any, db as any, makeServiceGameData(storageB) as any);

    const [resA, resB] = await Promise.all([
      serviceA.advanceWeek(gameId, []),
      serviceB.advanceWeek(gameId, []),
    ]);

    // Each call advanced the week by exactly one; the two results are weeks 6 and 7
    // in some order (whichever acquired the row lock first).
    const weeks = [resA.gameState.currentWeek, resB.gameState.currentWeek].sort();
    expect(weeks).toEqual([6, 7]);

    // Final persisted week is start+2 — each request applied exactly one week, no
    // double-apply of a single week, no deadlock.
    const [gsAfter] = await db
      .select()
      .from(schema.gameStates)
      .where(eq(schema.gameStates.id, gameId));
    expect(gsAfter.currentWeek).toBe(7);
  });

  // C58: optimistic stale-week guard. The concurrency smoke test above proves
  // both concurrent requests SUCCEED (the FOR UPDATE lock only serializes
  // them) — that is exactly the double-submit bug: a second click advances an
  // extra week instead of being rejected. These tests pin the guard that fixes
  // it: the service checks the row's currentWeek against the caller's
  // expectedCurrentWeek right after the FOR UPDATE re-read, inside the tx.
  it('C58 — stale expectedCurrentWeek is rejected with a 409 AdvanceWeekConflictError; week does NOT advance', async () => {
    const gameId = IDS.staleGuard;
    await seedGame(gameId, 5);
    await seedArtist(gameId, { name: 'Stale Guard' });

    const storage = new DatabaseStorage(db);
    const gameData = makeServiceGameData(storage);
    const service = new AdvanceWeekService(storage as any, db as any, gameData as any);

    // Row is at week 5; caller believes it's still week 4 (e.g. its own prior
    // advance request already committed and moved the row to 5).
    await expect(service.advanceWeek(gameId, [], 4)).rejects.toThrow(AdvanceWeekConflictError);

    try {
      await service.advanceWeek(gameId, [], 4);
      throw new Error('expected advanceWeek to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(AdvanceWeekConflictError);
      expect((err as AdvanceWeekConflictError).status).toBe(409);
      expect((err as AdvanceWeekConflictError).body).toMatchObject({
        error: 'ADVANCE_WEEK_CONFLICT',
        currentWeek: 5,
        expectedCurrentWeek: 4,
      });
    }

    const [gsAfter] = await db
      .select()
      .from(schema.gameStates)
      .where(eq(schema.gameStates.id, gameId));
    // Week unchanged by either rejected call.
    expect(gsAfter.currentWeek).toBe(5);
  });

  it('C58 — correct expectedCurrentWeek succeeds and advances the week normally', async () => {
    const gameId = IDS.freshGuard;
    await seedGame(gameId, 5);
    await seedArtist(gameId, { name: 'Fresh Guard' });

    const storage = new DatabaseStorage(db);
    const gameData = makeServiceGameData(storage);
    const service = new AdvanceWeekService(storage as any, db as any, gameData as any);

    const result = await service.advanceWeek(gameId, [], 5);
    expect(result.gameState.currentWeek).toBe(6);

    const [gsAfter] = await db
      .select()
      .from(schema.gameStates)
      .where(eq(schema.gameStates.id, gameId));
    expect(gsAfter.currentWeek).toBe(6);
  });

  it('C58 — omitting expectedCurrentWeek preserves prior behavior (no guard enforced)', async () => {
    const gameId = IDS.noGuard;
    await seedGame(gameId, 5);
    await seedArtist(gameId, { name: 'No Guard' });

    const storage = new DatabaseStorage(db);
    const gameData = makeServiceGameData(storage);
    const service = new AdvanceWeekService(storage as any, db as any, gameData as any);

    // No third argument at all — backward-compat pin: the call succeeds exactly
    // as it did before the guard existed, regardless of the row's actual week.
    const result = await service.advanceWeek(gameId, []);
    expect(result.gameState.currentWeek).toBe(6);

    const [gsAfter] = await db
      .select()
      .from(schema.gameStates)
      .where(eq(schema.gameStates.id, gameId));
    expect(gsAfter.currentWeek).toBe(6);
  });
});
