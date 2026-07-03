// @vitest-environment node
/**
 * Artist-signing characterization test (Phase 1, PR-18).
 *
 * The sign-artist route (POST /api/game/:gameId/artists) plus artist-dialogue
 * and mood-events had no HTTP-layer coverage. This file pins the observable
 * behavior of the CURRENT (pre-extraction) handlers BEFORE they are extracted
 * into artistService and hardened (server-derived costs, requireGameOwner,
 * roster cap, atomic transaction), so the extraction can be proven
 * behavior-preserving where intended and the deliberate flips are explicit.
 *
 * It drives the real artists router over supertest against the real test
 * Postgres (Docker, localhost:5433). Clerk auth is mocked to a fixed test user;
 * server/db is mocked to a non-SSL pool pointed at the test DB (the production
 * pool forces SSL, which the local test container rejects).
 *
 * The blocks tagged "(post-hardening)" only pass AFTER Commit 2 lands. They are
 * kept in this same file per the PR-17/18 pattern; run them against hardened code.
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
import {
  gameStates,
  users,
  artists,
  emails,
  moodEvents,
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import artistsRouter from '../../server/routes/artists';

let app: Express;

// A known JSON artist (data/artists.json → art_1 Nova Sterling).
const KNOWN_ARTIST = {
  id: 'art_1',
  name: 'Nova Sterling',
  archetype: 'Visionary',
  talent: 85,
  popularity: 10,
  genre: 'Pop',
  signingCost: 8000,
  weeklyCost: 1200,
};

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(artistsRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

/** Seed a game owned by ownerId, optionally pre-populating the discovered pool
 *  with the given discovered records. Returns the gameId. */
async function seedGame(opts: {
  ownerId: string;
  money?: number;
  currentWeek?: number;
  discovered?: any[];
  extraFlags?: Record<string, any>;
}) {
  const gameId = crypto.randomUUID();
  const flags: Record<string, any> = { ...(opts.extraFlags ?? {}) };
  if (opts.discovered) flags.ar_office_discovered_artists = opts.discovered;
  await db.insert(gameStates).values({
    id: gameId,
    userId: opts.ownerId,
    currentWeek: opts.currentWeek ?? 1,
    money: opts.money ?? 100000,
    reputation: 0,
    creativeCapital: 5,
    flags,
  });
  return gameId;
}

/** Insert a signed artist row directly (for roster-cap / dup-name seeding). */
async function seedSignedArtist(gameId: string, name: string) {
  const artistId = crypto.randomUUID();
  await db.insert(artists).values({
    id: artistId,
    gameId,
    name,
    archetype: 'Workhorse',
    genre: 'pop',
    mood: 50,
    energy: 50,
  });
  return artistId;
}

/** The real payload gameStore.signArtist posts: the whole discovered artist
 *  record spread, plus signedWeek/signed. */
