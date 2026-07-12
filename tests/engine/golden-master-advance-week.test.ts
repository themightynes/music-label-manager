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
import { ESCALATION_EVENT_BY_ROLE } from '@shared/utils/executiveDelegation';
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
  AUTONOMOUS_MEETING_POOL,
  withAutonomousPool,
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
  tourLegacy: '00000000-0000-4000-8000-000000000009',
  multiArtistRelease: '00000000-0000-4000-8000-00000000000a',
  // C86 additive fixtures (2026-07-11): balance-integrity arc coverage.
  flopRelease: '00000000-0000-4000-8000-00000000000b',
  lowMoodRecording: '00000000-0000-4000-8000-00000000000c',
  underEnergyTour: '00000000-0000-4000-8000-00000000000d',
  saturatedTour: '00000000-0000-4000-8000-00000000000e',
  // Mandatory Side Events additive fixtures ("Crisis on the Desk", 2026-07-11).
  sideEventDefer: '00000000-0000-4000-8000-00000000000f',
  sideEventResolve: '00000000-0000-4000-8000-000000000010',
  // Executive Delegation arc additive fixtures (Tier 1, 2026-07-12). Fixed UUIDs
  // (C86 lesson: autonomous flag keys embed roleIds not UUIDs, but pin ids anyway).
  autonomousResolution: '00000000-0000-4000-8000-000000000011',
  autonomousMoodRisk: '00000000-0000-4000-8000-000000000012',
  autoEndorse: '00000000-0000-4000-8000-000000000013',
  neglect: '00000000-0000-4000-8000-000000000014',
  ceoLapse: '00000000-0000-4000-8000-000000000015',
  // Escalation arc additive fixtures (Tier 2, 2026-07-12).
  escalationWeek: '00000000-0000-4000-8000-000000000016',
  escalationLoyalNoFire: '00000000-0000-4000-8000-000000000017',
  escalationNonUrgentNoFire: '00000000-0000-4000-8000-000000000018',
  escalationAlreadyPending: '00000000-0000-4000-8000-000000000019',
  escalationKillSwitch: '00000000-0000-4000-8000-00000000001a',
};

// A deterministic single-event catalog + config decorator forcing a side-event
// hit (weekly_chance 1) in mandatory mode. Used only by the two additive
// side-event fixtures below — every other scenario keeps weekly_chance 0 (no
// event), so their snapshots are untouched.
const CRISIS_EVENT = {
  id: 'gm_crisis',
  role_hint: 'x',
  category: 'business_opportunities' as const,
  prompt: 'A distributor offers a lucrative but risky catalog deal.',
  choices: [
    { id: 'accept', label: 'Take the deal', effects_immediate: { money: 12000 }, effects_delayed: { reputation: 2 } },
    { id: 'decline', label: 'Walk away', effects_immediate: { reputation: 1 }, effects_delayed: {} },
  ],
};

function forceCrisisGameData(gd: any): any {
  return {
    ...gd,
    getMandatorySideEventsConfigSync: () => ({ enabled: true }),
    getEventConfigSync: () => ({ weekly_chance: 1, cooldown_weeks: 2, max_per_year: 12 }),
    getSideEventsConfigSync: () => ({ event_weights: { business_opportunities: 1 }, event_cooldown: 2 }),
    getAllEvents: async () => [CRISIS_EVENT],
    getEventById: async (id: string) => (id === CRISIS_EVENT.id ? CRISIS_EVENT : undefined),
  };
}

// Executive Delegation arc (Tier 1, §10.2): a pool where the loyal (safety) band
// TIES between two gamble-free choices differing only in money spend (clamped in
// the safety score) — so mood risk-appetite decides. One meeting per role.
const MOOD_RISK_POOL: any[] = ['head_ar', 'cmo'].map((role) => ({
  type: 'role_meeting', id: `mr_${role}`, role_id: role, name: `${role} call`,
  target_scope: 'global', requires: [], choices: [
    { id: 'cheap', label: 'Cheap', effects_immediate: { money: -3000 }, effects_delayed: {} },
    { id: 'pricey', label: 'Pricey', effects_immediate: { money: -9000 }, effects_delayed: {} },
  ],
}));

