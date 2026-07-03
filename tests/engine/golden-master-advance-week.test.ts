/**
 * Golden-master characterization harness for GameEngine.advanceWeek (Phase 2 PR-2).
 *
 * This is Phase 2's safety net — the route-manifest equivalent for the engine.
 * PRs 3–13 (processor extractions) must keep these snapshots BYTE-IDENTICAL.
 *
 * Each scenario:
 *   1. seeds ONE game (FIXED gameId + FIXED rng seed) with the minimal rows to
 *      exercise a specific advanceWeek code path (see §2 seam map in the plan),
 *   2. runs advanceWeek inside a REAL db.transaction, passing `tx` (mirrors
 *      gameLoop.ts:227 — required for advanceProjectStages / tour revenue),
 *   3. snapshots structured data only (§6): the WeekSummary, a gameState delta,
 *      and normalized digests of persisted rows.
 *
 * Stability: fixtures are torn down + reseeded per run (fixed gameIds), and all
 * nondeterminism (UUIDs, wall-clock stamps, nested metadata timestamps, DB return
 * order) is stripped by the shared normalizer. Running the suite twice in a row
 * must produce zero snapshot updates.
 *
 * NEVER import server/db here — the engine gets `DatabaseStorage(testDb)`.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { GameEngine } from '@shared/engine/game-engine';
import * as schema from '@shared/schema';
import { DatabaseStorage } from '../../server/storage';
import { createTestDatabase, clearDatabase, setupDatabase } from '../helpers/test-db';
import {
  createGameData,
  makeGameState,
  readDigest,
  snapshotState,
  stateDelta,
  normalize,
  compactSummary,
  type TestDb,
} from './golden-master-fixtures';

// Fixed, human-readable-ish UUIDs per scenario so the RNG seed derivation is stable
// even if we did not pass an explicit seed. We DO pass an explicit seed too.
const IDS = {
  empty: '00000000-0000-4000-8000-000000000001',
  recording: '00000000-0000-4000-8000-000000000002',
  release: '00000000-0000-4000-8000-000000000003',
  leadSingle: '00000000-0000-4000-8000-000000000004',
  tour: '00000000-0000-4000-8000-000000000005',
  arOffice: '00000000-0000-4000-8000-000000000006',
  catalog: '00000000-0000-4000-8000-000000000007',
  actions: '00000000-0000-4000-8000-000000000008',
};

let db: TestDb;

/** Inserts a game_states row with a pinned rngSeed. */
async function seedGame(id: string, week: number, overrides: Record<string, any> = {}) {
  await db.insert(schema.gameStates).values({
    id,
    currentWeek: week,
    money: 500000,
    reputation: 10,
    venueAccess: 'clubs',
    rngSeed: `golden-${id}`,
    ...overrides,
  });
}

async function seedArtist(gameId: string, over: Record<string, any> = {}) {
  const id = crypto.randomUUID();
  const { name, archetype, genre, talent, workEthic, popularity, temperament, energy, mood, ...rest } = over;
  await db.insert(schema.artists).values({
    id,
    gameId,
    name: name ?? 'Golden Artist',
    archetype: archetype ?? 'Workhorse',
    genre: genre ?? 'pop',
    talent: talent ?? 60,
    workEthic: workEthic ?? 70,
    popularity: popularity ?? 50,
    temperament: temperament ?? 50,
    energy: energy ?? 50,
    mood: mood ?? 50,
    signed: true,
    ...rest,
  });
  return id;
}

/**
 * Runs advanceWeek inside a real transaction (mirrors production gameLoop.ts).
 * Returns the (normalized) snapshot payload for the scenario.
 */
async function runScenario(gameId: string, gameStateOverrides: Record<string, any>, actions: any[] = [], catalogArtists: any[] = []) {
  const storage = new DatabaseStorage(db);
  const gameData = createGameData(storage, catalogArtists);
  const gameState = makeGameState(gameId, gameStateOverrides);

  const before = snapshotState(gameState);

  // Explicit fixed seed — pin the RNG stream (constructor would otherwise derive
  // it from `${id}-${currentWeek}`; we pin it so it never depends on the week).
  const engine = new GameEngine(gameState, gameData, storage, `golden-${gameId}`);

  let summary: any;
  await (db as any).transaction(async (tx: any) => {
    const result = await engine.advanceWeek(actions, tx);
    summary = result.summary;
  });

  const after = snapshotState(gameState);
  const digest = await readDigest(db, gameId);

  return {
    summary: normalize(compactSummary(summary)),
    stateDelta: stateDelta(before, after),
    digest,
  };
}

