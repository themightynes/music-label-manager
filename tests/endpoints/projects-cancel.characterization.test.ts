// @vitest-environment node
/**
 * Tour-cancellation characterization test (C40).
 *
 * DELETE /api/projects/:id/cancel refunds a fraction of a tour's cost when the
 * player cancels a Mini-Tour. Before this fix the refund was computed entirely
 * CLIENT-side (client/src/components/ActiveTours.tsx, refundPercentage = 0.6)
 * and sent in the request body; the server applied body.refundAmount to the
 * player's money WITHOUT recomputing or capping it, and performed NO ownership
 * check — any authenticated user could mint arbitrary money against any game.
 *
 * The "(characterization)" block pins the behavior that is IDENTICAL before and
 * after the fix (honest happy path, unknown-project 404, non-tour 400), so the
 * fix is proven behavior-preserving for honest clients. The "(post-fix)" block
 * asserts the C40 hardening: body.refundAmount is now IGNORED and recomputed
 * server-side, and a cross-tenant caller gets 404 with no money moved. Those
 * only pass AFTER the fix lands.
 *
 * It drives the real projects router over supertest against the real test
 * Postgres (Docker, localhost:5433). Clerk auth is mocked to a fixed test user
 * (mutable so a second user can be impersonated for cross-tenant checks);
 * server/db is mocked to a non-SSL pool pointed at the test DB (the production
 * pool forces SSL, which the local test container rejects).
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
//     `db` from ./db, so this single mock reroutes storage + handlers.
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
import { gameStates, users, artists, projects } from '@shared/schema';
import { eq } from 'drizzle-orm';
import projectsRouter from '../../server/routes/projects';

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(projectsRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

/**
 * Seed a game owned by ownerId with a Mini-Tour project. The tour metadata
 * mirrors the production shape the client reads: metadata.cities is the planned
 * count, metadata.tourStats.cities is the array of COMPLETED cities. Returns ids.
 *
 * Legitimate client refund formula (ActiveTours.tsx):
 *   planned      = metadata.cities || 1
 *   completed    = metadata.tourStats.cities.length
 *   remaining    = max(0, planned - completed)
 *   costPerCity  = totalCost / planned
 *   refund       = round(remaining * costPerCity * 0.6)
 */
async function seedTour(opts: {
  ownerId: string;
  money?: number;
  totalCost?: number;
  plannedCities?: number;
  completedCities?: number;
  stage?: string;
  type?: string;
}) {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: opts.ownerId,
    currentWeek: 1,
    money: opts.money ?? 100000,
    reputation: 0,
    creativeCapital: 5,
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

  const plannedCities = opts.plannedCities ?? 4;
  const completedCities = opts.completedCities ?? 1;
  const cities = Array.from({ length: completedCities }, (_, i) => ({
    cityNumber: i + 1,
    revenue: 1000,
    attendanceRate: 80,
  }));

  const projectId = crypto.randomUUID();
  await db.insert(projects).values({
    id: projectId,
    gameId,
    artistId,
    title: 'Test Tour',
    type: opts.type ?? 'Mini-Tour',
    stage: opts.stage ?? 'production',
    totalCost: opts.totalCost ?? 12000,
    metadata: {
      cities: plannedCities,
      tourStats: { cities },
    },
  });

  return { gameId, artistId, projectId, plannedCities, completedCities };
}