// Escalation arc (Tier 2, §10.2/§10.4): the real events.json escalation event
// for head_ar (ESCALATION_EVENT_BY_ROLE is the shared role→eventId constant the
// engine itself reads — imported, not re-literaled, so the test stays coupled
// to the real mapping). A minimal single-choice stand-in mirroring the real
// event's shape (id/prompt/category/choices) is enough to pin the payload; the
// authored content itself is covered by data-lint + JSON validation, not here.
const ESCALATION_TEST_EVENT = {
  id: ESCALATION_EVENT_BY_ROLE.head_ar,
  role_hint: 'Mac (Head of A&R)',
  category: 'industry_drama' as const,
  escalation_only: true,
  prompt: 'Mac let a promising signing go cold while his attention was elsewhere.',
  choices: [
    { id: 'chase_rebound', label: 'Chase an aggressive rebound signing', effects_immediate: { money: -6000 }, effects_delayed: { variance_up: 1 } },
    { id: 'eat_the_loss', label: 'Eat the loss, protect the budget', effects_immediate: { money: -1500 }, effects_delayed: { reputation: -1 } },
    { id: 'own_the_miss', label: 'Own the miss publicly', effects_immediate: { creative_capital: -1 }, effects_delayed: { reputation: 1, press_story_flag: 1 } },
  ],
};

/**
 * A head_ar meeting pool with ONE meeting carrying `reactive_trigger:
 * 'recent_signing'` — matched when the seeded artist's `signedWeek` equals
 * `offeredWeek - 1` (deriveWeekHappenings' player-action-class window;
 * `offeredWeek = (post-increment currentWeek) - 1` = the seedGame week). So a
 * seedGame week of 4 needs `signedWeek: 3` to land the reactive match. This is
 * what makes `reactiveHappening` non-null so the escalation trigger (§5.1) is
 * actually exercised — every OTHER autonomous-* fixture's pool has NO
 * reactive_trigger, so this is the only scenario class that can fire escalation.
 */
const ESCALATION_REACTIVE_POOL: any[] = [
  {
    type: 'role_meeting', id: 'esc_ar_urgent', role_id: 'head_ar', name: 'Urgent A&R call',
    target_scope: 'global', requires: [], reactive_trigger: 'recent_signing', choices: [
      { id: 'ar_safe', label: 'Play it safe', effects_immediate: {}, effects_delayed: { reputation: 1 } },
      { id: 'ar_gamble', label: 'Chase the wild card', effects_immediate: {}, effects_delayed: { variance_up: 2 } },
    ],
  },
];

/**
 * The shared `normalize()` helper (golden-master-fixtures.ts) blanket-replaces
 * ANY object key literally named `id` with the placeholder `'<id>'` (it does not
 * distinguish a UUID `id` from an authored content id like a choice's `'accept'`)
 * — so an event's `choices[].id` comes back normalized in a `stateDelta`. This
 * mirrors that one rule (nothing else) so a manual `.toEqual()` against a raw
 * (un-normalized) expected event payload matches what `stateDelta` actually
 * produces.
 */
function withNormalizedChoiceIds(choices: any[]): any[] {
  return choices.map(({ id, ...rest }) => ({ id: '<id>', ...rest }));
}

/** Decorates gameData with the escalation event catalog + mandatory config. */
function withEscalationEvents(gd: any, overrides: Record<string, any> = {}): any {
  return {
    ...gd,
    getMandatorySideEventsConfigSync: () => ({ enabled: true }),
    getAllEvents: async () => [ESCALATION_TEST_EVENT],
    getEventById: async (id: string) => (id === ESCALATION_TEST_EVENT.id ? ESCALATION_TEST_EVENT : undefined),
    ...overrides,
  };
}

let db: TestDb;

