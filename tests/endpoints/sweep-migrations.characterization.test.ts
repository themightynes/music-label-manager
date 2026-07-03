// @vitest-environment node
/**
 * Ownership-sweep characterization test (Phase 1, ownership-sweep-migration).
 *
 * Pins the observable behavior of the remaining game-scoped routers BEFORE and
 * AFTER the requireGameOwner sweep so the migration can be proven
 * behavior-preserving for the OWNER path (green before AND after) while the
 * non-owner path flips from "leaks/mutates victim data" to 404 GAME_NOT_FOUND.
 *
 * Routers covered: games (GET/PATCH /api/game/:id, POST /api/game/:gameId/label),
 * gameLoop (POST /api/game/:gameId/actions, POST /api/advance-week body gameId),
 * executives (GET .../executives, POST .../executive/:execId/action),
 * arOffice (start/cancel/status/artists), analytics (4 ROI reads, query gameId),
 * tour (POST /api/tour/estimate, body gameId), devTools (streaming-decay).
 *
 * Drives the real routers over supertest against the real test Postgres
 * (Docker, localhost:5433). Clerk auth is mocked to a fixed test user; server/db
 * is mocked to a non-SSL pool pointed at the test DB. Harness copied from
 * tests/endpoints/releases.characterization.test.ts.
 *
 * The blocks tagged "(post-hardening)" only pass AFTER the migration commit
 * lands (requireGameOwner + PATCH whitelist + execId validation).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';
process.env.DATABASE_URL = TEST_DATABASE_URL;

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';

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
import { gameStates, users, artists, executives, musicLabels } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { requireClerkUser } from '../../server/auth';
import gamesRouter from '../../server/routes/games';
import gameLoopRouter from '../../server/routes/gameLoop';
import executivesRouter from '../../server/routes/executives';
import arOfficeRouter from '../../server/routes/arOffice';
import tourRouter from '../../server/routes/tour';
import devToolsRouter from '../../server/routes/devTools';
import analyticsRouter from '../../server/routes/analytics';

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(gamesRouter);
  app.use(gameLoopRouter);
  app.use(executivesRouter);
  app.use(arOfficeRouter);
  app.use(tourRouter);
  app.use(devToolsRouter);
  // Analytics is mounted under /api/analytics with requireClerkUser at the mount
  // point in production (server/routes.ts:117); mirror that here.
  app.use('/api/analytics', requireClerkUser, analyticsRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

/** Seed a game owned by ownerId with sensible defaults. Returns ids. */
async function seedGame(opts: {
  ownerId: string;
  money?: number;
  reputation?: number;
  creativeCapital?: number;
  currentWeek?: number;
  focusSlots?: number;
  usedFocusSlots?: number;
  venueAccess?: string;
  withArtist?: boolean;
  withExecutive?: boolean;
}) {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: opts.ownerId,
    currentWeek: opts.currentWeek ?? 1,
    money: opts.money ?? 100000,
    reputation: opts.reputation ?? 10,
    creativeCapital: opts.creativeCapital ?? 5,
    focusSlots: opts.focusSlots ?? 3,
    usedFocusSlots: opts.usedFocusSlots ?? 0,
    venueAccess: opts.venueAccess ?? 'clubs',
  });

  let artistId: string | undefined;
  if (opts.withArtist) {
    artistId = crypto.randomUUID();
    await db.insert(artists).values({
      id: artistId,
      gameId,
      name: 'Test Artist',
      archetype: 'Workhorse',
      genre: 'pop',
      mood: 50,
      energy: 50,
      popularity: 40,
    });
  }

  let execId: string | undefined;
  if (opts.withExecutive) {
    execId = crypto.randomUUID();
    await db.insert(executives).values({
      id: execId,
      gameId,
      role: 'head_ar',
      level: 1,
      mood: 50,
      loyalty: 50,
    });
  }

  return { gameId, artistId, execId };
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