/** Reproduce the legitimate client refund formula for expected-value asserts. */
function expectedRefund(totalCost: number, planned: number, completed: number) {
  const remaining = Math.max(0, planned - completed);
  const costPerCity = totalCost / planned;
  return Math.round(remaining * costPerCity * 0.6);
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

describe('DELETE /api/projects/:id/cancel (characterization)', () => {
  it('happy path: credits the legitimate client-computed refund, marks project cancelled', async () => {
    const totalCost = 12000;
    const planned = 4;
    const completed = 1;
    const { gameId, projectId } = await seedTour({
      ownerId: TEST_USER_ID,
      money: 100000,
      totalCost,
      plannedCities: planned,
      completedCities: completed,
    });

    // What an honest client would send: remaining 3 * (12000/4) * 0.6 = 5400.
    const legitRefund = expectedRefund(totalCost, planned, completed);
    expect(legitRefund).toBe(5400);

    const res = await request(app)
      .delete(`/api/projects/${projectId}/cancel`)
      .send({ refundAmount: legitRefund });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.refundAmount).toBe(legitRefund);
    expect(res.body.newBalance).toBe(100000 + legitRefund);
    expect(res.body.message).toContain('cancelled successfully');

    // Money credited, project marked cancelled with loss recorded.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(100000 + legitRefund);
    const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
    expect(proj.stage).toBe('cancelled');
    expect(proj.completionStatus).toBe('cancelled');
    expect(proj.totalRevenue).toBe(-(totalCost - legitRefund));
  });

  it('404 when the project does not exist', async () => {
    const res = await request(app)
      .delete(`/api/projects/${crypto.randomUUID()}/cancel`)
      .send({ refundAmount: 1000 });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });

  it('400 when the project is not a Mini-Tour', async () => {
    const { projectId } = await seedTour({
      ownerId: TEST_USER_ID,
      type: 'EP',
    });

    const res = await request(app)
      .delete(`/api/projects/${projectId}/cancel`)
      .send({ refundAmount: 1000 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Only tours can be cancelled');
  });
});

// ---------------------------------------------------------------------------
// Post-fix behavior (C40). These assert the server-side refund recompute +
// ownership check. They only pass against the hardened handler.
// ---------------------------------------------------------------------------
describe('server-side refund + ownership (post-fix)', () => {
  it('FLIP: a huge client-supplied refundAmount is IGNORED; server value is credited', async () => {
    const totalCost = 12000;
    const planned = 4;
    const completed = 1;
    const { gameId, projectId } = await seedTour({
      ownerId: TEST_USER_ID,
      money: 100000,
      totalCost,
      plannedCities: planned,
      completedCities: completed,
    });

    const serverRefund = expectedRefund(totalCost, planned, completed); // 5400

    const res = await request(app)
      .delete(`/api/projects/${projectId}/cancel`)
      .send({ refundAmount: 999999 }); // exploit attempt — must be ignored

    expect(res.status).toBe(200);
    expect(res.body.refundAmount).toBe(serverRefund);
    expect(res.body.refundAmount).not.toBe(999999);
    expect(res.body.newBalance).toBe(100000 + serverRefund);

    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(100000 + serverRefund);
  });

  it('recomputes refund from stored data even when the client sends nothing', async () => {
    const totalCost = 20000;
    const planned = 5;
    const completed = 2;
    const { gameId, projectId } = await seedTour({
      ownerId: TEST_USER_ID,
      money: 50000,
      totalCost,
      plannedCities: planned,
      completedCities: completed,
    });

    const serverRefund = expectedRefund(totalCost, planned, completed); // 3*(20000/5)*0.6 = 7200

    const res = await request(app)
      .delete(`/api/projects/${projectId}/cancel`)
      .send({}); // no refundAmount at all

    expect(res.status).toBe(200);
    expect(res.body.refundAmount).toBe(serverRefund);
    expect(serverRefund).toBe(7200);

    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(50000 + serverRefund);
  });

  it('cross-tenant: 404 PROJECT_NOT_FOUND when the project belongs to another user; no money moved', async () => {
    const { gameId, projectId } = await seedTour({
      ownerId: OTHER_USER_ID,
      money: 100000,
      totalCost: 12000,
      plannedCities: 4,
      completedCities: 1,
    });
    currentUserId = TEST_USER_ID; // impersonate non-owner

    const res = await request(app)
      .delete(`/api/projects/${projectId}/cancel`)
      .send({ refundAmount: 5400 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('PROJECT_NOT_FOUND');

    // Victim's game untouched; project not cancelled.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(100000);
    const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
    expect(proj.stage).toBe('production');
    expect(proj.completionStatus).toBe('active');
  });
});
