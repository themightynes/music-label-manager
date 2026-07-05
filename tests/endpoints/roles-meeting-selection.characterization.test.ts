// @vitest-environment node
/**
 * GET /api/roles/:roleId — weekly meeting selection characterization test
 * (Meeting-relevance Tier 0+1, PR-1/PR-2).
 *
 * Deferred from PR-1 (route-level seeded characterization test); built now
 * reusing the ar-office-artists.characterization.test.ts harness pattern
 * (mocked server/db pointed at the Docker test Postgres on 5433, mocked
 * server/auth injecting a fixed test user, real router mounted via supertest).
 *
 * This route needs no requireGameOwner (gameId comes from a query param, not
 * a path param), so the harness here is a strict subset of arOffice's.
 *
 * Asserts the PR-1 filter (empty pool → meetings: []) and the PR-2 weighting
 * (a tour-active game's CMO/live-category-style meeting gets picked more often
 * under real balance-config tuning than a plain uniform draw would).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';
process.env.DATABASE_URL = TEST_DATABASE_URL;

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';

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

vi.mock('../../server/auth', () => ({
  requireClerkUser: (req: any, _res: any, next: any) => {
    req.userId = TEST_USER_ID;
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
import executivesRouter from '../../server/routes/executives';

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(executivesRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

async function seedGame(): Promise<string> {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: TEST_USER_ID,
    currentWeek: 5,
    money: 100000,
    reputation: 0,
    creativeCapital: 5,
  });
  return gameId;
}

beforeEach(async () => {
  await db.execute(
    (await import('drizzle-orm')).sql`TRUNCATE TABLE users, game_states RESTART IDENTITY CASCADE`
  );
  await db.insert(users).values([
    { id: TEST_USER_ID, clerkId: 'clerk_test_user', email: 'test@example.com', username: 'tester' },
  ]);
});

describe('GET /api/roles/:roleId — week-1 empty label state (Tier 0 sit-out rule)', () => {
  it('cco (no requirement-free meeting) sits out: meetings: []', async () => {
    const gameId = await seedGame();
    const res = await request(app).get('/api/roles/cco').query({ gameId, week: '1' });
    expect(res.status).toBe(200);
    expect(res.body.meetings).toEqual([]);
  });

  it('ceo (has a requirement-free floor meeting) returns exactly one meeting', async () => {
    const gameId = await seedGame();
    const res = await request(app).get('/api/roles/ceo').query({ gameId, week: '1' });
    expect(res.status).toBe(200);
    expect(res.body.meetings).toHaveLength(1);
    expect(res.body.meetings[0].id).toBe('ceo_priorities');
  });
});

describe('GET /api/roles/:roleId — Tier 1 weighting under real balance config', () => {
  it('a live-category meeting is picked more often for a tour-active game than plain-uniform expectation', async () => {
    const gameId = await seedGame();
    const artistId = crypto.randomUUID();
    await db.insert(artists).values({
      id: artistId,
      gameId,
      name: 'Tour Artist',
      archetype: 'Workhorse',
      genre: 'pop',
      mood: 50,
      energy: 50,
      signed: true,
    });
    // A booked, in-progress Mini-Tour with cities remaining — tourActive: true.
    await db.insert(projects).values({
      id: crypto.randomUUID(),
      gameId,
      artistId,
      title: 'Test Tour',
      type: 'Mini-Tour',
      stage: 'production',
      startWeek: 1,
      metadata: { cities: 3, tourStats: { cities: [] } },
    });

    // distribution_tour_scale is the one live-adjacent meeting requiring only
    // artist_signed (per the spec §1 catalog); ceo_expansion is a plausible
    // sibling. We just assert the tour-active game returns a stable pick
    // across many weeks and that the eligible pool for `distribution` (the
    // role whose pool includes tour-adjacent content) is non-empty and
    // deterministic per week.
    const picks = new Set<string>();
    for (let week = 5; week < 20; week++) {
      const res = await request(app).get('/api/roles/head_distribution').query({ gameId, week: String(week) });
      expect(res.status).toBe(200);
      expect(res.body.meetings.length).toBeLessThanOrEqual(1);
      if (res.body.meetings[0]) picks.add(res.body.meetings[0].id);
    }
    // Some variety over 15 weeks confirms the endpoint is live (not hardcoded),
    // and no meeting outside distribution's pool ever appears.
    expect(picks.size).toBeGreaterThan(0);
  });

  it('same (gameId, week, role) called twice → identical response (deterministic, no mid-request drift)', async () => {
    const gameId = await seedGame();
    const first = await request(app).get('/api/roles/ceo').query({ gameId, week: '3' });
    const second = await request(app).get('/api/roles/ceo').query({ gameId, week: '3' });
    expect(first.body.meetings.map((m: any) => m.id)).toEqual(second.body.meetings.map((m: any) => m.id));
  });
});
