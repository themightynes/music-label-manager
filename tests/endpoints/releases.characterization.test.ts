// @vitest-environment node
/**
 * Release-planning characterization test (Phase 1, PR-17).
 *
 * The two fat mutation routes on the releases router (POST .../releases/plan and
 * DELETE .../releases/:releaseId) plus the plain create + list reads had no
 * HTTP-layer coverage. This test pins the observable behavior of the CURRENT
 * (pre-extraction) handlers BEFORE they are extracted into
 * releasePlanningService and hardened with ownership/budget validation, so the
 * extraction can be proven behavior-preserving (green before AND after).
 *
 * It drives the real releases router over supertest against the real test
 * Postgres (Docker, localhost:5433). Clerk auth is mocked to a fixed test user;
 * server/db is mocked to a non-SSL pool pointed at the test DB (the production
 * pool forces SSL, which the local test container rejects).
 *
 * The blocks tagged "(post-hardening)" below only pass AFTER Commit 2 lands
 * (requireGameOwner + budget validation + .strict() whitelist). They are kept in
 * this same file per the PR-17 brief; run them against the hardened code.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Must be set before any module that reads DATABASE_URL at import time.
const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Fixed clerk id / resolved userId for the mocked authenticated user (owner).
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
// A second user, used for cross-tenant assertions.
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';

// --- Mock server/db with a non-SSL pool at the test DB. storage.ts imports
//     `db` from ./db, so this single mock reroutes storage + handlers + service.
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

// --- Mock server/auth so requireClerkUser injects the fixed test userId and
//     everything else is a passthrough. The injected userId is mutable so
//     individual tests can impersonate a second user for cross-tenant checks.
let currentUserId = TEST_USER_ID;
vi.mock('../../server/auth', () => ({
  requireClerkUser: (req: any, _res: any, next: any) => {
    req.userId = currentUserId;
    req.clerkUserId = 'clerk_test_user';
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  handleClerkWebhook: (_req: any, res: any) => res.status(200).end(),
}));

import express, { type Express } from 'express';
import request from 'supertest';
import { db } from '../../server/db';
import { serverGameData } from '../../server/data/gameData';
import {
  gameStates,
  users,
  artists,
  songs,
  releases,
  releaseSongs,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import releasesRouter from '../../server/routes/releases';

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(releasesRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

/** Seed a game owned by ownerId with the given money/creativeCapital/currentWeek,
 *  one artist, and N recorded-unreleased-unreserved songs. Returns ids. */
async function seedGameWithSongs(opts: {
  ownerId: string;
  money?: number;
  creativeCapital?: number;
  currentWeek?: number;
  songCount?: number;
}) {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: opts.ownerId,
    currentWeek: opts.currentWeek ?? 1,
    money: opts.money ?? 100000,
    reputation: 0,
    creativeCapital: opts.creativeCapital ?? 5,
  });

  const artistId = crypto.randomUUID();
  await db.insert(artists).values({
    id: artistId,
    gameId,
    name: 'Test Artist',
    archetype: 'Workhorse',
    genre: 'pop',
    mood: 50,
    energy: 50,
  });

  const songIds: string[] = [];
  for (let i = 0; i < (opts.songCount ?? 2); i++) {
    const songId = crypto.randomUUID();
    await db.insert(songs).values({
      id: songId,
      gameId,
      artistId,
      title: `Song ${i + 1}`,
      quality: 75,
      genre: 'pop',
      isRecorded: true,
      isReleased: false,
    });
    songIds.push(songId);
  }

  return { gameId, artistId, songIds };
}

beforeEach(async () => {
  currentUserId = TEST_USER_ID;
  await db.execute(
    (await import('drizzle-orm')).sql`TRUNCATE TABLE users, game_states RESTART IDENTITY CASCADE`
  );
  await db.insert(users).values([
    { id: TEST_USER_ID, clerkId: 'clerk_test_user', email: 'test@example.com', username: 'tester' },
    { id: OTHER_USER_ID, clerkId: 'clerk_other_user', email: 'other@example.com', username: 'other' },
  ]);
});

