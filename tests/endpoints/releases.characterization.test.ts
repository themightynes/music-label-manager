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
