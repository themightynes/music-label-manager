// @vitest-environment node
/**
 * Mandatory Side Events ("Crisis on the Desk") — HTTP characterization.
 *
 * Pins the observable behavior of the advance-week gate + the config endpoint
 * introduced for the mandatory side-events feature:
 *   - POST /api/advance-week 400 PENDING_SIDE_EVENT when a crisis is pending and
 *     no (or an invalid) resolution is supplied.
 *   - POST /api/advance-week 200 when a valid resolution rides the payload: the
 *     crisis clears, immediate effects apply during the advance, and the week
 *     advances.
 *   - GET /api/config/side-events surfaces the kill-switch.
 *
 * Harness copied from advance-week.characterization.test.ts (real gameLoop +
 * games routers over supertest against the Docker test Postgres on 5433).
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
import crypto from 'crypto';
import { db } from '../../server/db';
import { serverGameData } from '../../server/data/gameData';
import { gameStates, users, artists, executives } from '@shared/schema';
import gameLoopRouter from '../../server/routes/gameLoop';
import gamesRouter from '../../server/routes/games';

// A real authored event + choice from data/events.json.
const EVENT_ID = 'sync_offer';
const CHOICE_ID = 'take_deal'; // effects_immediate: { money: 20000 }

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(gameLoopRouter);
  app.use(gamesRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

async function seedGameWithPendingCrisis(opts: { pending?: boolean; currentWeek?: number } = {}) {
  const gameId = crypto.randomUUID();
  const week = opts.currentWeek ?? 5;
  await db.insert(gameStates).values({
    id: gameId,
    userId: TEST_USER_ID,
    currentWeek: week,
    money: 100000,
    reputation: 10,
    creativeCapital: 5,
    focusSlots: 3,
    usedFocusSlots: 0,
    venueAccess: 'clubs',
    campaignCompleted: false,
    flags: opts.pending
      ? { pending_side_event: { eventId: EVENT_ID, week, prompt: 'x', category: 'sync_licensing', choices: [] } }
      : {},
  });
  await db.insert(artists).values({
    id: crypto.randomUUID(),
    gameId,
    name: 'Test Artist',
    archetype: 'Workhorse',
    genre: 'pop',
    mood: 50,
    energy: 50,
    popularity: 40,
  });
  await db.insert(executives).values([
    { id: crypto.randomUUID(), gameId, role: 'head_ar', level: 1, mood: 50, loyalty: 50 },
    { id: crypto.randomUUID(), gameId, role: 'cmo', level: 1, mood: 50, loyalty: 50 },
  ]);
  return gameId;
}

beforeEach(async () => {
  currentUserId = TEST_USER_ID;
  await db.execute(
    (await import('drizzle-orm')).sql`TRUNCATE TABLE users, game_states RESTART IDENTITY CASCADE`
  );
  await db.insert(users).values([
    { id: TEST_USER_ID, clerkId: 'clerk_test_user', email: 'test@example.com', username: 'tester' },
  ]);
});

describe('Mandatory Side Events — advance-week gate', () => {
  it('blocks the advance with 400 PENDING_SIDE_EVENT when a crisis is pending and no resolution is sent', async () => {
    const gameId = await seedGameWithPendingCrisis({ pending: true, currentWeek: 5 });

    const res = await request(app)
      .post('/api/advance-week')
      .send({ gameId, selectedActions: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PENDING_SIDE_EVENT');
    expect(res.body.eventId).toBe(EVENT_ID);

    // Week did NOT advance.
    const { eq } = await import('drizzle-orm');
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.currentWeek).toBe(5);
    expect((gs.flags as any).pending_side_event).toBeTruthy();
  });

  it('blocks with 400 when the resolution eventId/choiceId does not match the pending crisis', async () => {
    const gameId = await seedGameWithPendingCrisis({ pending: true, currentWeek: 5 });

    const res = await request(app)
      .post('/api/advance-week')
      .send({ gameId, selectedActions: [], sideEventChoice: { eventId: EVENT_ID, choiceId: 'not_a_real_choice' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PENDING_SIDE_EVENT');
  });

  it('advances with 200 when a valid resolution rides the payload: crisis clears + money applied', async () => {
    const gameId = await seedGameWithPendingCrisis({ pending: true, currentWeek: 5 });

    // DETERMINISM: suppress the weekly side-event roll for this advance. With the
    // real weekly_chance (0.20) and a random gameId (no pinned rngSeed), ~1 in 5
    // resolve-advances would legitimately roll a NEW crisis in the same advance,
    // and the strict pending_side_event toBeUndefined below would flake. Same
    // pattern as the golden-master sideEventResolve fixture: isolate the
    // resolution path from a fresh roll.
    const eventConfigSpy = vi
      .spyOn(serverGameData, 'getEventConfigSync')
      .mockReturnValue({ weekly_chance: 0, cooldown_weeks: 2, max_per_year: 12 });
    try {
      const res = await request(app)
        .post('/api/advance-week')
        .send({ gameId, selectedActions: [], sideEventChoice: { eventId: EVENT_ID, choiceId: CHOICE_ID } });

      expect(res.status).toBe(200);
      expect(res.body.gameState.currentWeek).toBe(6);

      const { eq } = await import('drizzle-orm');
      const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
      expect(gs.currentWeek).toBe(6);
      // Pending cleared.
      expect((gs.flags as any).pending_side_event).toBeUndefined();
      // Immediate +20000 applied during the advance (money = 100000 + 20000 - weekly burn).
      expect(gs.money).toBeGreaterThan(100000);
    } finally {
      eventConfigSpy.mockRestore();
    }
  });

  it('orphaned pending event (id deleted from data): advance proceeds, engine self-heals the flag, no effects applied', async () => {
    // Seed a pending crisis whose eventId does not exist in data/events.json —
    // simulates a Content Editor deletion between defer and resolve. The gate
    // must NOT deadlock the run on a permanent 400: it lets the advance proceed
    // (forwarding a synthetic resolution) and the engine's self-heal clears the
    // orphaned flag without effects.
    const ORPHANED_ID = 'deleted_via_content_editor';
    const gameId = crypto.randomUUID();
    await db.insert(gameStates).values({
      id: gameId,
      userId: TEST_USER_ID,
      currentWeek: 5,
      money: 100000,
      reputation: 10,
      creativeCapital: 5,
      focusSlots: 3,
      usedFocusSlots: 0,
      venueAccess: 'clubs',
      campaignCompleted: false,
      flags: { pending_side_event: { eventId: ORPHANED_ID, week: 5, prompt: 'x', category: 'sync_licensing', choices: [] } },
    });
    await db.insert(artists).values({
      id: crypto.randomUUID(),
      gameId,
      name: 'Test Artist',
      archetype: 'Workhorse',
      genre: 'pop',
      mood: 50,
      energy: 50,
      popularity: 40,
    });
    await db.insert(executives).values([
      { id: crypto.randomUUID(), gameId, role: 'head_ar', level: 1, mood: 50, loyalty: 50 },
    ]);

    // Suppress the weekly roll (determinism — see the resolve test above).
    const eventConfigSpy = vi
      .spyOn(serverGameData, 'getEventConfigSync')
      .mockReturnValue({ weekly_chance: 0, cooldown_weeks: 2, max_per_year: 12 });
    try {
      // No sideEventChoice sent — the player CANNOT pick for a deleted event.
      const res = await request(app)
        .post('/api/advance-week')
        .send({ gameId, selectedActions: [] });

      expect(res.status).toBe(200);
      expect(res.body.gameState.currentWeek).toBe(6);

      const { eq } = await import('drizzle-orm');
      const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
      expect(gs.currentWeek).toBe(6);
      // Orphaned flag cleared by the engine self-heal.
      expect((gs.flags as any).pending_side_event).toBeUndefined();
      // No side-event effects applied: money only moved by normal weekly costs
      // (never up — the orphaned event granted nothing).
      expect(gs.money).toBeLessThanOrEqual(100000);
    } finally {
      eventConfigSpy.mockRestore();
    }
  });

  it('advances normally (no gate) when no crisis is pending', async () => {
    const gameId = await seedGameWithPendingCrisis({ pending: false, currentWeek: 5 });

    const res = await request(app)
      .post('/api/advance-week')
      .send({ gameId, selectedActions: [] });

    expect(res.status).toBe(200);
    expect(res.body.gameState.currentWeek).toBe(6);
  });
});

describe('Mandatory Side Events — config endpoint', () => {
  it('GET /api/config/side-events returns the kill-switch (default ON)', async () => {
    const res = await request(app).get('/api/config/side-events');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('mandatory');
    expect(res.body.mandatory).toBe(true);
  });
});
