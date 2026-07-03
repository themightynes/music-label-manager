// @vitest-environment node
/**
 * artists PATCH whitelist characterization test (Phase 2, PR-13 task 1).
 *
 * PATCH /api/artists/:id had the entity-walk ownership check (from the Phase 1
 * ownership sweep) but still passed raw req.body straight to
 * storage.updateArtist — a mass-assignment hole flagged with
 * `// TODO(phase-2): whitelist mutable artist fields`.
 *
 * This test pins the OWNER path (whitelisted mood/energy accepted, ownership
 * 404 preserved) BEFORE and AFTER the whitelist lands, and flips the
 * mass-assignment behavior: pre-hardening a server-computed field like `talent`
 * is silently written through; post-hardening the same body returns 400
 * INVALID_ARTIST_FIELDS and nothing is mutated.
 *
 * Blocks tagged "(post-hardening)" only pass AFTER the whitelist commit lands.
 * The single "(pre-hardening baseline)" block documents the old mass-assignment
 * behavior and is REMOVED when the whitelist lands (it necessarily fails after).
 *
 * Drives the real games/artists router over supertest against the real test
 * Postgres (Docker, localhost:5433). Harness mirrors
 * tests/endpoints/sweep-migrations.characterization.test.ts.
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
import { gameStates, users, artists } from '@shared/schema';
import { eq } from 'drizzle-orm';
import artistsRouter from '../../server/routes/artists';

let app: Express;

/** Seed a game owned by ownerId plus one artist. Returns the ids. */
async function seedGameWithArtist(ownerId: string) {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: ownerId,
    currentWeek: 1,
    money: 100000,
    reputation: 10,
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
    popularity: 40,
    talent: 50,
  });
  return { gameId, artistId };
}

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(artistsRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

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

describe('PATCH /api/artists/:id (characterization)', () => {
  it('returns 404 ARTIST_NOT_FOUND for a nonexistent artist', async () => {
    const res = await request(app)
      .patch(`/api/artists/${crypto.randomUUID()}`)
      .send({ mood: 60 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ARTIST_NOT_FOUND');
  });

  it("returns 404 ARTIST_NOT_FOUND when the artist belongs to another user's game (ownership preserved)", async () => {
    const { artistId } = await seedGameWithArtist(OTHER_USER_ID);
    // Authenticated as TEST_USER_ID; artist is owned by OTHER_USER_ID.
    const res = await request(app)
      .patch(`/api/artists/${artistId}`)
      .send({ mood: 99 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ARTIST_NOT_FOUND');

    // Victim data unchanged.
    const [row] = await db.select().from(artists).where(eq(artists.id, artistId));
    expect(row.mood).toBe(50);
  });

  it('updates whitelisted fields (mood, energy) for an owned artist', async () => {
    const { artistId } = await seedGameWithArtist(TEST_USER_ID);
    const res = await request(app)
      .patch(`/api/artists/${artistId}`)
      .send({ mood: 72, energy: 33 });
    expect(res.status).toBe(200);
    expect(res.body.mood).toBe(72);
    expect(res.body.energy).toBe(33);

    const [row] = await db.select().from(artists).where(eq(artists.id, artistId));
    expect(row.mood).toBe(72);
    expect(row.energy).toBe(33);
  });

  // --- Mass-assignment behavior flip -------------------------------------

  // PRE-HARDENING baseline: server-computed `talent` is silently written
  // through the raw-body pass-through. This block is REMOVED when the
  // whitelist lands (it necessarily fails afterwards). Kept here to document
  // the hole the whitelist closes.
  it.skip('(pre-hardening baseline) silently mass-assigns a server-computed field (talent)', async () => {
    const { artistId } = await seedGameWithArtist(TEST_USER_ID);
    const res = await request(app)
      .patch(`/api/artists/${artistId}`)
      .send({ talent: 99 });
    expect(res.status).toBe(200);
    const [row] = await db.select().from(artists).where(eq(artists.id, artistId));
    expect(row.talent).toBe(99); // mass-assignment: raw body written through
  });

  it('(post-hardening) rejects an unknown / server-computed field with 400 INVALID_ARTIST_FIELDS', async () => {
    const { artistId } = await seedGameWithArtist(TEST_USER_ID);
    const res = await request(app)
      .patch(`/api/artists/${artistId}`)
      .send({ talent: 99 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ARTIST_FIELDS');
    expect(Array.isArray(res.body.details)).toBe(true);

    // Nothing mutated: talent stays at its seeded value.
    const [row] = await db.select().from(artists).where(eq(artists.id, artistId));
    expect(row.talent).toBe(50);
  });

  it('(post-hardening) rejects identity fields (id, gameId) with 400', async () => {
    const { artistId, gameId } = await seedGameWithArtist(TEST_USER_ID);
    const res = await request(app)
      .patch(`/api/artists/${artistId}`)
      .send({ mood: 60, gameId: crypto.randomUUID() });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ARTIST_FIELDS');

    // gameId untouched, mood untouched (whole payload rejected).
    const [row] = await db.select().from(artists).where(eq(artists.id, artistId));
    expect(row.gameId).toBe(gameId);
    expect(row.mood).toBe(50);
  });

  it('(post-hardening) enforces mood/energy bounds (0-100) via the whitelist', async () => {
    const { artistId } = await seedGameWithArtist(TEST_USER_ID);
    const res = await request(app)
      .patch(`/api/artists/${artistId}`)
      .send({ mood: 150 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ARTIST_FIELDS');
  });
});
