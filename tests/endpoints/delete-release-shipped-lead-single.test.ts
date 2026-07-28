// @vitest-environment node
/**
 * C107 regression — DELETE .../releases/:releaseId must NOT zero a SHIPPED lead
 * single's earned awareness/peak_awareness when the still-planned main release
 * is cancelled.
 *
 * Bug: deleteRelease used to run ONE update that unlinked every song on the row
 * AND zeroed awareness/peak_awareness for all of them. A lead single releases
 * BEFORE the main release and keeps its releaseId while is_released = true, so
 * it carries LIVE earned buzz (awareness + streaming multiplier + historical
 * peak). Cancelling the planned main release wiped that real buzz.
 *
 * Fix: two ordered updates — (1) zero awareness/peak ONLY for songs with
 * is_released = false, then (2) unlink releaseId for ALL songs (so the deleted
 * release leaves no dangling FK). This test pins the corrected behavior:
 *   - a shipped lead single KEEPS its awareness/peak_awareness, releaseId → null
 *   - an unreleased song is fully zeroed, releaseId → null
 *   - the release row is deleted
 *
 * Drives the real releases router over supertest against the test Postgres
 * (Docker, localhost:5433), matching releases.characterization.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Must be set before any module that reads DATABASE_URL at import time.
const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';
process.env.DATABASE_URL = TEST_DATABASE_URL;

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';

// Reroute server/db to a non-SSL pool at the test DB (production pool forces SSL,
// which the local test container rejects). storage.ts + service read from ./db.
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

// requireClerkUser injects the fixed test user; everything else passes through.
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
import { gameStates, users, artists, songs, releases } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import releasesRouter from '../../server/routes/releases';

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(releasesRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

beforeEach(async () => {
  await db.execute(sql`TRUNCATE TABLE users, game_states RESTART IDENTITY CASCADE`);
  await db.insert(users).values({
    id: TEST_USER_ID, clerkId: 'clerk_test_user', email: 'test@example.com', username: 'tester',
  });
});

describe('DELETE .../releases/:releaseId — shipped lead single preservation (C107)', () => {
  it('keeps a shipped lead single\'s awareness/peak, zeroes the unreleased song, deletes the release', async () => {
    const gameId = crypto.randomUUID();
    await db.insert(gameStates).values({
      id: gameId, userId: TEST_USER_ID, currentWeek: 3, money: 50000, reputation: 0, creativeCapital: 5,
    });
    const artistId = crypto.randomUUID();
    await db.insert(artists).values({
      id: artistId, gameId, name: 'Test Artist', archetype: 'Workhorse', genre: 'pop', mood: 50, energy: 50,
    });

    // (a) Shipped lead single: is_released = true, LIVE earned buzz.
    const leadSingleId = crypto.randomUUID();
    // (b) Unreleased song still waiting on the planned main release: pre-buzz only.
    const unreleasedId = crypto.randomUUID();
    const releaseId = crypto.randomUUID();

    await db.insert(releases).values({
      id: releaseId, gameId, artistId, title: 'Planned Album', type: 'album',
      status: 'planned', marketingBudget: 5000, metadata: {},
    });

    await db.insert(songs).values([
      {
        id: leadSingleId, gameId, artistId, title: 'Lead Single',
        quality: 80, genre: 'pop', isRecorded: true,
        isReleased: true, releaseWeek: 2, releaseId,
        awareness: 40, peak_awareness: 55,
      },
      {
        id: unreleasedId, gameId, artistId, title: 'Unreleased Track',
        quality: 70, genre: 'pop', isRecorded: true,
        isReleased: false, releaseId,
        awareness: 12, peak_awareness: 12,
      },
    ]);

    const res = await request(app).delete(`/api/game/${gameId}/releases/${releaseId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Shipped lead single: buzz PRESERVED, unlinked from the deleted release.
    const [lead] = await db.select().from(songs).where(eq(songs.id, leadSingleId));
    expect(lead.releaseId).toBeNull();
    expect(lead.awareness).toBe(40);
    expect(lead.peak_awareness).toBe(55);
    expect(lead.isReleased).toBe(true);

    // Unreleased song: buzz ZEROED and unlinked.
    const [unreleased] = await db.select().from(songs).where(eq(songs.id, unreleasedId));
    expect(unreleased.releaseId).toBeNull();
    expect(unreleased.awareness).toBe(0);
    expect(unreleased.peak_awareness).toBe(0);

    // Release row deleted.
    const remaining = await db.select().from(releases).where(eq(releases.id, releaseId));
    expect(remaining).toHaveLength(0);
  });
});