/** Inserts an executive row for the given game/role. */
async function seedExecutive(gameId: string, role: string, over: Record<string, any> = {}) {
  const id = crypto.randomUUID();
  await db.insert(schema.executives).values({
    id,
    gameId,
    role,
    level: 1,
    mood: over.mood ?? 50,
    loyalty: over.loyalty ?? 50,
    lastActionWeek: over.lastActionWeek ?? 0,
  });
  return id;
}

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
async function runScenario(
  gameId: string,
  gameStateOverrides: Record<string, any>,
  actions: any[] = [],
  catalogArtists: any[] = [],
  opts: { decorateGameData?: (gd: any) => any; sideEventChoice?: { eventId: string; choiceId: string } } = {}
) {
  const storage = new DatabaseStorage(db);
  const gameData = opts.decorateGameData
    ? opts.decorateGameData(createGameData(storage, catalogArtists))
    : createGameData(storage, catalogArtists);
  const gameState = makeGameState(gameId, gameStateOverrides);

  const before = snapshotState(gameState);

  // Explicit fixed seed — pin the RNG stream (constructor would otherwise derive
  // it from `${id}-${currentWeek}`; we pin it so it never depends on the week).
  const engine = new GameEngine(gameState, gameData, storage, `golden-${gameId}`);

  let summary: any;
  await (db as any).transaction(async (tx: any) => {
    const result = await engine.advanceWeek(actions, tx, { sideEventChoice: opts.sideEventChoice ?? null });
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

  it('multi-artist-release-week: release outcome uses the RELEASE artist, not the first artist in the game (C44)', async () => {
    // Pre-C44 fix, processPlannedReleases fetched `getArtistsByGame(...)[0]` —
    // with a multi-artist roster the outcome used the FIRST artist's popularity
    // instead of the release artist's, so preview (correct artist) and
    // execution diverged. Seed a low-popularity bystander FIRST and give the
    // release to a high-popularity artist: streams in this snapshot are only
    // reproducible if the release artist's popularity (90) drives the math.
    await seedGame(IDS.multiArtistRelease, 4);
    await seedArtist(IDS.multiArtistRelease, { name: 'Bystander Act', popularity: 5 });
    const starArtistId = await seedArtist(IDS.multiArtistRelease, { name: 'Star Releaser', popularity: 90 });

    const releaseId = crypto.randomUUID();
    const songId = crypto.randomUUID();
    await db.insert(schema.songs).values({
      id: songId,
      gameId: IDS.multiArtistRelease,
      artistId: starArtistId,
      title: 'Star Track',
      quality: 75,
      genre: 'pop',
      isRecorded: true,
      isReleased: false,
    });
    await db.insert(schema.releases).values({
      id: releaseId,
      gameId: IDS.multiArtistRelease,
      artistId: starArtistId,
      title: 'Star Single',
      type: 'single',
      status: 'planned',
      releaseWeek: 5,
      marketingBudget: 5000,
      metadata: { marketingBudget: 5000, totalInvestment: 5000 },
    });
    await db.insert(schema.releaseSongs).values({
      releaseId,
      songId,
      trackNumber: 1,
      isSingle: true,
    });

    const snap = await runScenario(IDS.multiArtistRelease, { id: IDS.multiArtistRelease, currentWeek: 4 });
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

  it('legacy-tour-week: Mini-Tour WITHOUT stored venueCapacity survives via tier-midpoint fallback (C41)', async () => {
    // Legacy/imported saves predate the Phase 3 venue-capacity feature; their
    // tour metadata has venueAccess but no venueCapacity. Pre-C41 this threw in
    // TourProcessor pre-calculation and bricked week advancement for the save.
    // Now it falls back to the tier range's deterministic midpoint
    // (clubs [50,500] → 275) and the week completes.
    await seedGame(IDS.tourLegacy, 3);
    const artistId = await seedArtist(IDS.tourLegacy, { name: 'Legacy Tourer', popularity: 60 });
    await db.insert(schema.projects).values({
      id: crypto.randomUUID(),
      gameId: IDS.tourLegacy,
      artistId,
      title: 'Legacy Tour',
      type: 'Mini-Tour',
      stage: 'production',
      startWeek: 2,
      totalCost: 30000,
      quality: 50,
      metadata: {
        cities: 3,
        venueAccess: 'clubs',
        // venueCapacity deliberately absent
      },
    });

    const snap = await runScenario(IDS.tourLegacy, { id: IDS.tourLegacy, currentWeek: 3, venueAccess: 'clubs' });
    // The fallback capacity must show up in the revealed city data.
    const digest: any = snap.digest;
    const tourStats = digest.projects?.[0]?.metadata?.tourStats;
    expect(tourStats?.cities?.[0]?.capacity).toBe(275);
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

  // -------------------------------------------------------------------------
  // C86 — additive fixtures for the balance-integrity arc (2026-07-11).
  // Pre-existing snapshots above must remain byte-identical; these four only
  // ADD coverage for paths the arc made live: the flop reputation penalty,
  // low-mood variance widening, energy-driven tour sell-through, and the
  // tour-popularity saturation clamp.
  // -------------------------------------------------------------------------

  it('flop-release-week: release revenue under the flop ratio of investment fires the reputation penalty', async () => {
    // Mirrors release-week, but authored to FLOP: total investment 20000 (>= the
    // flop_investment_floor of 10000), song quality 20, artist popularity 5 —
    // release-week revenue lands under flop_revenue_ratio × investment, so the
    // balance-integrity slice-2 penalty (flop change entry + reputation sink)
    // fires under the fixed seed.
    //
    // AUTHORING NOTE: the brief's original shape (all 12000 as marketingBudget)
    // does NOT flop — that much marketing pushes release-week revenue (~2400)
    // over the 10% threshold (1200). The investment is therefore split the way
    // a real overspent flop looks: 19000 sunk into production (song
    // production_budget, which ReleaseProcessor sums into totalInvestment) +
    // 1000 marketing, so revenue stays under the ratio while the floor is met.
    await seedGame(IDS.flopRelease, 4);
    const artistId = await seedArtist(IDS.flopRelease, { name: 'Flop Releaser', popularity: 5 });
    // FIXED release id: the flop once-only flag key is
    // flop_penalty_applied_<releaseId>, and the normalizer cannot neutralize a
    // UUID embedded in a PREFIXED object key — a random id here made the
    // snapshot unstable across runs.
    const releaseId = '00000000-0000-4000-8000-0000000000fb';
    const songId = crypto.randomUUID();
    await db.insert(schema.songs).values({
      id: songId,
      gameId: IDS.flopRelease,
      artistId,
      title: 'Doomed Track',
      quality: 20,
      genre: 'pop',
      isRecorded: true,
      isReleased: false,
      productionBudget: 19000,
    });
    await db.insert(schema.releases).values({
      id: releaseId,
      gameId: IDS.flopRelease,
      artistId,
      title: 'Doomed Single',
      type: 'single',
      status: 'planned',
      releaseWeek: 5, // == advanced week (seed currentWeek 4 -> advances to 5)
      marketingBudget: 1000,
      metadata: { marketingBudget: 1000, totalInvestment: 20000 },
    });
    await db.insert(schema.releaseSongs).values({
      releaseId,
      songId,
      trackNumber: 1,
      isSingle: true,
    });

    const snap = await runScenario(IDS.flopRelease, { id: IDS.flopRelease, currentWeek: 4 });
    expect(snap).toMatchSnapshot();
  });

  it('low-mood-recording-week: artist mood below 30 widens the song-quality variance band', async () => {
    // Mirrors recording-week with artist mood 20 (< the widening threshold), so
    // the mood→variance path (balance-integrity slice 4,
    // mood_variance_widening_max) is exercised under the fixed seed.
    await seedGame(IDS.lowMoodRecording, 2);
    const artistId = await seedArtist(IDS.lowMoodRecording, { name: 'Gloomy Recorder', mood: 20 });
    await db.insert(schema.projects).values({
      id: crypto.randomUUID(),
      gameId: IDS.lowMoodRecording,
      artistId,
      title: 'Gloomy Single',
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

    const snap = await runScenario(IDS.lowMoodRecording, { id: IDS.lowMoodRecording, currentWeek: 2 });
    expect(snap).toMatchSnapshot();
  });

  it('under-energy-tour-week: low artist energy bites tour sell-through (and city 1 drains energy)', async () => {
    // Energy 10 → energyFactor near the band floor; popularity 20 keeps the base
    // sell-through well under the 1.0 cap so the factor is NOT absorbed by the
    // cap (balance-integrity slice 5). Authored post-C87: city 1's reveal also
    // shows the flat -6 energy drain (10 → 4 in the artist digest).
    await seedGame(IDS.underEnergyTour, 3);
    const artistId = await seedArtist(IDS.underEnergyTour, {
      name: 'Exhausted Act',
      popularity: 20,
      energy: 10,
    });
    await db.insert(schema.projects).values({
      id: crypto.randomUUID(),
      gameId: IDS.underEnergyTour,
      artistId,
      title: 'Fumes Tour',
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

    const snap = await runScenario(IDS.underEnergyTour, { id: IDS.underEnergyTour, currentWeek: 3, venueAccess: 'clubs' });
    expect(snap).toMatchSnapshot();
  });

  it('saturated-tour-week: a 95-popularity star selling out a small room has the popularity gain saturation-clamped', async () => {
    // Popularity 95 + a small club room (300 cap) + heavy marketing → attendance
    // clears the 70% popularity_reactions threshold, but the slice-6 saturation
    // clamp (min(1, satMult) on the raw tier gain) reduces the gain for an
    // already-famous act. PINNED OUTCOME: at pop 95 satMult ≈ 0.22, so the
    // club-tier raw gain of 1 rounds to 0 — the snapshot shows NO popularity
    // entry and the artist digest stays at 95 (pre-clamp behavior would have
    // been +1 with a visible entry). City 1 also shows the C87 -6 drain.
    await seedGame(IDS.saturatedTour, 3);
    const artistId = await seedArtist(IDS.saturatedTour, {
      name: 'Megastar Act',
      popularity: 95,
    });
    await db.insert(schema.projects).values({
      id: crypto.randomUUID(),
      gameId: IDS.saturatedTour,
      artistId,
      title: 'Victory Lap Tour',
      type: 'Mini-Tour',
      stage: 'production',
      startWeek: 2, // advanced week 4 -> weeksElapsed=2 -> weeksInProduction=1 -> city 1
      totalCost: 30000,
      quality: 50,
      metadata: {
        cities: 3,
        venueAccess: 'clubs',
        venueCapacity: 300,
      },
    });

    const snap = await runScenario(IDS.saturatedTour, { id: IDS.saturatedTour, currentWeek: 3, venueAccess: 'clubs' });
    expect(snap).toMatchSnapshot();
  });

  // --- Mandatory Side Events ("Crisis on the Desk") additive fixtures ---------
  // These force a side-event hit (weekly_chance 1) so the mandatory deferral +
  // resolution paths are captured in the golden master. All OTHER fixtures keep
  // weekly_chance 0, so this does NOT touch their snapshots.

  it('side-event defer: a rolled crisis lands as a pending flag (deferred, no effects this week)', async () => {
    await seedGame(IDS.sideEventDefer, 3);
    await seedArtist(IDS.sideEventDefer, { name: 'Crisis Artist' });

    const snap = await runScenario(
      IDS.sideEventDefer,
      { id: IDS.sideEventDefer, currentWeek: 3 },
      [],
      [],
      { decorateGameData: forceCrisisGameData }
    );
    expect(snap).toMatchSnapshot();
  });

  it('side-event resolve: a pending crisis carried with the advance applies its effects and clears', async () => {
    await seedGame(IDS.sideEventResolve, 3, {
      // Pending crisis already on the spine from the prior week (arrival week 4
      // after this advance's increment; the resolution matches by eventId).
      flags: { pending_side_event: { eventId: CRISIS_EVENT.id, week: 3, prompt: CRISIS_EVENT.prompt, category: CRISIS_EVENT.category, choices: CRISIS_EVENT.choices } },
    });
    await seedArtist(IDS.sideEventResolve, { name: 'Resolver Artist' });

    const snap = await runScenario(
      IDS.sideEventResolve,
      {
        id: IDS.sideEventResolve,
        currentWeek: 3,
        flags: { pending_side_event: { eventId: CRISIS_EVENT.id, week: 3, prompt: CRISIS_EVENT.prompt, category: CRISIS_EVENT.category, choices: CRISIS_EVENT.choices } },
      },
      [],
      [],
      {
        // weekly_chance 0 for this one so the resolution is isolated from a new
        // roll; only the resolution path runs.
        decorateGameData: (gd) => ({
          ...gd,
          getMandatorySideEventsConfigSync: () => ({ enabled: true }),
          getEventConfigSync: () => ({ weekly_chance: 0, cooldown_weeks: 2, max_per_year: 12 }),
          getAllEvents: async () => [CRISIS_EVENT],
          getEventById: async (id: string) => (id === CRISIS_EVENT.id ? CRISIS_EVENT : undefined),
        }),
        sideEventChoice: { eventId: CRISIS_EVENT.id, choiceId: 'accept' },
      }
    );
    expect(snap).toMatchSnapshot();
  });

  // -------------------------------------------------------------------------
  // Executive Delegation arc (Tier 1, §10.2) — autonomous-resolution fixtures.
  // These seed exec rows + no (or one) player action so the never-lapse path
  // fires. Every OTHER fixture above has no exec rows, so it is a no-op there
  // (byte-identical) — proven by the double-run.
  // -------------------------------------------------------------------------

  it('autonomous-resolution-week: four execs at four loyalty bands each resolve the band-correct choice', async () => {
    await seedGame(IDS.autonomousResolution, 4);
    await seedArtist(IDS.autonomousResolution, { name: 'Roster Act' });
    // Bands: loyal (75) → safe; disloyal (20/25) → self-serving; committed (50) → own call.
    await seedExecutive(IDS.autonomousResolution, 'head_ar', { loyalty: 75, mood: 50 });
    await seedExecutive(IDS.autonomousResolution, 'cmo', { loyalty: 20, mood: 50 });
    await seedExecutive(IDS.autonomousResolution, 'cco', { loyalty: 50, mood: 50 });
    await seedExecutive(IDS.autonomousResolution, 'head_distribution', { loyalty: 25, mood: 50 });

    const snap = await runScenario(
      IDS.autonomousResolution,
      { id: IDS.autonomousResolution, currentWeek: 4 },
      [],
      [],
      { decorateGameData: (gd) => withAutonomousPool(gd, AUTONOMOUS_MEETING_POOL) },
    );

    // Band-correct picks are visible via each autonomous meeting's choiceLabel.
    const autoPicks = (snap.summary as any).changes
      .filter((c: any) => c.type === 'meeting' && c.autonomous)
      .reduce((acc: Record<string, string>, c: any) => ({ ...acc, [c.roleId]: c.choiceLabel }), {});
    expect(autoPicks).toEqual({
      head_ar: 'Play it safe',        // loyal → AUTO-safe
      cmo: 'Big blitz',               // disloyal → flashy overspend (Sam)
      cco: 'Add a revision',          // committed → own quality call (Dante's quality is also the pro call)
      head_distribution: 'Guaranteed deal', // disloyal → conservative guaranteed value (Pat)
    });
    expect(snap).toMatchSnapshot();
  });

  it('autonomous-mood-risk-week: same loyal band, mood decides the risk tie-break', async () => {
    await seedGame(IDS.autonomousMoodRisk, 4);
    await seedArtist(IDS.autonomousMoodRisk, { name: 'Risk Act' });
    // Both loyal (75) → the safety band ties (cheap vs pricey); mood breaks it.
    await seedExecutive(IDS.autonomousMoodRisk, 'head_ar', { loyalty: 75, mood: 95 }); // inspired → aggressive
    await seedExecutive(IDS.autonomousMoodRisk, 'cmo', { loyalty: 75, mood: 20 });     // disgruntled → defensive

    const snap = await runScenario(
      IDS.autonomousMoodRisk,
      { id: IDS.autonomousMoodRisk, currentWeek: 4 },
      [],
      [],
      { decorateGameData: (gd) => withAutonomousPool(gd, MOOD_RISK_POOL) },
    );

    const picks = (snap.summary as any).changes
      .filter((c: any) => c.type === 'meeting' && c.autonomous)
      .reduce((acc: Record<string, string>, c: any) => ({ ...acc, [c.roleId]: c.choiceLabel }), {});
    expect(picks).toEqual({
      head_ar: 'Pricey', // inspired → swings big
      cmo: 'Cheap',      // disgruntled → plays defensive
    });
    expect(snap).toMatchSnapshot();
  });

  it('auto-vs-neglect divergence: neglect grants no loyalty and flags autonomous', async () => {
    await seedGame(IDS.neglect, 4);
    await seedArtist(IDS.neglect, { name: 'Neglect Act' });
    await seedExecutive(IDS.neglect, 'head_ar', { loyalty: 75, mood: 50 }); // loyal → ar_safe

    const snap = await runScenario(
      IDS.neglect,
      { id: IDS.neglect, currentWeek: 4 },
      [],
      [],
      { decorateGameData: (gd) => withAutonomousPool(gd, AUTONOMOUS_MEETING_POOL) },
    );

    const exec: any = (snap.digest as any).executives[0];
    expect(exec.loyalty).toBe(75); // neglect_loyalty_gain = 0 → unchanged
    expect(exec.mood).toBe(55);    // mood_default_delta +5 (acted, engaged), decay suppressed
    expect(exec.lastActionWeek).toBe(5);
    const autoEntry = (snap.summary as any).changes.find((c: any) => c.type === 'meeting' && c.autonomous);
    expect(autoEntry.loyaltyBoost).toBe(0);
    expect(snap).toMatchSnapshot();
  });

  it('auto-vs-neglect divergence: AUTO-endorse (player picks the safe choice) grants loyalty and is NOT autonomous', async () => {
    await seedGame(IDS.autoEndorse, 4);
    await seedArtist(IDS.autoEndorse, { name: 'Endorse Act' });
    const execId = await seedExecutive(IDS.autoEndorse, 'head_ar', { loyalty: 75, mood: 50 });

    // The player (or AUTO) spends a slot on the SAME meeting/choice the neglect
    // game auto-resolved — same effects, but through the manual path.
    const actions = [
      {
        actionType: 'role_meeting',
        targetId: 'role-head_ar',
        metadata: { roleId: 'head_ar', actionId: 'auto_ar', choiceId: 'ar_safe', executiveId: execId },
      },
    ];

    const snap = await runScenario(
      IDS.autoEndorse,
      { id: IDS.autoEndorse, currentWeek: 4 },
      actions,
      [],
      { decorateGameData: (gd) => withAutonomousPool(gd, AUTONOMOUS_MEETING_POOL) },
    );

    const exec: any = (snap.digest as any).executives[0];
    expect(exec.loyalty).toBe(80); // loyalty_on_use +5 (endorsed)
    expect(exec.mood).toBe(55);    // mood_default_delta +5
    expect(exec.lastActionWeek).toBe(5);
    const meetingEntry = (snap.summary as any).changes.find((c: any) => c.type === 'meeting' && c.roleId === 'head_ar');
    expect(meetingEntry.autonomous).toBeUndefined(); // manual pick → not autonomous
    expect(meetingEntry.loyaltyBoost).toBe(5);
    expect(snap).toMatchSnapshot();
  });

  it('ceo-lane-lapses: an exec with role "ceo" is never autonomously resolved (guard), head_ar is', async () => {
    await seedGame(IDS.ceoLapse, 4);
    await seedArtist(IDS.ceoLapse, { name: 'CEO Lapse Act' });
    // A defensive guard test: even a (never-in-production) ceo exec row is skipped.
    await seedExecutive(IDS.ceoLapse, 'ceo', { loyalty: 20, mood: 50 });
    await seedExecutive(IDS.ceoLapse, 'head_ar', { loyalty: 50, mood: 50 });

    const snap = await runScenario(
      IDS.ceoLapse,
      { id: IDS.ceoLapse, currentWeek: 4 },
      [],
      [],
      { decorateGameData: (gd) => withAutonomousPool(gd, AUTONOMOUS_MEETING_POOL) },
    );

    const autoRoles = (snap.summary as any).changes
      .filter((c: any) => c.type === 'meeting' && c.autonomous)
      .map((c: any) => c.roleId);
    expect(autoRoles).toEqual(['head_ar']); // ceo NEVER auto-resolves
    expect(snap).toMatchSnapshot();
  });

  // -------------------------------------------------------------------------
  // Escalation arc (Tier 2, §10.2/§10.4) — an urgent (reactive) meeting
  // self-resolved by a below-ceiling-loyalty exec escalates into a mandatory
  // crisis for NEXT week. ESCALATION_REACTIVE_POOL + a signedWeek match on the
  // seeded artist are what make the meeting URGENT (reactiveHappening non-null);
  // every OTHER fixture's pool has no reactive_trigger, so escalation cannot
  // fire there — proven by the double-run leaving them byte-identical.
  // -------------------------------------------------------------------------

  it('escalation-week: an urgent meeting self-resolved by a loyalty<40 exec pins pending_side_event', async () => {
    await seedGame(IDS.escalationWeek, 4);
    // signedWeek === 3 (offeredWeek 4 minus the player-action window's 1-week lag) makes 'recent_signing' fire.
    await seedArtist(IDS.escalationWeek, { name: 'Escalation Act', signedWeek: 3 });
    await seedExecutive(IDS.escalationWeek, 'head_ar', { loyalty: 20, mood: 50 }); // disloyal, < ceiling 40

    const snap = await runScenario(
      IDS.escalationWeek,
      { id: IDS.escalationWeek, currentWeek: 4 },
      [],
      [],
      { decorateGameData: (gd) => withEscalationEvents(withAutonomousPool(gd, ESCALATION_REACTIVE_POOL)) },
    );

    expect(snap.stateDelta.flags?.after?.pending_side_event).toEqual({
      eventId: ESCALATION_TEST_EVENT.id,
      week: 5, // arrival week (currentWeek incremented 4 -> 5) — same deferral as a rolled crisis
      prompt: ESCALATION_TEST_EVENT.prompt,
      category: ESCALATION_TEST_EVENT.category,
      choices: withNormalizedChoiceIds(ESCALATION_TEST_EVENT.choices),
    });
    expect(snap).toMatchSnapshot();
  });

  it('escalation: a LOYAL exec (loyalty >= ceiling) self-resolving the same urgent meeting does NOT escalate', async () => {
    await seedGame(IDS.escalationLoyalNoFire, 4);
    await seedArtist(IDS.escalationLoyalNoFire, { name: 'Loyal Act', signedWeek: 3 });
    await seedExecutive(IDS.escalationLoyalNoFire, 'head_ar', { loyalty: 75, mood: 50 }); // loyal, >= ceiling 40

    const snap = await runScenario(
      IDS.escalationLoyalNoFire,
      { id: IDS.escalationLoyalNoFire, currentWeek: 4 },
      [],
      [],
      { decorateGameData: (gd) => withEscalationEvents(withAutonomousPool(gd, ESCALATION_REACTIVE_POOL)) },
    );

    expect(snap.stateDelta.flags?.after?.pending_side_event).toBeUndefined();
  });

  it('escalation: a NON-URGENT meeting (no matching happening) self-resolved by a disloyal exec does NOT escalate', async () => {
    await seedGame(IDS.escalationNonUrgentNoFire, 4);
    // NO signedWeek match this time — the meeting falls back to the regular
    // (non-reactive) pool, so reactiveHappening is null even though it's the
    // same pool/meeting shape.
    await seedArtist(IDS.escalationNonUrgentNoFire, { name: 'Quiet Act' });
    await seedExecutive(IDS.escalationNonUrgentNoFire, 'head_ar', { loyalty: 20, mood: 50 }); // disloyal

    const snap = await runScenario(
      IDS.escalationNonUrgentNoFire,
      { id: IDS.escalationNonUrgentNoFire, currentWeek: 4 },
      [],
      [],
      { decorateGameData: (gd) => withEscalationEvents(withAutonomousPool(gd, ESCALATION_REACTIVE_POOL)) },
    );

    expect(snap.stateDelta.flags?.after?.pending_side_event).toBeUndefined();
  });

  it('escalation: discarded when a crisis is already pending (one-crisis-at-a-time, first-set wins)', async () => {
    const alreadyPending = {
      eventId: 'gm_prior_crisis',
      week: 3,
      prompt: 'A prior, still-unresolved crisis.',
      category: 'business_opportunities',
      choices: [{ id: 'x', label: 'x', effects_immediate: {}, effects_delayed: {} }],
    };
    await seedGame(IDS.escalationAlreadyPending, 4, { flags: { pending_side_event: alreadyPending } });
    await seedArtist(IDS.escalationAlreadyPending, { name: 'Pending Act', signedWeek: 3 });
    await seedExecutive(IDS.escalationAlreadyPending, 'head_ar', { loyalty: 20, mood: 50 });

    const snap = await runScenario(
      IDS.escalationAlreadyPending,
      { id: IDS.escalationAlreadyPending, currentWeek: 4, flags: { pending_side_event: alreadyPending } },
      [],
      [],
      {
        decorateGameData: (gd) => withEscalationEvents(withAutonomousPool(gd, ESCALATION_REACTIVE_POOL)),
        // No sideEventChoice supplied → processPendingSideEventResolution no-ops
        // (defensive: production gates the advance on resolving it first), so the
        // prior crisis is still pending when applyEscalation runs.
      },
    );

    // The PRIOR crisis survives untouched — the escalation was discarded, not
    // merged or overwritten.
    const normalizedAlreadyPending = { ...alreadyPending, choices: withNormalizedChoiceIds(alreadyPending.choices) };
    expect(snap.stateDelta.flags?.after?.pending_side_event ?? normalizedAlreadyPending).toEqual(
      normalizedAlreadyPending,
    );
  });

  it('escalation: the enabled:false kill-switch suppresses escalation even when otherwise qualifying', async () => {
    await seedGame(IDS.escalationKillSwitch, 4);
    await seedArtist(IDS.escalationKillSwitch, { name: 'Killswitch Act', signedWeek: 3 });
    await seedExecutive(IDS.escalationKillSwitch, 'head_ar', { loyalty: 20, mood: 50 });

    const snap = await runScenario(
      IDS.escalationKillSwitch,
      { id: IDS.escalationKillSwitch, currentWeek: 4 },
      [],
      [],
      {
        decorateGameData: (gd) => {
          const withPool = withAutonomousPool(gd, ESCALATION_REACTIVE_POOL);
          const withEvents = withEscalationEvents(withPool);
          return {
            ...withEvents,
            getExecDelegationConfigSync: () => ({
              ...withPool.getExecDelegationConfigSync(),
              escalation: { loyalty_ceiling: 40, enabled: false },
            }),
          };
        },
      },
    );

    expect(snap.stateDelta.flags?.after?.pending_side_event).toBeUndefined();
  });
});
