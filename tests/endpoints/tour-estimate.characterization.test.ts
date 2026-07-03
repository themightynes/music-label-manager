// @vitest-environment node
/**
 * Tour-estimate characterization test (Phase 2 engine-seams PR-7).
 *
 * POST /api/tour/estimate (server/routes/tour.ts) had NO happy-path coverage —
 * the only prior pin (sweep-migrations.characterization.test.ts) asserted the
 * requireGameOwner 404/400 auth envelope, never the response body. PR-7's Part 2
 * investigation concluded the estimate route and the engine's tour path are
 * ALREADY unified: both assemble a `TourCalculationParams` object and call the
 * single FinancialSystem entry point `calculateDetailedTourBreakdown`, then read
 * fields off the returned `DetailedTourBreakdown`. There is no duplicated tour
 * math to extract. This test pins the full happy-path estimate response so that
 * conclusion is protected — any future "unification" refactor that shifts a
 * number is caught here.
 *
 * DETERMINISM: the route's FinancialSystem is seeded with `() => Math.random()`,
 * but RNG is only reachable through the tier-capacity fallback
 * (`generateCapacityFromTier`, taken when venueCapacity is 0/absent). Since the
 * C46 fix, an explicit `venueCapacity` also drives `totalBudget` (via
 * `calculateTourCostsWithCapacity`), so with an explicit in-range capacity the
 * ENTIRE response — including `totalBudget` and `canAfford` — is deterministic
 * and pinned exactly. `totalBudget` is also coherent with
 * `breakdown.totalCosts`: both are fixed fees for the chosen capacity plus the
 * marketing budget. (Pre-C46, `totalBudget` drew a fresh random tier capacity
 * on every call and varied run-to-run even for identical inputs — and the
 * client passes it back as the tour's charged totalCost at creation.)
 *
 * C47 is pinned by the second test: the route defaults `artistPopularity` to 50
 * (matching TourProcessor's execution-path `artist.popularity || 50`), so an
 * artist with unset/zero popularity estimates identically to a popularity-50
 * artist instead of diverging from the executed tour.
 *
 * Harness mirrors projects-create.characterization.test.ts: real tour router over
 * supertest against the Docker test Postgres (localhost:5433), server/db mocked to
 * a non-SSL pool, server/auth mocked to a fixed owner user. gameId travels in the
 * body (requireGameOwner's body fallback resolves it).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Must be set before any module that reads DATABASE_URL at import time.
const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Fixed clerk id / resolved userId for the mocked authenticated user (owner).
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';

// --- Mock server/db with a non-SSL pool at the test DB (production pool forces
//     SSL, which the local test container rejects). storage.ts imports `db` from
//     ./db, so this single mock reroutes storage + middleware.
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

// --- Mock server/auth so requireClerkUser injects the fixed test userId.
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
import { gameStates, users, artists } from '@shared/schema';
import { sql } from 'drizzle-orm';
import tourRouter from '../../server/routes/tour';

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(tourRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

/**
 * Seed a game (owned by TEST_USER_ID) + one artist with fixed popularity, so the
 * estimate is deterministic. venueAccess:'clubs' (capacity range [50,500]) and
 * reputation are pinned for reproducible sell-through math.
 */
async function seedGame() {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: TEST_USER_ID,
    currentWeek: 5,
    money: 500000,
    reputation: 40,
    venueAccess: 'clubs',
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
    popularity: 60,
  });

  return { gameId, artistId };
}

beforeEach(async () => {
  await db.execute(sql`TRUNCATE TABLE users, game_states RESTART IDENTITY CASCADE`);
  await db.insert(users).values([
    { id: TEST_USER_ID, clerkId: 'clerk_test_user', email: 'test@example.com', username: 'tester' },
  ]);
});

describe('POST /api/tour/estimate (characterization)', () => {
  it('happy path: pins the full estimate response body for an explicit venue capacity (deterministic, no RNG)', async () => {
    const { gameId, artistId } = await seedGame();

    const res = await request(app)
      .post('/api/tour/estimate')
      .send({
        artistId,
        cities: 3,
        budgetPerCity: 2000,
        gameId,
        venueCapacity: 400, // explicit, in clubs range -> NO tier-fallback RNG draw
      });

    expect(res.status).toBe(200);

    // Structural pins: every field the client consumes must be present.
    expect(res.body).toHaveProperty('estimatedRevenue');
    expect(res.body).toHaveProperty('totalCosts');
    expect(res.body).toHaveProperty('estimatedProfit');
    expect(res.body).toHaveProperty('roi');
    expect(res.body).toHaveProperty('canAfford');
    expect(res.body).toHaveProperty('totalBudget');
    expect(res.body).toHaveProperty('breakdown');
    expect(res.body).toHaveProperty('sellThroughRate');
    expect(res.body).toHaveProperty('cities');
    expect(res.body).toHaveProperty('sellThroughAnalysis');
    expect(res.body).toHaveProperty('venueCapacity');
    expect(res.body).toHaveProperty('selectedCapacity');
    expect(res.body).toHaveProperty('tierRange');
    expect(res.body).toHaveProperty('pricePerTicket');
    expect(res.body).toHaveProperty('playerTier');
    expect(res.body).toHaveProperty('venueCategory');

    expect(res.body.playerTier).toBe('clubs');
    expect(res.body.venueCapacity).toBe(400);
    expect(res.body.selectedCapacity).toBe(400);
    expect(res.body.cities).toHaveLength(3);

    // C46: with an explicit capacity, totalBudget is deterministic and must
    // agree with the detailed breakdown's total (fixed fees for THIS capacity
    // + marketing budget) — no tier-RNG draw. capacity 400 → (1600 venue +
    // 1080 production) × 3 cities + $6,000 marketing = $14,040.
    expect(res.body.totalBudget).toBe(14040);
    expect(res.body.totalBudget).toBe(res.body.breakdown.totalCosts);
    expect(res.body.canAfford).toBe(true); // $14,040 vs $500,000

    // Byte-identical value pin of the full response — everything the tour math
    // produces (revenue, sell-through, per-city economics, cost breakdown,
    // pricing, budget totals) is deterministic with an explicit capacity.
    // Any refactor that shifts a tour number breaks here.
    expect(res.body).toMatchSnapshot();
  });

  it('C47: an artist with zero/unset popularity estimates identically to a popularity-50 artist (engine default parity)', async () => {
    const { gameId } = await seedGame();

    const zeroPopArtistId = crypto.randomUUID();
    const fiftyPopArtistId = crypto.randomUUID();
    await db.insert(artists).values([
      { id: zeroPopArtistId, gameId, name: 'Unknown Artist', archetype: 'Visionary', popularity: 0 },
      { id: fiftyPopArtistId, gameId, name: 'Baseline Artist', archetype: 'Visionary', popularity: 50 },
    ]);

    const estimateFor = async (artistId: string) => {
      const res = await request(app)
        .post('/api/tour/estimate')
        .send({ artistId, cities: 2, budgetPerCity: 1500, gameId, venueCapacity: 300 });
      expect(res.status).toBe(200);
      return res.body;
    };

    const zeroPop = await estimateFor(zeroPopArtistId);
    const fiftyPop = await estimateFor(fiftyPopArtistId);

    // TourProcessor.processUnifiedTourRevenue uses `artist.popularity || 50` at
    // execution; the estimate route must assume the same default or the preview
    // diverges from the executed tour for the same artist.
    expect(zeroPop).toEqual(fiftyPop);
  });
});