describe('POST /api/game/:gameId/releases/plan (characterization)', () => {
  it('happy path: 201, deducts money + creative capital, creates release + release_songs, reserves songs', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 100000,
      creativeCapital: 5,
      currentWeek: 1,
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'My EP',
        type: 'ep',
        songIds,
        scheduledReleaseWeek: 5,
        marketingBudget: { radio: 3000, digital: 2000 },
        metadata: { estimatedStreams: 1000, estimatedRevenue: 5000, projectedROI: 1.5 },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.release.title).toBe('My EP');
    expect(res.body.release.type).toBe('ep');
    expect(res.body.release.status).toBe('planned');
    expect(res.body.release.songIds).toEqual(songIds);
    expect(res.body.release.estimatedMetrics).toEqual({
      streams: 1000,
      revenue: 5000,
      roi: 1.5,
      chartPotential: 50,
    });

    // Money deducted by total marketing budget (5000), creative capital by 1.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(95000);
    expect(gs.creativeCapital).toBe(4);
    expect(res.body.updatedGameState.money).toBe(95000);

    // Release row exists with total marketing budget and stored breakdown.
    const [rel] = await db.select().from(releases).where(eq(releases.gameId, gameId));
    expect(rel.marketingBudget).toBe(5000);
    expect((rel.metadata as any).marketingBudgetBreakdown).toEqual({ radio: 3000, digital: 2000 });

    // Junction rows created; songs reserved (releaseId set).
    const junction = await db.select().from(releaseSongs).where(eq(releaseSongs.releaseId, rel.id));
    expect(junction).toHaveLength(songIds.length);
    const reserved = await db.select().from(songs).where(eq(songs.releaseId, rel.id));
    expect(reserved).toHaveLength(songIds.length);
  });

  it('402 when marketing budget exceeds available money', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 1000,
      creativeCapital: 5,
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'Too Expensive',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 5,
        marketingBudget: { radio: 5000 },
      });

    expect(res.status).toBe(402);
    expect(res.body.error).toBe('INSUFFICIENT_FUNDS');
  });

  it('402 when creative capital is below 1', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 100000,
      creativeCapital: 0,
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'No Capital',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 5,
        marketingBudget: { radio: 1000 },
      });

    expect(res.status).toBe(402);
    expect(res.body.error).toBe('INSUFFICIENT_CREATIVE_CAPITAL');
  });

  it('409 when a song is already reserved for another release', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 100000,
      creativeCapital: 5,
    });

    // Reserve the first song against a pre-existing release.
    const existingReleaseId = crypto.randomUUID();
    await db.insert(releases).values({
      id: existingReleaseId,
      gameId,
      artistId,
      title: 'Existing',
      type: 'single',
      status: 'planned',
    });
    await db.update(songs).set({ releaseId: existingReleaseId }).where(eq(songs.id, songIds[0]));

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'Conflict',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 5,
        marketingBudget: { radio: 1000 },
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SONG_ALREADY_SCHEDULED');
  });

  it('400 when scheduledReleaseWeek is not in the future', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 100000,
      creativeCapital: 5,
      currentWeek: 5,
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'Past Week',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 5, // equal to currentWeek → invalid
        marketingBudget: { radio: 1000 },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_RELEASE_WEEK');
  });
});

