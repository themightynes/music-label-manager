// @vitest-environment node
/**
 * GET /api/game-state auto-creation characterization test (Phase 2, PR-13 task 3, D4).
 *
 * GET /api/game-state auto-creates a game when the user has none. Plan D4 keeps
 * the auto-creation (client/src/pages/GamePage.tsx:42 depends on it) but routes
 * the creation through gameCreationService so there is exactly one place a game
 * comes into existence.
 *
 * CRITICAL SHAPE CONTRACT (D4 says "response shape unchanged"): the auto-created
 * game must remain LABEL-LESS (`musicLabel: null`) and have NO executives.
 * GamePage.tsx keys the label-creation modal off `!serverGameState.musicLabel`
 * (line 53) — if the auto-create suddenly returned a default "New Music Label",
 * that modal would never appear and the user would silently get an unnamed
 * label. So the service is called in a "bare" mode (no label, no executives)
 * that reuses the core createGameState + tier-derivation + difficulty-flag path
 * WITHOUT the POST /api/game seeding. These tests pin that shape before AND
 * after the routing change — they are green on both sides of the commit.
 *
 * Harness mirrors tests/endpoints/game-creation.characterization.test.ts.
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
import { gameStates, users, executives, musicLabels } from '@shared/schema';
import { eq } from 'drizzle-orm';

let app: Express;

/** Reproduce the tier-derivation from the live balance config. */
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
  await db.execute(
    (await import('drizzle-orm')).sql`TRUNCATE TABLE users, game_states RESTART IDENTITY CASCADE`
  );
  await db.insert(users).values({
    id: TEST_USER_ID,
    clerkId: 'clerk_test_user',
    email: 'test@example.com',
    username: 'tester',
  });
});

describe('GET /api/game-state auto-creation (characterization, D4)', () => {
  it('auto-creates a game with balance starting values and reputation-derived tiers', async () => {
    const starting = await serverGameData.getStartingValues('normal');
    const tiers = expectedTiers(starting.reputation || 0);

    const res = await request(app).get('/api/game-state');
    expect(res.status).toBe(200);
    expect(res.body.money).toBe(starting.money);
    expect(res.body.reputation).toBe(starting.reputation);
    expect(res.body.creativeCapital).toBe(starting.creativeCapital);
    expect(res.body.playlistAccess).toBe(tiers.playlist);
    expect(res.body.pressAccess).toBe(tiers.press);
    expect(res.body.venueAccess).toBe(tiers.venue);
    expect(res.body.currentWeek).toBe(1);
    expect(res.body.focusSlots).toBe(3);
    expect(res.body.userId).toBe(TEST_USER_ID);
  });

  it('auto-created game is LABEL-LESS (musicLabel: null) — GamePage keys its label modal off this', async () => {
    const res = await request(app).get('/api/game-state');
    expect(res.status).toBe(200);
    expect(res.body.musicLabel).toBeNull();

    // No music-label row persisted for the auto-created game.
    const labels = await db.select().from(musicLabels).where(eq(musicLabels.gameId, res.body.id));
    expect(labels).toHaveLength(0);
  });

  it('auto-created game seeds NO executives (unlike POST /api/game)', async () => {
    const res = await request(app).get('/api/game-state');
    expect(res.status).toBe(200);
    const rows = await db.select().from(executives).where(eq(executives.gameId, res.body.id));
    expect(rows).toHaveLength(0);
  });

  it('returns the existing game (with its label) on a second call — no duplicate creation', async () => {
    const first = await request(app).get('/api/game-state');
    expect(first.status).toBe(200);

    const second = await request(app).get('/api/game-state');
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);

    const allGames = await db.select().from(gameStates).where(eq(gameStates.userId, TEST_USER_ID));
    expect(allGames).toHaveLength(1);
  });
});
