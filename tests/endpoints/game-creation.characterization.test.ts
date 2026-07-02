// @vitest-environment node
/**
 * Game-creation characterization test (Phase 1, PR-15).
 *
 * POST /api/game (and the auto-create branch of GET /api/game-state) had ZERO
 * coverage at any level. This test pins the observable behavior of the fat
 * game-creation handler BEFORE it is extracted into gameCreationService, so the
 * extraction can be proven behavior-preserving (green before AND after).
 *
 * It drives the real registerRoutes() router over supertest against the real
 * test Postgres (Docker, localhost:5433). Clerk auth is mocked to a fixed test
 * user; server/db is mocked to a non-SSL pool pointed at the test DB (the
 * production pool forces SSL, which the local test container rejects).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Must be set before any module that reads DATABASE_URL at import time.
const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Fixed clerk id / resolved userId for the mocked authenticated user.
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';

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
//     everything else is a passthrough. Handlers only depend on req.userId.
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
import { gameStates, users, executives } from '@shared/schema';
import { eq } from 'drizzle-orm';

let app: Express;

/** Reproduce the handler's tier-derivation to compute expected tiers from the
 *  live balance config (rather than hardcoding thresholds). */
function expectedTiers(rep: number) {
  const accessTiers = serverGameData.getAccessTiersSync() as any;
  const pick = (tiersObj: Record<string, { threshold: number }>) =>
    Object.entries(tiersObj)
      .sort(([, a], [, b]) => (b as any).threshold - (a as any).threshold)
      .find(([, cfg]) => rep >= (cfg as any).threshold)?.[0] || 'none';
  return {
    playlist: pick(accessTiers.playlist_access),
    press: pick(accessTiers.press_access),
    venue: pick(accessTiers.venue_access),
  };
}

beforeAll(async () => {
  const { registerRoutes } = await import('../../server/routes');
  app = express();
  app.use(express.json());
  const server = await registerRoutes(app);
  server.close();
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

beforeEach(async () => {
  // Clean slate + seed the authenticated user row.
  await db.execute(
    // TRUNCATE via drizzle raw; CASCADE clears dependent game rows.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (await import('drizzle-orm')).sql`TRUNCATE TABLE users, game_states RESTART IDENTITY CASCADE`
  );
  await db.insert(users).values({
    id: TEST_USER_ID,
    clerkId: 'clerk_test_user',
    email: 'test@example.com',
    username: 'tester',
  });
});

describe('POST /api/game (characterization, pre-extraction baseline)', () => {
  it('sets starting money from balance config at normal (1.0x) difficulty by default', async () => {
    const expected = await serverGameData.getStartingValues('normal');

    const res = await request(app).post('/api/game').send({});

    expect(res.status).toBe(200);
    expect(res.body.money).toBe(expected.money);
    expect(res.body.reputation).toBe(expected.reputation);
    expect(res.body.creativeCapital).toBe(expected.creativeCapital);
  });

  it('scales starting money by difficulty multiplier (easy 1.5x, hard 0.7x)', async () => {
    const easyExpected = await serverGameData.getStartingValues('easy');
    const easy = await request(app).post('/api/game').send({ difficulty: 'easy' });
    expect(easy.status).toBe(200);
    expect(easy.body.money).toBe(easyExpected.money);
    expect(easy.body.flags?.difficulty).toBe('easy');

    const hardExpected = await serverGameData.getStartingValues('hard');
    const hard = await request(app).post('/api/game').send({ difficulty: 'hard' });
    expect(hard.status).toBe(200);
    expect(hard.body.money).toBe(hardExpected.money);
    expect(hard.body.flags?.difficulty).toBe('hard');

    // sanity: easy > normal-equivalent > hard
    expect(easyExpected.money).toBeGreaterThan(hardExpected.money);
  });

  it('defaults difficulty to normal for an unknown value and persists flags.difficulty', async () => {
    const res = await request(app).post('/api/game').send({ difficulty: 'nonsense' });
    expect(res.status).toBe(200);
    expect(res.body.flags?.difficulty).toBe('normal');
  });

  it('derives access tiers from starting reputation (ignoring client-provided access fields)', async () => {
    const starting = await serverGameData.getStartingValues('normal');
    const tiers = expectedTiers(starting.reputation || 0);

    const res = await request(app)
      .post('/api/game')
      // client attempts to force tiers — handler must ignore these
      .send({ playlistAccess: 'flagship', pressAccess: 'national', venueAccess: 'arenas' });

    expect(res.status).toBe(200);
    expect(res.body.playlistAccess).toBe(tiers.playlist);
    expect(res.body.pressAccess).toBe(tiers.press);
    expect(res.body.venueAccess).toBe(tiers.venue);
  });

  it('creates a music label when label data is provided', async () => {
    const res = await request(app)
      .post('/api/game')
      .send({ labelData: { name: 'Neon Records', foundedYear: 2030 } });

    expect(res.status).toBe(200);
    expect(res.body.musicLabel).toBeTruthy();
    expect(res.body.musicLabel.name).toBe('Neon Records');
    expect(res.body.musicLabel.gameId).toBe(res.body.id);
  });

  it('defaults the music label name when label data omits it', async () => {
    const res = await request(app).post('/api/game').send({});
    expect(res.status).toBe(200);
    expect(res.body.musicLabel).toBeTruthy();
    expect(res.body.musicLabel.name).toBe('New Music Label');
  });

  it('seeds exactly 4 executives (head_ar, cmo, cco, head_distribution) at level 1, mood 50, loyalty 50', async () => {
    const res = await request(app).post('/api/game').send({});
    expect(res.status).toBe(200);

    const rows = await db.select().from(executives).where(eq(executives.gameId, res.body.id));
    expect(rows).toHaveLength(4);

    const byRole = Object.fromEntries(rows.map((r) => [r.role, r]));
    for (const role of ['head_ar', 'cmo', 'cco', 'head_distribution']) {
      expect(byRole[role], `executive ${role}`).toBeTruthy();
      expect(byRole[role].level).toBe(1);
      expect(byRole[role].mood).toBe(50);
      expect(byRole[role].loyalty).toBe(50);
    }
  });

  it('associates the created game with the authenticated user', async () => {
    const res = await request(app).post('/api/game').send({});
    expect(res.status).toBe(200);

    const [row] = await db.select().from(gameStates).where(eq(gameStates.id, res.body.id));
    expect(row.userId).toBe(TEST_USER_ID);
  });

  it('returns Zod 400 for an invalid body', async () => {
    // reputation must be a number per insertGameStateSchema; a non-coercible
    // string triggers a ZodError → 400.
    const res = await request(app).post('/api/game').send({ reputation: 'not-a-number' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid game data');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});

describe('GET /api/game-state tier derivation (characterization)', () => {
  it('auto-creates a game with reputation-derived access tiers when none exists', async () => {
    const starting = await serverGameData.getStartingValues('normal');
    const tiers = expectedTiers(starting.reputation || 0);

    const res = await request(app).get('/api/game-state');
    expect(res.status).toBe(200);
    expect(res.body.playlistAccess).toBe(tiers.playlist);
    expect(res.body.pressAccess).toBe(tiers.press);
    expect(res.body.venueAccess).toBe(tiers.venue);
    expect(res.body.money).toBe(starting.money);
    expect(res.body.musicLabel).toBeNull();
  });
});
