// @vitest-environment node
/**
 * Side-event-choice endpoint characterization test (Tier 2, PR-3).
 *
 * Pins the observable HTTP behavior of
 *   POST /api/game/:gameId/side-event-choice
 * (server/routes/artists.ts). Mirrors the ar-office / roles characterization
 * harness: real artistsRouter over supertest against the real test Postgres
 * (Docker, localhost:5433); Clerk auth mocked to a fixed user; server/db mocked
 * to a non-SSL pool at the test DB (the production pool forces SSL, which the
 * local container rejects). vi.mock hoisting requires the inlined connection
 * string.
 *
 * Behavior pinned:
 *   - happy path: applies effects_immediate (money to gameState, artist_energy
 *     to all signed artists), banks effects_delayed onto flags, clears
 *     pending_side_event, returns the applied-effects summary;
 *   - artist-scoped effects (artist_energy) apply to ALL signed artists
 *     (label-level / global-scope targeting resolution). No authored event uses
 *     artist_mood today, so the per-artist mood_event logging path is covered
 *     structurally by the same loop; the energy case asserts NO mood_event rows
 *     are written for a non-mood effect;
 *   - wrong/absent pending (wrong eventId, wrong week, none) → 409;
 *   - non-owner → 404 (requireGameOwner masks existence);
 *   - unknown choice → 400.
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
import { gameStates, users, artists, moodEvents } from '@shared/schema';
import { eq } from 'drizzle-orm';
import artistsRouter from '../../server/routes/artists';

let app: Express;

// A real authored event id + a choice with a known immediate/delayed shape.
// sync_offer / take_deal: effects_immediate.money = 20000, delayed rep + awareness.
const EVENT_ID = 'sync_offer';
const CHOICE_ID = 'take_deal';

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(artistsRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

async function seedGame(opts: {
  ownerId: string;
  currentWeek?: number;
  money?: number;
  flags?: Record<string, any>;
}) {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: opts.ownerId,
    currentWeek: opts.currentWeek ?? 5,
    money: opts.money ?? 100000,
    reputation: 10,
    creativeCapital: 5,
    flags: opts.flags ?? {},
  });
  return gameId;
}

async function seedArtist(gameId: string, mood = 50, energy = 50) {
  const artistId = crypto.randomUUID();
  await db.insert(artists).values({
    id: artistId,
    gameId,
    name: 'Test Artist',
    archetype: 'Workhorse',
    genre: 'pop',
    mood,
    energy,
  });
  return artistId;
}

async function readGame(gameId: string) {
  const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
  return gs;
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

describe('POST /api/game/:gameId/side-event-choice — concurrency (verifier finding F1)', () => {
  it('two concurrent resolutions of the same pending event apply effects exactly ONCE (FOR UPDATE serialization)', async () => {
    // F1: before the fix, both requests could pass the pending check off the
    // middleware's unlocked read and double-apply money (+20000 twice). The
    // FOR UPDATE row lock serializes them: the loser re-reads committed state,
    // finds pending_side_event cleared, and 409s.
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      currentWeek: 5,
      money: 100000,
      flags: { pending_side_event: { eventId: EVENT_ID, week: 5 } },
    });

    const [r1, r2] = await Promise.all([
      request(app).post(`/api/game/${gameId}/side-event-choice`).send({ eventId: EVENT_ID, choiceId: CHOICE_ID }),
      request(app).post(`/api/game/${gameId}/side-event-choice`).send({ eventId: EVENT_ID, choiceId: CHOICE_ID }),
    ]);

    expect([r1.status, r2.status].sort()).toEqual([200, 409]);

    const gs = await readGame(gameId);
    // take_deal immediate money is +20000 — applied exactly once.
    expect(gs.money).toBe(120000);
    const flags = gs.flags as any;
    expect(flags.pending_side_event).toBeUndefined();
    // exactly one banked delayed entry (deterministic key, so a double-apply
    // would not add a second key — the money assertion above is the real pin;
    // this one guards the bank shape stayed intact through the transaction).
    expect(Object.keys(flags).filter((k) => k.startsWith('side-event-'))).toHaveLength(1);
  });
});

describe('POST /api/game/:gameId/side-event-choice — happy path', () => {
  it('applies immediate money, banks delayed effects, clears pending, returns summary', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      currentWeek: 5,
      money: 100000,
      flags: { pending_side_event: { eventId: EVENT_ID, week: 5 } },
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/side-event-choice`)
      .send({ eventId: EVENT_ID, choiceId: CHOICE_ID });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.eventId).toBe(EVENT_ID);
    expect(res.body.choiceId).toBe(CHOICE_ID);
    // take_deal immediate: money 20000.
    expect(res.body.effects.money).toBe(20000);
    // delayed: reputation + awareness_boost (banked, not applied here).
    expect(Object.keys(res.body.delayedEffects).length).toBeGreaterThan(0);

    const gs = await readGame(gameId);
    expect(gs.money).toBe(120000);
    const flags = gs.flags as any;
    // pending cleared.
    expect(flags.pending_side_event).toBeUndefined();
    // a delayed-effect bank entry exists with triggerWeek = currentWeek + 1,
    // under a DETERMINISTIC week-based key — never Date.now() (flags land in
    // save snapshots; determinism discipline requires byte-identical state).
    const delayedKeys = Object.keys(flags).filter((k) => k.startsWith('side-event-'));
    expect(delayedKeys).toEqual([`side-event-${EVENT_ID}-${CHOICE_ID}-week5`]);
    expect(flags[delayedKeys[0]].triggerWeek).toBe(6);
  });

  it('artist_energy immediate applies to all signed artists', async () => {
    // pass choice on sync_offer: effects_immediate.artist_energy = 2.
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      currentWeek: 5,
      flags: { pending_side_event: { eventId: EVENT_ID, week: 5 } },
    });
    const a1 = await seedArtist(gameId, 50, 40);
    const a2 = await seedArtist(gameId, 50, 60);

    const res = await request(app)
      .post(`/api/game/${gameId}/side-event-choice`)
      .send({ eventId: EVENT_ID, choiceId: 'pass' });

    expect(res.status).toBe(200);
    expect(res.body.effects.artist_energy).toBe(2);

    const [r1] = await db.select().from(artists).where(eq(artists.id, a1));
    const [r2] = await db.select().from(artists).where(eq(artists.id, a2));
    expect(r1.energy).toBe(42);
    expect(r2.energy).toBe(62);

    // Energy is not mood: NO mood_event rows are logged for this choice.
    const moods = await db.select().from(moodEvents).where(eq(moodEvents.gameId, gameId));
    expect(moods).toHaveLength(0);
  });
});

describe('POST /api/game/:gameId/side-event-choice — validation', () => {
  it('no pending event → 409', async () => {
    const gameId = await seedGame({ ownerId: TEST_USER_ID, currentWeek: 5, flags: {} });
    const res = await request(app)
      .post(`/api/game/${gameId}/side-event-choice`)
      .send({ eventId: EVENT_ID, choiceId: CHOICE_ID });
    expect(res.status).toBe(409);
  });

  it('pending for a DIFFERENT event → 409', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      currentWeek: 5,
      flags: { pending_side_event: { eventId: 'copyright_claim', week: 5 } },
    });
    const res = await request(app)
      .post(`/api/game/${gameId}/side-event-choice`)
      .send({ eventId: EVENT_ID, choiceId: CHOICE_ID });
    expect(res.status).toBe(409);
  });

  it('pending from a PRIOR week (not current) → 409', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      currentWeek: 6,
      flags: { pending_side_event: { eventId: EVENT_ID, week: 5 } },
    });
    const res = await request(app)
      .post(`/api/game/${gameId}/side-event-choice`)
      .send({ eventId: EVENT_ID, choiceId: CHOICE_ID });
    expect(res.status).toBe(409);
  });

  it('unknown choice id → 400', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      currentWeek: 5,
      flags: { pending_side_event: { eventId: EVENT_ID, week: 5 } },
    });
    const res = await request(app)
      .post(`/api/game/${gameId}/side-event-choice`)
      .send({ eventId: EVENT_ID, choiceId: 'no_such_choice' });
    expect(res.status).toBe(400);
  });

  it('missing body fields → 400', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      currentWeek: 5,
      flags: { pending_side_event: { eventId: EVENT_ID, week: 5 } },
    });
    const res = await request(app).post(`/api/game/${gameId}/side-event-choice`).send({});
    expect(res.status).toBe(400);
  });

  it('non-owner → 404 (requireGameOwner masks existence)', async () => {
    const gameId = await seedGame({
      ownerId: OTHER_USER_ID,
      currentWeek: 5,
      flags: { pending_side_event: { eventId: EVENT_ID, week: 5 } },
    });
    currentUserId = TEST_USER_ID; // impersonate non-owner
    const res = await request(app)
      .post(`/api/game/${gameId}/side-event-choice`)
      .send({ eventId: EVENT_ID, choiceId: CHOICE_ID });
    expect(res.status).toBe(404);
  });
});