function clientSignPayload(discovered: any, overrides: Record<string, any> = {}) {
  return {
    ...discovered,
    signedWeek: 1,
    signed: true,
    ...overrides,
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

// ===========================================================================
// CURRENT behavior (pins). Some pins are intentionally flipped by Commit 2;
// where flipped, the pre-hardening expectation is called out in a comment.
// ===========================================================================
describe('POST /api/game/:gameId/artists — sign (characterization)', () => {
  it('happy path: creates artist, deducts signingCost, removes from discovered, appends pending_signing_fees', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      money: 100000,
      discovered: [KNOWN_ARTIST],
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/artists`)
      .send(clientSignPayload(KNOWN_ARTIST, { signingCost: 8000 }));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nova Sterling');
    expect(res.body.gameId).toBe(gameId);
    expect(res.body.id).toBeTruthy();

    // Artist row created.
    const roster = await db.select().from(artists).where(eq(artists.gameId, gameId));
    expect(roster).toHaveLength(1);
    expect(roster[0].name).toBe('Nova Sterling');

    // Money deducted by the derived cost (8000). Pre-hardening this equalled
    // the client-sent signingCost; post-hardening it is server-derived — for
    // this artist both are 8000, so the assertion holds across the flip.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(92000);

    // Removed from discovered pool.
    const flags = gs.flags as any;
    expect(flags.ar_office_discovered_artists).toEqual([]);

    // pending_signing_fees appended.
    expect(Array.isArray(flags.pending_signing_fees)).toBe(true);
    expect(flags.pending_signing_fees).toHaveLength(1);
    expect(flags.pending_signing_fees[0]).toMatchObject({
      name: 'Nova Sterling',
      amount: 8000,
      week: 1,
    });

    // Welcome email row created.
    const emailRows = await db.select().from(emails).where(eq(emails.gameId, gameId));
    expect(emailRows).toHaveLength(1);
    expect(emailRows[0].category).toBe('ar');
    expect(emailRows[0].subject).toContain('Nova Sterling');
  });

  it('409 DUPLICATE_ARTIST on case-insensitive duplicate name', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      money: 100000,
      discovered: [KNOWN_ARTIST],
    });
    await seedSignedArtist(gameId, 'nova sterling'); // lower-case existing

    const res = await request(app)
      .post(`/api/game/${gameId}/artists`)
      .send(clientSignPayload(KNOWN_ARTIST, { signingCost: 8000 }));

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_ARTIST');
  });

  it('400 insufficient funds when money < derived cost', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      money: 1000, // less than 8000 derived cost
      discovered: [KNOWN_ARTIST],
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/artists`)
      .send(clientSignPayload(KNOWN_ARTIST, { signingCost: 8000 }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient funds/i);

    // No artist created.
    const roster = await db.select().from(artists).where(eq(artists.gameId, gameId));
    expect(roster).toHaveLength(0);
  });
});

describe('GET /api/game/:gameId/mood-events (characterization)', () => {
  it('happy path: returns mood events for the owned game', async () => {
    const gameId = await seedGame({ ownerId: TEST_USER_ID });
    const artistId = await seedSignedArtist(gameId, 'Moody Artist');
    await db.insert(moodEvents).values({
      gameId,
      artistId,
      eventType: 'release_success',
      moodChange: 5,
      moodBefore: 50,
      moodAfter: 55,
      description: 'A hit release',
      weekOccurred: 1,
    });

    const res = await request(app).get(`/api/game/${gameId}/mood-events`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].eventType).toBe('release_success');
  });

  it('rejects access to a game owned by another user', async () => {
    // Pre-hardening: inline check returns 403 UNAUTHORIZED.
    // Post-hardening: requireGameOwner returns 404 GAME_NOT_FOUND.
    const gameId = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID; // impersonate non-owner

    const res = await request(app).get(`/api/game/${gameId}/mood-events`);
    expect([403, 404]).toContain(res.status);
  });
});