describe('POST .../releases/plan — attach-at-plan hype (buzz-v2 slice 2)', () => {
  it('drains the planning artist pool + the whole label pool onto release.metadata.attachedHype and reports it', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 100000,
      creativeCapital: 5,
      currentWeek: 1,
    });

    // Bank a label pool (+2) and this artist's pool (+3), plus a DIFFERENT
    // artist's pool (+9) that must NOT be drained.
    await db.update(gameStates).set({
      flags: {
        pendingAwarenessBoost: 2,
        pendingAwarenessBoostWeek: 1,
        hypeArtistPools: {
          [artistId]: { amount: 3, week: 1 },
          'other-artist-id': { amount: 9, week: 1 },
        },
      },
    }).where(eq(gameStates.id, gameId));

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'Hyped Single',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 5,
        marketingBudget: { radio: 1000 },
      });

    expect(res.status).toBe(201);
    // 2 (label) + 3 (this artist) = 5 units; buzzPoints = 5 × 8 = 40.
    expect(res.body.hypeApplied).toEqual({ units: 5, buzzPoints: 40 });

    // Stored on the release metadata.
    const [rel] = await db.select().from(releases).where(eq(releases.gameId, gameId));
    expect((rel.metadata as any).attachedHype).toBe(5);

    // Flags: label pool drained, this artist's pool removed, OTHER artist intact.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    const flags = gs.flags as any;
    expect(flags.pendingAwarenessBoost).toBe(0);
    expect(flags.pendingAwarenessBoostWeek).toBeUndefined();
    expect(flags.hypeArtistPools[artistId]).toBeUndefined();
    expect(flags.hypeArtistPools['other-artist-id']).toEqual({ amount: 9, week: 1 });
  });

  it('attaches 0 (and reports no hypeApplied) when no pools are banked', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 100000,
      creativeCapital: 5,
      currentWeek: 1,
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'No Hype',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 5,
        marketingBudget: { radio: 1000 },
      });

    expect(res.status).toBe(201);
    expect(res.body.hypeApplied).toBeNull();
    const [rel] = await db.select().from(releases).where(eq(releases.gameId, gameId));
    expect((rel.metadata as any).attachedHype).toBe(0);

    // Follow-up guard: a never-banked game's flags stay byte-stable — the drain
    // must not plant a stray `pendingAwarenessBoost: 0` key or write flags at all.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.flags).toEqual({});
  });
});

describe('POST .../releases/plan — pre-release campaign (buzz-v2 slice 3)', () => {
  it('stores metadata.preCampaign when preCampaignPct > 0 (share, scaled channels, pinned weeklySpend)', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 100000,
      creativeCapital: 5,
      currentWeek: 1,
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'Pre-Hyped',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 7, // 6 lead-up weeks from currentWeek 1
        marketingBudget: { pr: 10000, radio: 2000 },
        preCampaignPct: 30,
      });

    expect(res.status).toBe(201);
    const [rel] = await db.select().from(releases).where(eq(releases.gameId, gameId));
    const pc = (rel.metadata as any).preCampaign;
    expect(pc.pct).toBe(30);
    // totalBudget = round(30% of 12000) = 3600.
    expect(pc.totalBudget).toBe(3600);
    // budgetPerChannel = each channel × 0.30.
    expect(pc.budgetPerChannel).toEqual({ pr: 3000, radio: 600 });
    // weeklySpend = 3600 / 6 lead-up weeks = 600.
    expect(pc.weeklySpend).toBe(600);
    expect(pc.spentToDate).toBe(0);
    // Launch-phase breakdown stored UNSCALED (auditable; scaled at read time).
    expect((rel.metadata as any).marketingBudgetBreakdown).toEqual({ pr: 10000, radio: 2000 });
  });

  it('stores NO preCampaign key when preCampaignPct is 0 / omitted (golden-master containment)', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 100000,
      creativeCapital: 5,
      currentWeek: 1,
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'No Pre',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 7,
        marketingBudget: { pr: 10000 },
        // preCampaignPct omitted
      });

    expect(res.status).toBe(201);
    const [rel] = await db.select().from(releases).where(eq(releases.gameId, gameId));
    expect((rel.metadata as any)).not.toHaveProperty('preCampaign');
  });

  it('400 INVALID_PRE_CAMPAIGN_PCT for a non-10-step or over-cap pct', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID, money: 100000, creativeCapital: 5, currentWeek: 1,
    });
    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId, title: 'Bad Pct', type: 'single', songIds: [songIds[0]],
        scheduledReleaseWeek: 7, marketingBudget: { pr: 10000 }, preCampaignPct: 60,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PRE_CAMPAIGN_PCT');
  });

  it('400 PRE_CAMPAIGN_NO_LEADUP when the release is scheduled for next week', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID, money: 100000, creativeCapital: 5, currentWeek: 4,
    });
    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId, title: 'Next Week', type: 'single', songIds: [songIds[0]],
        scheduledReleaseWeek: 5, // only 1 week out — no lead-up window
        marketingBudget: { pr: 10000 }, preCampaignPct: 20,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PRE_CAMPAIGN_NO_LEADUP');
  });
});

