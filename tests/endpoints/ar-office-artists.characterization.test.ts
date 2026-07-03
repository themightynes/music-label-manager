// @vitest-environment node
/**
 * A&R discovered-artists GET characterization test (Phase 2, PR-4).
 *
 * The GET /api/game/:gameId/ar-office/artists handler had no HTTP-layer
 * coverage. It currently carries three response paths plus a state-mutating
 * fallback:
 *   - the canonical `flags.ar_office_discovered_artists` array (enriched from
 *     data/artists.json, filtered by signed-name),
 *   - an in-GET MIGRATION WRITE that copies the legacy singular keys
 *     (ar_office_discovered_artist_id/_info) into the array and persists it,
 *   - a legacy singular-key branch, and
 *   - a `Math.random()` FALLBACK that picks a random artist and WRITES it back
 *     to flags (a GET with side effects + unseeded RNG).
 *
 * This file pins the observable behavior of the CURRENT handler BEFORE it is
 * collapsed into a pure read over the canonical array (PR-4 Commit 2). The
 * blocks tagged "(post-pure-read)" only pass AFTER Commit 2 lands; they assert
 * the new pure-read behavior (legacy-only → empty, no-flags → empty + NO
 * write). Both the pre- and post- pins live in this one file per the PR-17/18
 * pattern; the pre-pins for the migration/legacy/random paths are commented out
 * (not deleted) after the flip so the sanctioned behavior change is explicit.
 *
 * It drives the real arOffice router over supertest against the real test
 * Postgres (Docker, localhost:5433). Clerk auth is mocked to a fixed test user;
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
//     `db` from ./db, and requireGameOwner imports `db` from ./db too, so this
//     single mock reroutes storage + middleware + handler.
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
import { gameStates, users, artists } from '@shared/schema';
import { eq } from 'drizzle-orm';
import arOfficeRouter from '../../server/routes/arOffice';

let app: Express;

// A known JSON artist (data/artists.json → art_1 Nova Sterling), used to assert
// the enrichment shape of the canonical branch.
const KNOWN_JSON_ID = 'art_1';

/** A canonical discovered record, as the engine appends it to the array. */
const DISCOVERED_ART_1 = {
  id: KNOWN_JSON_ID,
  name: 'Nova Sterling',
  archetype: 'Visionary',
  talent: 85,
  popularity: 10,
  genre: 'Pop',
  discoveryTime: 3,
  sourcingType: 'active',
  genreUsed: null,
};

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(arOfficeRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

/** Seed a game owned by ownerId with the given flags. Returns the gameId. */
async function seedGame(opts: {
  ownerId: string;
  flags?: Record<string, any>;
  arOfficeSlotUsed?: boolean;
}) {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: opts.ownerId,
    currentWeek: 5,
    money: 100000,
    reputation: 0,
    creativeCapital: 5,
    arOfficeSlotUsed: opts.arOfficeSlotUsed ?? false,
    flags: opts.flags ?? {},
  });
  return gameId;
}

/** Insert a signed artist row (used to exercise signed-name exclusion). */
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

async function readFlags(gameId: string) {
  const [gs] = await db.select().from(gameStates).where(eq(gameStates.id, gameId));
  return (gs?.flags ?? {}) as any;
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
// Behavior stable across the flip (pins hold pre- AND post-pure-read).
// ===========================================================================
describe('GET /api/game/:gameId/ar-office/artists — stable behavior', () => {
  it('(a) canonical array: enriches from data/artists.json with discovery metadata', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      flags: {
        ar_office_discovered_artists: [DISCOVERED_ART_1],
        ar_office_discovery_time: 3,
        ar_office_sourcing_type: 'active',
      },
    });

    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.artists)).toBe(true);
    expect(res.body.artists).toHaveLength(1);

    const a = res.body.artists[0];
    // Enriched from the full JSON record (talent 85, weeklyCost 1200, bio, etc.)
    expect(a.id).toBe(KNOWN_JSON_ID);
    expect(a.name).toBe('Nova Sterling');
    expect(a.talent).toBe(85);
    expect(a.weeklyCost).toBe(1200);
    expect(a.signingCost).toBe(8000);
    // Discovery metadata merged in from the discovered record.
    expect(a.discoveryTime).toBe(3);
    expect(a.discoveredVia).toBe('active');

    expect(res.body.metadata.isDiscoveredCollection).toBe(true);
    expect(res.body.metadata.totalDiscovered).toBe(1);
  });

  it('(a2) canonical array: excludes artists already signed to this game by name', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      flags: { ar_office_discovered_artists: [DISCOVERED_ART_1] },
    });
    // Sign an artist with the same (case-insensitive) name as the discovered one.
    await seedSignedArtist(gameId, 'nova sterling');

    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);

    expect(res.status).toBe(200);
    expect(res.body.artists).toHaveLength(0);
  });

  it('(b) empty pool: no discovered flags → empty list', async () => {
    const gameId = await seedGame({ ownerId: TEST_USER_ID, flags: {} });

    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);

    expect(res.status).toBe(200);
    expect(res.body.artists).toEqual([]);
  });

  it('operation active: returns empty list with operationActive metadata', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      arOfficeSlotUsed: true,
      flags: { arOfficeSourcingType: 'active' },
    });

    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);

    expect(res.status).toBe(200);
    expect(res.body.artists).toEqual([]);
    expect(res.body.metadata.operationActive).toBe(true);
  });

  it('(e) cross-tenant: 404 GAME_NOT_FOUND when the game belongs to another user', async () => {
    const gameId = await seedGame({
      ownerId: OTHER_USER_ID,
      flags: { ar_office_discovered_artists: [DISCOVERED_ART_1] },
    });
    currentUserId = TEST_USER_ID; // impersonate non-owner

    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('GAME_NOT_FOUND');
  });
});