// ===========================================================================
// COMMIT 1: current OWNER-path behavior (green before AND after migration)
// ===========================================================================
describe('games router (owner path)', () => {
  it('GET /api/game/:id returns the full game graph', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });
    const res = await request(app).get(`/api/game/${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body.gameState.id).toBe(gameId);
    expect(Array.isArray(res.body.artists)).toBe(true);
    expect(Array.isArray(res.body.projects)).toBe(true);
    expect(Array.isArray(res.body.releases)).toBe(true);
  });

  it('PATCH /api/game/:id updates focus-slot fields', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID, usedFocusSlots: 0 });
    const res = await request(app)
      .patch(`/api/game/${gameId}`)
      .send({ usedFocusSlots: 2, arOfficeSlotUsed: true, arOfficeSourcingType: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.usedFocusSlots).toBe(2);
    expect(res.body.arOfficeSlotUsed).toBe(true);
    expect(res.body.arOfficeSourcingType).toBe('active');
  });

  it('POST /api/game/:gameId/label creates a label', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });
    const res = await request(app)
      .post(`/api/game/${gameId}/label`)
      .send({ name: 'My Label' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('My Label');
    expect(res.body.gameId).toBe(gameId);
  });
});

describe('gameLoop router (owner path)', () => {
  it('POST /api/game/:gameId/actions creates a weekly action', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });
    const res = await request(app)
      .post(`/api/game/${gameId}/actions`)
      .send({ actionType: 'role_meeting', week: 1, details: {} });
    expect(res.status).toBe(200);
    expect(res.body.gameId).toBe(gameId);
  });
});

describe('executives router (owner path)', () => {
  it('GET /api/game/:gameId/executives returns executives', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID, withExecutive: true });
    const res = await request(app).get(`/api/game/${gameId}/executives`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('POST /api/game/:gameId/executive/:execId/action consumes a focus slot', async () => {
    const { gameId, execId } = await seedGame({ ownerId: TEST_USER_ID, withExecutive: true, usedFocusSlots: 0 });
    const res = await request(app)
      .post(`/api/game/${gameId}/executive/${execId}/action`)
      .send({ actionId: 'a1', choiceId: 'c1', metadata: { roleId: 'head_ar' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.usedSlots).toBe(1);
  });
});

describe('arOffice router (owner path)', () => {
  it('GET /api/game/:gameId/ar-office/status returns status', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });
    const res = await request(app).get(`/api/game/${gameId}/ar-office/status`);
    expect(res.status).toBe(200);
    expect(res.body.arOfficeSlotUsed).toBe(false);
  });

  it('POST /api/game/:gameId/ar-office/start starts an operation', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID, usedFocusSlots: 0 });
    const res = await request(app)
      .post(`/api/game/${gameId}/ar-office/start`)
      .send({ sourcingType: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status.arOfficeSlotUsed).toBe(true);
  });

  it('GET /api/game/:gameId/ar-office/artists returns a list', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });
    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.artists)).toBe(true);
  });
});

describe('tour router (owner path)', () => {
  it('POST /api/tour/estimate returns an estimate', async () => {
    const { gameId, artistId } = await seedGame({
      ownerId: TEST_USER_ID,
      venueAccess: 'clubs',
      withArtist: true,
    });
    const res = await request(app)
      .post('/api/tour/estimate')
      .send({ artistId, cities: 3, budgetPerCity: 1000, gameId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('estimatedRevenue');
    expect(res.body).toHaveProperty('totalCosts');
  });
});

describe('devTools router (owner path)', () => {
  it('POST /api/game/:gameId/test/streaming-decay returns a simulation', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });
    const res = await request(app)
      .post(`/api/game/${gameId}/test/streaming-decay`)
      .send({
        songQuality: 80,
        artistPopularity: 40,
        playlistAccess: 'none',
        reputation: 10,
        marketingBudget: { radio: 1000 },
        weeksToSimulate: 4,
      });
    expect(res.status).toBe(200);
  });
});

describe('analytics router (owner path)', () => {
  it('GET /api/analytics/portfolio/roi returns metrics', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });
    const res = await request(app).get(`/api/analytics/portfolio/roi?gameId=${gameId}`);
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// COMMIT 2: ownership hardening (post-hardening). Non-owner => 404, whitelist
// rejects unknown PATCH fields, invalid execId => 404.
// ===========================================================================
describe('ownership hardening (post-hardening)', () => {
  it('GET /api/game/:id 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app).get(`/api/game/${gameId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('PATCH /api/game/:id 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app)
      .patch(`/api/game/${gameId}`)
      .send({ usedFocusSlots: 2, arOfficeSlotUsed: false, arOfficeSourcingType: null });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
    // Victim untouched.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.usedFocusSlots).toBe(0);
  });

  it('PATCH /api/game/:id 400 INVALID_GAME_FIELDS on unknown/server-computed field', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });
    const res = await request(app)
      .patch(`/api/game/${gameId}`)
      .send({ money: 999999999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_GAME_FIELDS');
    // Money untouched.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(100000);
  });

  it('POST /api/game/:gameId/label 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app).post(`/api/game/${gameId}/label`).send({ name: 'Hax' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
    const labels = await db.select().from(musicLabels).where(eq(musicLabels.gameId, gameId));
    expect(labels).toHaveLength(0);
  });

  it('POST /api/game/:gameId/actions 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app)
      .post(`/api/game/${gameId}/actions`)
      .send({ actionType: 'role_meeting', week: 1, details: {} });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('POST /api/advance-week 404 GAME_NOT_FOUND for another user (body gameId)', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app)
      .post('/api/advance-week')
      .send({ gameId, selectedActions: [] });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('GET /api/game/:gameId/executives 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID, withExecutive: true });
    currentUserId = TEST_USER_ID;
    const res = await request(app).get(`/api/game/${gameId}/executives`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('POST executive action 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId, execId } = await seedGame({ ownerId: OTHER_USER_ID, withExecutive: true });
    currentUserId = TEST_USER_ID;
    const res = await request(app)
      .post(`/api/game/${gameId}/executive/${execId}/action`)
      .send({ actionId: 'a1', choiceId: 'c1', metadata: {} });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('POST executive action 404 EXECUTIVE_NOT_FOUND when execId not in game', async () => {
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });
    const res = await request(app)
      .post(`/api/game/${gameId}/executive/${crypto.randomUUID()}/action`)
      .send({ actionId: 'a1', choiceId: 'c1', metadata: {} });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('EXECUTIVE_NOT_FOUND');
  });

  it('arOffice start 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app)
      .post(`/api/game/${gameId}/ar-office/start`)
      .send({ sourcingType: 'active' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('arOffice status 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app).get(`/api/game/${gameId}/ar-office/status`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('arOffice cancel 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app).post(`/api/game/${gameId}/ar-office/cancel`).send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('arOffice artists 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('POST /api/tour/estimate 404 GAME_NOT_FOUND for another user (body gameId)', async () => {
    const { gameId, artistId } = await seedGame({ ownerId: OTHER_USER_ID, withArtist: true });
    currentUserId = TEST_USER_ID;
    const res = await request(app)
      .post('/api/tour/estimate')
      .send({ artistId, cities: 3, budgetPerCity: 1000, gameId });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('devTools streaming-decay 404 GAME_NOT_FOUND for another user', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app)
      .post(`/api/game/${gameId}/test/streaming-decay`)
      .send({ songQuality: 80, artistPopularity: 40, playlistAccess: 'none', reputation: 10, marketingBudget: {}, weeksToSimulate: 2 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('analytics portfolio ROI 404 GAME_NOT_FOUND for another user (query gameId)', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;
    const res = await request(app).get(`/api/analytics/portfolio/roi?gameId=${gameId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });
});