describe('DELETE /api/game/:gameId/releases/:releaseId (characterization)', () => {
  async function seedPlannedRelease(ownerId: string, money = 50000, refund = 5000) {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId,
      money,
      creativeCapital: 5,
    });
    const releaseId = crypto.randomUUID();
    await db.insert(releases).values({
      id: releaseId,
      gameId,
      artistId,
      title: 'To Delete',
      type: 'single',
      status: 'planned',
      marketingBudget: refund,
    });
    await db.update(songs).set({ releaseId }).where(eq(songs.id, songIds[0]));
    return { gameId, artistId, songIds, releaseId };
  }

  it('happy path: frees songs, refunds marketing budget, deletes release', async () => {
    const { gameId, releaseId, songIds } = await seedPlannedRelease(TEST_USER_ID, 50000, 5000);

    const res = await request(app).delete(`/api/game/${gameId}/releases/${releaseId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Deleted planned release "To Delete"');
    expect(res.body.refundedAmount).toBe(5000);
    expect(res.body.freedSongs).toEqual([
      expect.objectContaining({ songId: songIds[0] }),
    ]);

    // Release gone, song freed, money refunded.
    const remaining = await db.select().from(releases).where(eq(releases.id, releaseId));
    expect(remaining).toHaveLength(0);
    const [song] = await db.select().from(songs).where(eq(songs.id, songIds[0]));
    expect(song.releaseId).toBeNull();
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(55000);
  });

  it('404 when the release does not exist', async () => {
    const { gameId } = await seedGameWithSongs({ ownerId: TEST_USER_ID });
    const res = await request(app)
      .delete(`/api/game/${gameId}/releases/${crypto.randomUUID()}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('RELEASE_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Buzz-v2 slice 4 (C43) — fork-E cancel semantics on the existing DELETE route.
// Refund now = STORED launch marketingBudget + UNSPENT pre-campaign share
// (totalBudget − spentToDate); the release's still-unreleased songs have their
// awareness/peak_awareness ZEROED (pre-buzz dies); attached hype dies with the
// deleted row and re-credits nothing.
// ---------------------------------------------------------------------------
describe('DELETE .../releases/:releaseId — fork-E cancel (buzz-v2 slice 4)', () => {
  /** Seed a planned release with a partially-spent pre-campaign, attached hype,
   *  and songs already carrying pre-built awareness/peak. */
  async function seedPreCampaignRelease(opts: {
    money?: number;
    marketingBudget?: number;
    preCampaignTotal?: number;
    spentToDate?: number;
    attachedHype?: number;
    songAwareness?: number;
    songPeak?: number;
  }) {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: opts.money ?? 50000,
      creativeCapital: 5,
      songCount: 2,
    });
    const releaseId = crypto.randomUUID();
    await db.insert(releases).values({
      id: releaseId,
      gameId,
      artistId,
      title: 'Pre-Hyped To Cancel',
      type: 'ep',
      status: 'planned',
      marketingBudget: opts.marketingBudget ?? 4000,
      metadata: {
        attachedHype: opts.attachedHype ?? 6,
        preCampaign: {
          pct: 30,
          totalBudget: opts.preCampaignTotal ?? 3600,
          budgetPerChannel: { pr: 3000, radio: 600 },
          weeklySpend: 600,
          spentToDate: opts.spentToDate ?? 1200,
        },
      },
    });
    // Reserve both songs and give them pre-built awareness/peak (all songs in
    // this freshly-seeded game belong to this release).
    await db.update(songs)
      .set({
        releaseId,
        awareness: opts.songAwareness ?? 18,
        peak_awareness: opts.songPeak ?? 22,
      })
      .where(eq(songs.gameId, gameId));
    return { gameId, artistId, songIds, releaseId };
  }

  it('refunds launch budget + UNSPENT pre-campaign, zeroes song awareness/peak, unlinks songs', async () => {
    const { gameId, releaseId, songIds } = await seedPreCampaignRelease({
      money: 50000,
      marketingBudget: 4000,
      preCampaignTotal: 3600,
      spentToDate: 1200, // unspent = 2400
      attachedHype: 6,
      songAwareness: 18,
      songPeak: 22,
    });

    const res = await request(app).delete(`/api/game/${gameId}/releases/${releaseId}`);

    expect(res.status).toBe(200);
    // Refund = 4000 launch + (3600 - 1200) unspent pre-campaign = 6400.
    expect(res.body.refundedAmount).toBe(6400);

    // Money credited by exactly the combined refund.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(50000 + 6400);

    // Release gone.
    const remaining = await db.select().from(releases).where(eq(releases.id, releaseId));
    expect(remaining).toHaveLength(0);

    // Songs unlinked (plannable again) AND pre-buzz zeroed (fork E).
    for (const songId of songIds) {
      const [song] = await db.select().from(songs).where(eq(songs.id, songId));
      expect(song.releaseId).toBeNull();
      expect(song.awareness).toBe(0);
      expect(song.peak_awareness).toBe(0);
    }
  });

  it('a fully-spent pre-campaign refunds ONLY the launch budget (unspent share is 0)', async () => {
    const { gameId, releaseId } = await seedPreCampaignRelease({
      money: 10000,
      marketingBudget: 4000,
      preCampaignTotal: 3600,
      spentToDate: 3600, // fully spent → unspent = 0
    });

    const res = await request(app).delete(`/api/game/${gameId}/releases/${releaseId}`);
    expect(res.status).toBe(200);
    expect(res.body.refundedAmount).toBe(4000);
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(10000 + 4000);
  });

  it('cancelling a hyped release does NOT restore any flags pools (attached hype dies)', async () => {
    const { gameId, releaseId } = await seedPreCampaignRelease({ attachedHype: 9 });
    // Pre-existing flags must be untouched by the cancel (no re-credit).
    await db.update(gameStates).set({ flags: { pendingAwarenessBoost: 0 } }).where(eq(gameStates.id, gameId));

    const res = await request(app).delete(`/api/game/${gameId}/releases/${releaseId}`);
    expect(res.status).toBe(200);

    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    const flags = (gs.flags as any) || {};
    // No pool was created or credited from the dead attached hype.
    expect(flags.pendingAwarenessBoost).toBe(0);
    expect(flags.hypeArtistPools).toBeUndefined();
  });

  it("cancelling one release leaves ANOTHER release's pre-campaign untouched", async () => {
    const { gameId, artistId } = await seedGameWithSongs({
      ownerId: TEST_USER_ID, money: 50000, creativeCapital: 5, songCount: 4,
    });
    const allSongs = await db.select().from(songs).where(eq(songs.gameId, gameId));

    const relA = crypto.randomUUID();
    const relB = crypto.randomUUID();
    for (const [id, spent] of [[relA, 1000], [relB, 500]] as const) {
      await db.insert(releases).values({
        id, gameId, artistId, title: `Rel ${id.slice(0, 4)}`, type: 'single',
        status: 'planned', marketingBudget: 2000,
        metadata: { attachedHype: 0, preCampaign: { pct: 20, totalBudget: 2000, budgetPerChannel: { pr: 2000 }, weeklySpend: 500, spentToDate: spent } },
      });
    }
    await db.update(songs).set({ releaseId: relA, awareness: 10, peak_awareness: 10 }).where(eq(songs.id, allSongs[0].id));
    await db.update(songs).set({ releaseId: relB, awareness: 15, peak_awareness: 15 }).where(eq(songs.id, allSongs[1].id));

    await request(app).delete(`/api/game/${gameId}/releases/${relA}`);

    // Release B and its pre-campaign / song awareness are intact.
    const [rb] = await db.select().from(releases).where(eq(releases.id, relB));
    expect(rb).toBeTruthy();
    expect((rb.metadata as any).preCampaign.spentToDate).toBe(500);
    const [songB] = await db.select().from(songs).where(eq(songs.id, allSongs[1].id));
    expect(songB.releaseId).toBe(relB);
    expect(songB.awareness).toBe(15);
  });

  it('a legacy planned release with NO pre-campaign refunds exactly marketingBudget (byte-identical old rule)', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID, money: 20000, creativeCapital: 5,
    });
    const releaseId = crypto.randomUUID();
    await db.insert(releases).values({
      id: releaseId, gameId, artistId, title: 'Legacy', type: 'single',
      status: 'planned', marketingBudget: 3000, metadata: {},
    });
    await db.update(songs).set({ releaseId, awareness: 5, peak_awareness: 5 }).where(eq(songs.id, songIds[0]));

    const res = await request(app).delete(`/api/game/${gameId}/releases/${releaseId}`);
    expect(res.status).toBe(200);
    expect(res.body.refundedAmount).toBe(3000);
    // Song still gets its awareness zeroed on unlink (fork E applies to any planned cancel).
    const [song] = await db.select().from(songs).where(eq(songs.id, songIds[0]));
    expect(song.releaseId).toBeNull();
    expect(song.awareness).toBe(0);
  });
});

