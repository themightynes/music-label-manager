// @vitest-environment node
/**
 * Project-creation characterization test (B1-B4 hardening).
 *
 * POST /api/game/:gameId/projects (server/routes/projects.ts) had ZERO coverage
 * and four confirmed vulnerabilities (RECORDING_SESSION_CODE_REVIEW_2026-07-02):
 *   B1 no game/project ownership check anywhere in the router (cross-tenant);
 *   B2 payment uses client-supplied totalCost, never recomputed server-side, so
 *      an in-bounds budgetPerSong (drives quality) with totalCost:1 buys full
 *      quality songs for $1;
 *   B3 mass-assignment — the raw insertProjectSchema.parse lets a request set
 *      stage/songsCreated/quality/unbounded songCount;
 *   B4 create + deduct are two separate awaits (non-atomic).
 * PATCH /api/projects/:id applied raw req.body to ANY project — no ownership,
 * no whitelist.
 *
 * The "(characterization)" block pins the behavior that is IDENTICAL before and
 * after the fix (honest happy path, insufficient funds). The "(pre-fix exploits)"
 * block pins the CURRENT exploitable behavior so Commit 1 is green on today's
 * code; Commit 2 FLIPS those pins. The "(post-fix)" block asserts the hardening
 * and only passes after the fix lands.
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
 * Seed a game (owned by ownerId) + one artist, returning ids. No project — the
 * create tests POST one. money/creativeCapital are configurable for the
 * insufficient-funds path.
 */
async function seedGame(opts: {
  ownerId: string;
  money?: number;
  creativeCapital?: number;
}) {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: opts.ownerId,
    currentWeek: 3,
    money: opts.money ?? 500000,
    reputation: 100, // high rep so all producer tiers are conceptually available
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

  return { gameId, artistId };
}

/**
 * The REAL payload the live client sends (RecordingSessionPage.handleSubmit ->
 * gameStore.createProject, which appends startWeek + stage:'planning').
 */