describe('POST /api/game/:gameId/artist-dialogue (characterization)', () => {
  it('404 when the artist is unknown', async () => {
    const gameId = await seedGame({ ownerId: TEST_USER_ID });

    const res = await request(app)
      .post(`/api/game/${gameId}/artist-dialogue`)
      .send({
        artistId: crypto.randomUUID(),
        sceneId: 'some_scene',
        choiceId: 'some_choice',
      });

    // Unknown artist → 404 Artist not found (validated before dialogue lookup).
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Post-hardening behavior (Commit 2). These assert the NEW ownership +
// server-derived-cost + roster-cap + discovered-pool validation. They only
// pass against the hardened code.
// ---------------------------------------------------------------------------
describe('sign hardening (post-hardening)', () => {
  it('404 GAME_NOT_FOUND when signing into a game owned by another user', async () => {
    const gameId = await seedGame({
      ownerId: OTHER_USER_ID,
      money: 100000,
      discovered: [KNOWN_ARTIST],
    });
    currentUserId = TEST_USER_ID; // impersonate non-owner

    const res = await request(app)
      .post(`/api/game/${gameId}/artists`)
      .send(clientSignPayload(KNOWN_ARTIST, { signingCost: 8000 }));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');

    // Victim untouched.
    const roster = await db.select().from(artists).where(eq(artists.gameId, gameId));
    expect(roster).toHaveLength(0);
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(100000);
  });

  it('ignores a client-sent (too-low) signingCost and deducts the derived cost', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      money: 100000,
      discovered: [KNOWN_ARTIST],
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/artists`)
      .send(clientSignPayload(KNOWN_ARTIST, { signingCost: 0 })); // attacker: free signing

    expect(res.status).toBe(200);

    // Derived cost (8000 from data/artists.json) deducted, NOT the client's 0.
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(92000);
    const flags = gs.flags as any;
    expect(flags.pending_signing_fees[0].amount).toBe(8000);
  });

  it('$0/free signing is no longer possible via omitted cost — derived cost applies', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      money: 100000,
      discovered: [KNOWN_ARTIST],
    });

    const payload = clientSignPayload(KNOWN_ARTIST);
    delete (payload as any).signingCost; // omit entirely

    const res = await request(app)
      .post(`/api/game/${gameId}/artists`)
      .send(payload);

    expect(res.status).toBe(200);
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(92000); // 8000 derived cost still charged
  });

  it('ignores client-sent talent/popularity and derives them server-side', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      money: 100000,
      discovered: [KNOWN_ARTIST],
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/artists`)
      .send(clientSignPayload(KNOWN_ARTIST, { talent: 100, popularity: 100, weeklyCost: 1 }));

    expect(res.status).toBe(200);
    const [row] = await db.select().from(artists).where(eq(artists.gameId, gameId));
    // Derived from data/artists.json (talent 85, popularity 10, weeklyCost 1200).
    expect(row.talent).toBe(85);
    expect(row.popularity).toBe(10);
    expect(row.weeklyCost).toBe(1200);
  });

  it('409 ROSTER_FULL when the roster already has 3 artists', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      money: 100000,
      discovered: [KNOWN_ARTIST],
    });
    await seedSignedArtist(gameId, 'A One');
    await seedSignedArtist(gameId, 'A Two');
    await seedSignedArtist(gameId, 'A Three');

    const res = await request(app)
      .post(`/api/game/${gameId}/artists`)
      .send(clientSignPayload(KNOWN_ARTIST, { signingCost: 8000 }));

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ROSTER_FULL');

    // No 4th artist, money untouched.
    const roster = await db.select().from(artists).where(eq(artists.gameId, gameId));
    expect(roster).toHaveLength(3);
    const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
    expect(gs.money).toBe(100000);
  });

  it('400 ARTIST_NOT_DISCOVERED when the artist is not in the discovered pool', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      money: 100000,
      discovered: [], // empty pool
    });

    const res = await request(app)
      .post(`/api/game/${gameId}/artists`)
      .send(clientSignPayload(KNOWN_ARTIST, { signingCost: 8000 }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ARTIST_NOT_DISCOVERED');

    const roster = await db.select().from(artists).where(eq(artists.gameId, gameId));
    expect(roster).toHaveLength(0);
  });

  it('dialogue: 404 GAME_NOT_FOUND when the game belongs to another user', async () => {
    const gameId = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;

    const res = await request(app)
      .post(`/api/game/${gameId}/artist-dialogue`)
      .send({ artistId: crypto.randomUUID(), sceneId: 's', choiceId: 'c' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });

  it('mood-events: 404 GAME_NOT_FOUND when the game belongs to another user', async () => {
    const gameId = await seedGame({ ownerId: OTHER_USER_ID });
    currentUserId = TEST_USER_ID;

    const res = await request(app).get(`/api/game/${gameId}/mood-events`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });
});