describe('GameEngine.advanceWeek — golden master', () => {
  beforeAll(async () => {
    // Ensure CHECK constraints are applied (idempotent) for a fresh DB.
    await setupDatabase();
  });

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('empty-week: burn, salaries, mood drift, popularity, progression', async () => {
    await seedGame(IDS.empty, 1);
    await seedArtist(IDS.empty);

    const snap = await runScenario(IDS.empty, { id: IDS.empty, currentWeek: 1 });
    expect(snap).toMatchSnapshot();
  });

  it('recording-week: production project generates songs (quality path)', async () => {
    await seedGame(IDS.recording, 2);
    const artistId = await seedArtist(IDS.recording, { name: 'Recorder' });
    // Single in production, no songs yet -> generates up to 2 songs this week.
    await db.insert(schema.projects).values({
      id: crypto.randomUUID(),
      gameId: IDS.recording,
      artistId,
      title: 'Debut Single',
      type: 'Single',
      stage: 'production',
      songCount: 2,
      songsCreated: 0,
      startWeek: 2,
      totalCost: 8000,
      budgetPerSong: 4000,
      producerTier: 'local',
      timeInvestment: 'standard',
      quality: 0,
    });

    const snap = await runScenario(IDS.recording, { id: IDS.recording, currentWeek: 2 });
    expect(snap).toMatchSnapshot();
  });

  it('release-week: planned release executes this week (streaming + charts)', async () => {
    await seedGame(IDS.release, 4);
    const artistId = await seedArtist(IDS.release, { name: 'Releaser' });
    const releaseId = crypto.randomUUID();
    const songId = crypto.randomUUID();
    await db.insert(schema.songs).values({
      id: songId,
      gameId: IDS.release,
      artistId,
      title: 'Planned Track',
      quality: 75,
      genre: 'pop',
      isRecorded: true,
      isReleased: false,
    });
    await db.insert(schema.releases).values({
      id: releaseId,
      gameId: IDS.release,
      artistId,
      title: 'Planned Single',
      type: 'single',
      status: 'planned',
      releaseWeek: 5, // == advanced week (seed currentWeek 4 -> advances to 5)
      marketingBudget: 5000,
      metadata: { marketingBudget: 5000, totalInvestment: 5000 },
    });
    await db.insert(schema.releaseSongs).values({
      releaseId,
      songId,
      trackNumber: 1,
      isSingle: true,
    });

    const snap = await runScenario(IDS.release, { id: IDS.release, currentWeek: 4 });
    expect(snap).toMatchSnapshot();
  });

  it('lead-single-week: leadSingleStrategy fires this week', async () => {
    await seedGame(IDS.leadSingle, 2);
    const artistId = await seedArtist(IDS.leadSingle, { name: 'LeadArtist' });
    const releaseId = crypto.randomUUID();
    const leadSongId = crypto.randomUUID();
    await db.insert(schema.songs).values({
      id: leadSongId,
      gameId: IDS.leadSingle,
      artistId,
      title: 'Lead Cut',
      quality: 80,
      genre: 'pop',
      isRecorded: true,
      isReleased: false,
    });
    await db.insert(schema.releases).values({
      id: releaseId,
      gameId: IDS.leadSingle,
      artistId,
      title: 'Upcoming EP',
      type: 'ep',
      status: 'planned',
      releaseWeek: 8,
      metadata: {
        leadSingleStrategy: {
          leadSingleId: leadSongId,
          leadSingleReleaseWeek: 3, // == advanced week (seed 2 -> 3)
          leadSingleBudget: { radio: 2000, digital: 1000 },
        },
      },
    });
    await db.insert(schema.releaseSongs).values({
      releaseId,
      songId: leadSongId,
      trackNumber: 1,
      isSingle: true,
    });

    const snap = await runScenario(IDS.leadSingle, { id: IDS.leadSingle, currentWeek: 2 });
    expect(snap).toMatchSnapshot();
  });

  it('tour-week: active Mini-Tour produces city revenue + variance + mood impacts', async () => {
    await seedGame(IDS.tour, 3);
    const artistId = await seedArtist(IDS.tour, { name: 'Touring Act', popularity: 60 });
    await db.insert(schema.projects).values({
      id: crypto.randomUUID(),
      gameId: IDS.tour,
      artistId,
      title: 'World Tour',
      type: 'Mini-Tour',
      stage: 'production',
      startWeek: 2, // advanced week 4 -> weeksElapsed=2 -> weeksInProduction=1 -> city 1
      totalCost: 30000,
      quality: 50,
      metadata: {
        cities: 3,
        venueAccess: 'clubs',
        venueCapacity: 500,
      },
    });

    const snap = await runScenario(IDS.tour, { id: IDS.tour, currentWeek: 3, venueAccess: 'clubs' });
    expect(snap).toMatchSnapshot();
  });

  it('ar-office-week: sourcing slot completes and discovers an artist', async () => {
    await seedGame(IDS.arOffice, 1, {
      arOfficeSlotUsed: true,
      arOfficeSourcingType: 'active',
    });
    await seedArtist(IDS.arOffice, { name: 'Signed Local' });

    // Catalog of signable (unsigned) artists for A&R to discover. 'active' mode
    // deterministically picks the highest talent+popularity — no RNG draw.
    const catalog = [
      { id: 'art_gold_1', name: 'Discovery One', archetype: 'Visionary', talent: 85, popularity: 40, genre: 'pop' },
      { id: 'art_gold_2', name: 'Discovery Two', archetype: 'Workhorse', talent: 55, popularity: 30, genre: 'rock' },
    ];

    const snap = await runScenario(
      IDS.arOffice,
      { id: IDS.arOffice, currentWeek: 1, arOfficeSlotUsed: true, arOfficeSourcingType: 'active' },
      [],
      catalog,
    );
    expect(snap).toMatchSnapshot();
  });

  it('released-catalog-week: previously released song generates ongoing revenue + decay', async () => {
    await seedGame(IDS.catalog, 5);
    const artistId = await seedArtist(IDS.catalog, { name: 'Catalog Artist', popularity: 55 });
    await db.insert(schema.songs).values({
      id: crypto.randomUUID(),
      gameId: IDS.catalog,
      artistId,
      title: 'Hit From Before',
      quality: 78,
      genre: 'pop',
      isRecorded: true,
      isReleased: true,
      releaseWeek: 4, // advanced week 6 -> weeksSinceRelease = 2 (in decay window)
      initialStreams: 50000, // hard gate: >0 required for ongoing revenue
      totalStreams: 120000,
      totalRevenue: 4000,
      weeklyStreams: 30000,
      awareness: 20,
      peak_awareness: 25,
    });

    const snap = await runScenario(IDS.catalog, { id: IDS.catalog, currentWeek: 5 });
    expect(snap).toMatchSnapshot();
  });

  it('actions-week: role meeting + marketing action + executive mood decay', async () => {
    await seedGame(IDS.actions, 4);
    await seedArtist(IDS.actions, { name: 'Roster Artist' });
    const execId = crypto.randomUUID();
    await db.insert(schema.executives).values({
      id: execId,
      gameId: IDS.actions,
      role: 'head_ar',
      level: 1,
      mood: 70, // >55 -> normalizes down (deterministic)
      loyalty: 60,
      lastActionWeek: 0, // treated as weeksSinceAction = currentWeek -> loyalty decay too
    });

    const actions = [
      {
        actionType: 'role_meeting',
        targetId: 'role-ceo',
        metadata: { roleId: 'ceo', actionId: 'strategy_session', choiceId: 'choice_a' },
        details: { roleId: 'ceo', actionId: 'strategy_session', choiceId: 'choice_a' },
      },
      {
        actionType: 'marketing',
        targetId: null,
        metadata: { marketingType: 'digital_ads' },
        details: { marketingType: 'digital_ads' }, // processMarketing reads details.marketingType
      },
    ];

    const snap = await runScenario(IDS.actions, { id: IDS.actions, currentWeek: 4 }, actions);
    expect(snap).toMatchSnapshot();
  });
});