function clientPayload(over: Partial<Record<string, any>> = {}) {
  return {
    title: 'My Single',
    type: 'Single',
    budgetPerSong: 5000,
    totalCost: 5000, // local x standard => 5000 * 1 * 1.0 * 1.0
    songCount: 1,
    producerTier: 'local',
    timeInvestment: 'standard',
    startWeek: 3,
    stage: 'planning',
    ...over,
  };
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

describe('POST /api/game/:gameId/projects (characterization)', () => {
  it('happy path: creates a Single with the real client payload and deducts the correct cost + 1 creative capital', async () => {
    const { gameId, artistId } = await seedGame({ ownerId: TEST_USER_ID, money: 500000, creativeCapital: 5 });

    const res = await request(app)
      .post(`/api/game/${gameId}/projects`)
      .send(clientPayload({ artistId }));

    expect(res.status).toBe(200);
    // Response is the created project row.
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('My Single');
    expect(res.body.type).toBe('Single');
    expect(res.body.artistId).toBe(artistId);
    expect(res.body.gameId).toBe(gameId);
    expect(res.body.stage).toBe('planning');
    expect(res.body.songCount).toBe(1);
    expect(res.body.budgetPerSong).toBe(5000);

    // budgetPerSong 5000 x 1 song x local(1.0) x standard(1.0) = 5000 charged.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(500000 - 5000);
    expect(gs.creativeCapital).toBe(4);
  });

  it('insufficient funds: rejects and moves no money', async () => {
    const { gameId, artistId } = await seedGame({ ownerId: TEST_USER_ID, money: 1000, creativeCapital: 5 });

    const res = await request(app)
      .post(`/api/game/${gameId}/projects`)
      .send(clientPayload({ artistId, budgetPerSong: 5000, totalCost: 5000 }));

    // Handler throws a plain Error -> 500 with the generic message (pinned).
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Failed to create project');

    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(1000);
    expect(gs.creativeCapital).toBe(5);
    const rows = await db.select().from(projects).where(eq(projects.gameId, gameId));
    expect(rows.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Post-fix hardening (B1-B4). These FLIP the pre-fix exploits and assert the
// new ownership / entity-scoping / bounds checks. They only pass after the fix.
// ---------------------------------------------------------------------------
describe('POST /api/game/:gameId/projects (post-fix hardening)', () => {
  it('B2 FLIP: server-computed cost is charged; client totalCost:1 is ignored', async () => {
    const { gameId, artistId } = await seedGame({ ownerId: TEST_USER_ID, money: 500000, creativeCapital: 5 });

    const res = await request(app)
      .post(`/api/game/${gameId}/projects`)
      // budgetPerSong 8000 (max in-bounds for Single 1-song) with totalCost:1.
      .send(clientPayload({ artistId, budgetPerSong: 8000, totalCost: 1 }));

    expect(res.status).toBe(200);
    // Server recomputes: 8000 * 1 song * local(1.0) * standard(1.0) = 8000.
    expect(res.body.totalCost).toBe(8000);
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(500000 - 8000); // NOT 500000 - 1
  });

  it('B2: producer/time multipliers are applied to the server cost', async () => {
    const { gameId, artistId } = await seedGame({ ownerId: TEST_USER_ID, money: 500000, creativeCapital: 5 });

    const res = await request(app)
      .post(`/api/game/${gameId}/projects`)
      // regional(1.8) * extended(1.4) = 2.52; 5000 * 1 * 2.52 = 12600.
      .send(clientPayload({
        artistId,
        budgetPerSong: 5000,
        totalCost: 1,
        producerTier: 'regional',
        timeInvestment: 'extended',
      }));

    expect(res.status).toBe(200);
    expect(res.body.totalCost).toBe(12600);
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(500000 - 12600);
  });

  it("B3 FLIP: client-supplied stage:'production' is ignored; project is 'planning'", async () => {
    const { gameId, artistId } = await seedGame({ ownerId: TEST_USER_ID, money: 500000, creativeCapital: 5 });

    const res = await request(app)
      .post(`/api/game/${gameId}/projects`)
      .send(clientPayload({ artistId, stage: 'production' }));

    expect(res.status).toBe(200);
    expect(res.body.stage).toBe('planning'); // server-owned, not skippable
  });

  it('B3 FLIP: an unknown/forbidden field (quality) is rejected with 400', async () => {
    const { gameId, artistId } = await seedGame({ ownerId: TEST_USER_ID, money: 500000, creativeCapital: 5 });

    const res = await request(app)
      .post(`/api/game/${gameId}/projects`)
      .send(clientPayload({ artistId, quality: 98 })); // mass-assignment attempt

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid project data');
    const rows = await db.select().from(projects).where(eq(projects.gameId, gameId));
    expect(rows.length).toBe(0);
  });

  it('B3: songCount out of bounds (EP with 10 songs) is rejected with 400', async () => {
    const { gameId, artistId } = await seedGame({ ownerId: TEST_USER_ID, money: 500000, creativeCapital: 5 });

    const res = await request(app)
      .post(`/api/game/${gameId}/projects`)
      .send(clientPayload({
        artistId,
        type: 'EP',
        songCount: 10, // legit range is 3-5
        budgetPerSong: 5000,
        totalCost: 1,
      }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_SONG_COUNT');
    const rows = await db.select().from(projects).where(eq(projects.gameId, gameId));
    expect(rows.length).toBe(0);
  });

  it('B1: cross-tenant create returns 404 GAME_NOT_FOUND; victim game untouched', async () => {
    const { gameId, artistId } = await seedGame({ ownerId: OTHER_USER_ID, money: 500000, creativeCapital: 5 });
    currentUserId = TEST_USER_ID; // attacker != owner

    const res = await request(app)
      .post(`/api/game/${gameId}/projects`)
      .send(clientPayload({ artistId }));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(500000); // untouched
    const rows = await db.select().from(projects).where(eq(projects.gameId, gameId));
    expect(rows.length).toBe(0);
  });

  it('entity-scoping: artistId from a different game returns 400; no project created', async () => {
    const mine = await seedGame({ ownerId: TEST_USER_ID, money: 500000, creativeCapital: 5 });
    const other = await seedGame({ ownerId: OTHER_USER_ID });

    const res = await request(app)
      .post(`/api/game/${mine.gameId}/projects`)
      .send(clientPayload({ artistId: other.artistId })); // artist from another game

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ARTIST_NOT_IN_GAME');
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, mine.gameId));
    expect(gs.money).toBe(500000);
    const rows = await db.select().from(projects).where(eq(projects.gameId, mine.gameId));
    expect(rows.length).toBe(0);
  });

  it('B1 FLIP: PATCH cross-tenant returns 404 PROJECT_NOT_FOUND; project unchanged', async () => {
    // Victim owns the game/project; attacker (TEST_USER_ID) patches it.
    const { gameId, artistId } = await seedGame({ ownerId: OTHER_USER_ID, money: 500000, creativeCapital: 5 });
    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId,
      gameId,
      artistId,
      title: 'Victim Project',
      type: 'Single',
      stage: 'planning',
    });

    currentUserId = TEST_USER_ID; // attacker != owner
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ stage: 'recorded' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('PROJECT_NOT_FOUND');
    const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
    expect(proj.stage).toBe('planning'); // unchanged
  });

  it('B3: PATCH by the owner with a whitelisted field succeeds; unknown field 400s', async () => {
    const { gameId, artistId } = await seedGame({ ownerId: TEST_USER_ID, money: 500000, creativeCapital: 5 });
    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId,
      gameId,
      artistId,
      title: 'My Project',
      type: 'Single',
      stage: 'planning',
    });

    const ok = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ stage: 'production' });
    expect(ok.status).toBe(200);
    expect(ok.body.stage).toBe('production');

    const bad = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ quality: 98 }); // mass-assignment attempt
    expect(bad.status).toBe(400);
    const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
    expect(proj.quality).toBe(0); // unchanged
  });
});