// ===========================================================================
// CURRENT (pre-pure-read) behavior for the legacy paths. These pins document
// the migration write, the legacy singular branch, and the random-write
// fallback. Commit 2 FLIPS them — after the flip they are replaced by the
// "(post-pure-read)" block below. Kept commented (not deleted) so the
// sanctioned behavior change is explicit in the diff.
// ===========================================================================
describe.skip('LEGACY paths — CURRENT behavior (pre-pure-read; flipped by Commit 2)', () => {
  it('(c) legacy-only flags: migrates singular keys into the array, persists, and returns the enriched artist', async () => {
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      flags: {
        ar_office_discovered_artist_id: KNOWN_JSON_ID,
        ar_office_discovered_artist_info: {
          name: 'Nova Sterling',
          archetype: 'Visionary',
          talent: 85,
          popularity: 10,
          genre: 'Pop',
        },
        ar_office_discovery_time: 3,
        ar_office_sourcing_type: 'active',
      },
    });

    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);

    expect(res.status).toBe(200);
    expect(res.body.artists).toHaveLength(1);
    expect(res.body.artists[0].name).toBe('Nova Sterling');

    // MIGRATION WRITE: the singular keys were copied into the array and persisted.
    const flags = await readFlags(gameId);
    expect(Array.isArray(flags.ar_office_discovered_artists)).toBe(true);
    expect(flags.ar_office_discovered_artists).toHaveLength(1);
    expect(flags.ar_office_discovered_artists[0].id).toBe(KNOWN_JSON_ID);
  });

  it('(d) unknown legacy id, NO info: Math.random() fallback picks an artist AND writes it back to flags', async () => {
    // A legacy id that does NOT exist in data/artists.json, with NO _info blob
    // (so the migration branch is skipped), falls through to the legacy branch
    // and then the Math.random() fallback, which WRITES a new random id back to
    // flags — a GET with a side effect. Pinned loosely: status + that a write
    // occurred (the artist itself is random and not asserted).
    const gameId = await seedGame({
      ownerId: TEST_USER_ID,
      flags: {
        ar_office_discovered_artist_id: 'art_does_not_exist',
      },
    });

    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);

    expect(res.status).toBe(200);
    // A random artist was returned (pinned loosely: exactly one, and it is a fallback).
    expect(res.body.artists).toHaveLength(1);
    expect(res.body.metadata.isFallback).toBe(true);

    // SIDE EFFECT: the fallback wrote a (random) artist id back to flags.
    const flags = await readFlags(gameId);
    expect(flags.ar_office_discovered_artist_id).toBeTruthy();
    expect(flags.ar_office_discovered_artist_id).not.toBe('art_does_not_exist');
  });
});

// ===========================================================================
// Post-pure-read behavior (Commit 2). These assert the collapsed pure-read
// handler: legacy singular keys are IGNORED (no migration, no random write),
// and a GET never mutates flags.
// ===========================================================================
describe('LEGACY paths — pure-read behavior (post-pure-read)', () => {
  it('(c) legacy-only flags: singular keys are IGNORED → empty list, flags UNCHANGED', async () => {
    const legacyFlags = {
      ar_office_discovered_artist_id: KNOWN_JSON_ID,
      ar_office_discovered_artist_info: {
        name: 'Nova Sterling',
        archetype: 'Visionary',
        talent: 85,
        popularity: 10,
        genre: 'Pop',
      },
      ar_office_discovery_time: 3,
      ar_office_sourcing_type: 'active',
    };
    const gameId = await seedGame({ ownerId: TEST_USER_ID, flags: legacyFlags });

    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);

    expect(res.status).toBe(200);
    expect(res.body.artists).toEqual([]);

    // NO migration write: flags are byte-identical to what was seeded.
    const flags = await readFlags(gameId);
    expect(flags).toEqual(legacyFlags);
    expect(flags.ar_office_discovered_artists).toBeUndefined();
  });

  it('(d) unknown legacy id, NO info: no random write → empty list, flags UNCHANGED', async () => {
    const legacyFlags = {
      ar_office_discovered_artist_id: 'art_does_not_exist',
    };
    const gameId = await seedGame({ ownerId: TEST_USER_ID, flags: legacyFlags });

    const res = await request(app).get(`/api/game/${gameId}/ar-office/artists`);

    expect(res.status).toBe(200);
    expect(res.body.artists).toEqual([]);

    // NO random write: the singular id is untouched.
    const flags = await readFlags(gameId);
    expect(flags).toEqual(legacyFlags);
    expect(flags.ar_office_discovered_artist_id).toBe('art_does_not_exist');
  });
});