describe('POST /api/game/:gameId/releases (plain create, characterization)', () => {
  it('happy path: creates a release and links songs', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({ ownerId: TEST_USER_ID });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases`)
      .send({
        artistId,
        title: 'Plain Release',
        type: 'single',
        songIds: [songIds[0]],
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Plain Release');
    expect(res.body.gameId).toBe(gameId);

    const junction = await db.select().from(releaseSongs).where(eq(releaseSongs.releaseId, res.body.id));
    expect(junction).toHaveLength(1);
  });
});

describe('GET /api/game/:gameId/releases (characterization)', () => {
  it('happy path: returns releases for the game', async () => {
    const { gameId, artistId } = await seedGameWithSongs({ ownerId: TEST_USER_ID });
    await db.insert(releases).values({
      gameId,
      artistId,
      title: 'Listed Release',
      type: 'album',
      status: 'planned',
    });

    const res = await request(app).get(`/api/game/${gameId}/releases`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((r: any) => r.title === 'Listed Release')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Post-hardening behavior (Commit 2). These assert the NEW ownership + budget
// validation + whitelist. They only pass against the hardened code.
// ---------------------------------------------------------------------------
describe('ownership + validation hardening (post-hardening)', () => {
  it('plan: 404 GAME_NOT_FOUND when the game belongs to another user', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID; // impersonate non-owner

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'Cross Tenant',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 5,
        marketingBudget: { radio: 1000 },
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');

    // No money was touched on the victim's game.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.creativeCapital).toBe(5);
  });

  it('delete: 404 GAME_NOT_FOUND when the game belongs to another user', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({ ownerId: OTHER_USER_ID });
    const releaseId = crypto.randomUUID();
    await db.insert(releases).values({
      id: releaseId, gameId, artistId, title: 'Victim', type: 'single', status: 'planned', marketingBudget: 5000,
    });
    await db.update(songs).set({ releaseId }).where(eq(songs.id, songIds[0]));
    currentUserId = TEST_USER_ID;

    const res = await request(app).delete(`/api/game/${gameId}/releases/${releaseId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');

    // Release still present.
    const remaining = await db.select().from(releases).where(eq(releases.id, releaseId));
    expect(remaining).toHaveLength(1);
  });

  it('create: 404 GAME_NOT_FOUND when the game belongs to another user', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;

    const res = await request(app)
      .post(`/api/game/${gameId}/releases`)
      .send({ artistId, title: 'X', type: 'single', songIds: [songIds[0]] });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('reads: 404 GAME_NOT_FOUND on GET releases for another user', async () => {
    const { gameId } = await seedGameWithSongs({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;

    const res = await request(app).get(`/api/game/${gameId}/releases`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('plan: 400 INVALID_MARKETING_BUDGET on a negative channel value', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({
      ownerId: TEST_USER_ID,
      money: 100000,
      creativeCapital: 5,
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases/plan`)
      .send({
        artistId,
        title: 'Negative Budget',
        type: 'single',
        songIds: [songIds[0]],
        scheduledReleaseWeek: 5,
        marketingBudget: { radio: -5000 },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_MARKETING_BUDGET');

    // Money untouched.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(100000);
    expect(gs.creativeCapital).toBe(5);
  });

  it('create: rejects unknown / server-computed fields with 400', async () => {
    const { gameId, artistId, songIds } = await seedGameWithSongs({ ownerId: TEST_USER_ID });

    const res = await request(app)
      .post(`/api/game/${gameId}/releases`)
      .send({
        artistId,
        title: 'Hax',
        type: 'single',
        songIds: [songIds[0]],
        revenueGenerated: 999999, // server-computed, must not be client-settable
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_RELEASE_FIELDS');
  });
});
