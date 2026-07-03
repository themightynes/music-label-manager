// @vitest-environment node
/**
 * advance-week characterization test (Phase 2, PR-3).
 *
 * Pins the observable HTTP behavior of POST /api/advance-week BEFORE it is
 * extracted into advanceWeekService, so the extraction can be proven
 * behavior-preserving (green before AND after). The existing HTTP coverage
 * (sweep-migrations.characterization.test.ts) only pins the non-owner 404 for
 * this route; the successful response shape and the campaign-completed
 * early-return path were unpinned. This file adds those pins.
 *
 * The engine-level tests (game-engine-advance-week-integration.test.ts,
 * game-spine-advance-save-restore.test.ts) drive GameEngine.advanceWeek and
 * storage DIRECTLY, not the HTTP endpoint. They do not cover the route's
 * two-transaction orchestration, its response assembly (gameState + summary +
 * campaignResults + debug), or the campaign-completed early return. That is what
 * this file pins.
 *
 * Drives the real gameLoop router over supertest against the real test Postgres
 * (Docker, localhost:5433). Clerk auth is mocked to a fixed test user; server/db
 * is mocked to a non-SSL pool pointed at the test DB. Harness copied from
 * tests/endpoints/sweep-migrations.characterization.test.ts.
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
import { gameStates, users, artists, executives } from '@shared/schema';
import gameLoopRouter from '../../server/routes/gameLoop';

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(gameLoopRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

/** Seed a game owned by ownerId with sensible defaults + one artist + execs. */
async function seedGame(opts: {
  ownerId: string;
  money?: number;
  reputation?: number;
  creativeCapital?: number;
  currentWeek?: number;
  campaignCompleted?: boolean;
}) {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: opts.ownerId,
    currentWeek: opts.currentWeek ?? 1,
    money: opts.money ?? 100000,
    reputation: opts.reputation ?? 10,
    creativeCapital: opts.creativeCapital ?? 5,
    focusSlots: 3,
    usedFocusSlots: 0,
    venueAccess: 'clubs',
    campaignCompleted: opts.campaignCompleted ?? false,
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
    popularity: 40,
  });

  // Executives, as production seeds them (drives exec mood decay path).
  await db.insert(executives).values([
    { id: crypto.randomUUID(), gameId, role: 'head_ar', level: 1, mood: 50, loyalty: 50 },
    { id: crypto.randomUUID(), gameId, role: 'cmo', level: 1, mood: 50, loyalty: 50 },
  ]);

  return { gameId, artistId };
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

describe('POST /api/advance-week (characterization)', () => {
  it('happy path: 200 with full response shape (gameState + summary + debug), advances the week', async () => {
    const { gameId } = await seedGame({
      ownerId: TEST_USER_ID,
      currentWeek: 1,
      money: 100000,
      reputation: 10,
      creativeCapital: 5,
    });

    const res = await request(app)
      .post('/api/advance-week')
      .send({ gameId, selectedActions: [] });

    expect(res.status).toBe(200);

    // Response envelope: gameState + summary + debug. campaignResults is
    // weekResult.campaignResults, which is undefined mid-campaign (the engine
    // only sets it at completion), so the key is omitted from the JSON body.
    expect(res.body).toHaveProperty('gameState');
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('debug');
    expect(res.body).not.toHaveProperty('campaignResults');

    // gameState is the persisted row; week advanced 1 -> 2.
    expect(res.body.gameState.id).toBe(gameId);
    expect(res.body.gameState.currentWeek).toBe(2);

    // summary shape (WeekSummary): week + revenue/expenses + changes[].
    expect(res.body.summary.week).toBe(2);
    expect(typeof res.body.summary.revenue).toBe('number');
    expect(typeof res.body.summary.expenses).toBe('number');
    expect(Array.isArray(res.body.summary.changes)).toBe(true);

    // debug envelope assembled in the second transaction.
    expect(res.body.debug).toHaveProperty('serverMessage', 'Server-side processing completed');
    expect(res.body.debug).toHaveProperty('processingSteps');
    expect(res.body.debug.processingSteps).toHaveProperty('gameEngineExecuted', true);
    expect(res.body.debug).toHaveProperty('projectStates');
    expect(res.body.debug).toHaveProperty('songStates');
    expect(res.body.debug).toHaveProperty('timestamp');

    // Persisted: week advanced in the DB.
    const { eq } = await import('drizzle-orm');
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.currentWeek).toBe(2);
  });

  it('campaign-completed early return: 200, does NOT advance the week, returns campaignResults.campaignCompleted', async () => {
    // Week >= 52 so the handler does not reset the campaignCompleted flag.
    const { gameId } = await seedGame({
      ownerId: TEST_USER_ID,
      currentWeek: 52,
      money: 50000,
      reputation: 30,
      campaignCompleted: true,
    });

    const res = await request(app)
      .post('/api/advance-week')
      .send({ gameId, selectedActions: [] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('campaignResults');
    expect(res.body.campaignResults.campaignCompleted).toBe(true);
    expect(res.body.campaignResults).toHaveProperty('finalScore');
    expect(res.body.campaignResults).toHaveProperty('scoreBreakdown');
    expect(res.body.campaignResults).toHaveProperty('victoryType');
    expect(res.body.summary).toHaveProperty('week');

    // Early return path persists the game state unchanged: week stays 52.
    const { eq } = await import('drizzle-orm');
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.currentWeek).toBe(52);
  });

  it('validation error: 500 ADVANCE_WEEK_ERROR when selectedActions is missing', async () => {
    // validateRequest() throws a plain Error (not a ZodError), so the ZodError
    // branch in the catch is NOT hit — the request falls through to the generic
    // 500 ADVANCE_WEEK_ERROR path. Pinning current behavior.
    const { gameId } = await seedGame({ ownerId: TEST_USER_ID });

    const res = await request(app)
      .post('/api/advance-week')
      .send({ gameId });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('ADVANCE_WEEK_ERROR');
    expect(res.body.message).toMatch(/Validation failed/);
  });

  it('non-owner: 404 GAME_NOT_FOUND (body gameId)', async () => {
    const { gameId } = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;

    const res = await request(app)
      .post('/api/advance-week')
      .send({ gameId, selectedActions: [] });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });
});
