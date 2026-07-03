// @vitest-environment node
/**
 * Save/restore characterization test (Phase 1, PR-16).
 *
 * The fat POST /api/saves/:saveId/restore handler (overwrite + fork) plus
 * POST /api/saves and DELETE /api/saves/:saveId had no endpoint-level coverage.
 * This test pins the observable behavior of the save/restore endpoints BEFORE
 * the logic is extracted into saveService, so the extraction can be proven
 * behavior-preserving (green before AND after).
 *
 * It drives the real registerRoutes() router over supertest against the real
 * test Postgres (Docker, localhost:5433). Clerk auth is mocked to a fixed test
 * user; server/db is mocked to a non-SSL pool pointed at the test DB (the
 * production pool forces SSL, which the local test container rejects).
 *
 * IMPORTANT snapshot shape: `musicLabel` and all collections are SIBLINGS of
 * `gameState` in the save snapshot, NOT nested inside it.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';

// Must be set before any module that reads DATABASE_URL at import time.
const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/music_label_test';
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Fixed clerk id / resolved userId for the mocked authenticated user.
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
// A second user, used for ownership / not-found characterization.
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
import {
  gameStates,
  users,
  artists,
  projects,
  songs,
  releases,
  releaseSongs,
  gameSaves,
  SNAPSHOT_VERSION,
} from '@shared/schema';
import { eq } from 'drizzle-orm';

let app: Express;

interface SeededGame {
  gameId: string;
  artistId: string;
  projectId: string;
  songId: string;
  releaseId: string;
}

/**
 * Seed a small game owned by `ownerId` with 1 artist + 1 project + 1 song +
 * 1 release + 1 releaseSong junction row. Returns all the ids.
 */
async function seedGame(ownerId: string): Promise<SeededGame> {
  const gameId = randomUUID();
  const artistId = randomUUID();
  const projectId = randomUUID();
  const songId = randomUUID();
  const releaseId = randomUUID();

  await db.insert(gameStates).values({
    id: gameId,
    userId: ownerId,
    currentWeek: 5,
    money: 50000,
    reputation: 10,
    creativeCapital: 20,
  });

  await db.insert(artists).values({
    id: artistId,
    gameId,
    name: 'Seed Artist',
    archetype: 'Workhorse',
    genre: 'pop',
    mood: 50,
    energy: 50,
    popularity: 50,
    talent: 60,
    workEthic: 70,
    temperament: 50,
    signed: true,
  });

  await db.insert(projects).values({
    id: projectId,
    gameId,
    artistId,
    title: 'Seed Project',
    type: 'Single',
    stage: 'planning',
  });

  await db.insert(songs).values({
    id: songId,
    gameId,
    artistId,
    projectId,
    title: 'Seed Song',
    genre: 'pop',
    quality: 75,
    isRecorded: true,
    isReleased: true,
  });

  await db.insert(releases).values({
    id: releaseId,
    gameId,
    artistId,
    title: 'Seed Release',
    type: 'single',
    status: 'released',
  });

  await db.insert(releaseSongs).values({
    releaseId,
    songId,
    trackNumber: 1,
    isSingle: true,
  });

  return { gameId, artistId, projectId, songId, releaseId };
}

/** Build a snapshot object from the seeded game rows (siblings of gameState). */
function buildSnapshot(seed: SeededGame, overrides: Record<string, any> = {}) {
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    gameState: {
      id: seed.gameId,
      currentWeek: 5,
      money: 50000,
      reputation: 10,
      creativeCapital: 20,
    },
    musicLabel: null,
    artists: [
      {
        id: seed.artistId,
        gameId: seed.gameId,
        name: 'Seed Artist',
        archetype: 'Workhorse',
        genre: 'pop',
        mood: 50,
        energy: 50,
        popularity: 50,
        talent: 60,
        workEthic: 70,
        temperament: 50,
        signed: true,
      },
    ],
    projects: [
      {
        id: seed.projectId,
        gameId: seed.gameId,
        artistId: seed.artistId,
        title: 'Seed Project',
        type: 'Single',
        stage: 'planning',
      },
    ],
    roles: [],
    songs: [
      {
        id: seed.songId,
        gameId: seed.gameId,
        artistId: seed.artistId,
        projectId: seed.projectId,
        title: 'Seed Song',
        genre: 'pop',
        quality: 75,
        isRecorded: true,
        isReleased: true,
      },
    ],
    releases: [
      {
        id: seed.releaseId,
        gameId: seed.gameId,
        artistId: seed.artistId,
        title: 'Seed Release',
        type: 'single',
        status: 'released',
      },
    ],
    releaseSongs: [
      {
        releaseId: seed.releaseId,
        songId: seed.songId,
        trackNumber: 1,
        isSingle: true,
      },
    ],
    executives: [],
    moodEvents: [],
    weeklyActions: [],
    emails: [],
    ...overrides,
  };
}

/** Insert a game_saves row owned by `ownerId` holding `snapshot`. Returns saveId. */
async function insertSave(ownerId: string, snapshot: any): Promise<string> {
  const saveId = randomUUID();
  await db.insert(gameSaves).values({
    id: saveId,
    userId: ownerId,
    name: 'Characterization Save',
    week: snapshot?.gameState?.currentWeek ?? 1,
    gameState: snapshot,
    isAutosave: false,
  });
  return saveId;
}

beforeAll(async () => {
  const { registerRoutes } = await import('../../server/routes');
  app = express();
  app.use(express.json());
  const server = await registerRoutes(app);
  server.close();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

beforeEach(async () => {
  const { sql } = await import('drizzle-orm');
  await db.execute(sql`TRUNCATE TABLE users, game_states, game_saves RESTART IDENTITY CASCADE`);
  await db.insert(users).values([
    { id: TEST_USER_ID, clerkId: 'clerk_test_user', email: 'test@example.com', username: 'tester' },
    { id: OTHER_USER_ID, clerkId: 'clerk_other_user', email: 'other@example.com', username: 'other' },
  ]);
});

describe('POST /api/saves/:saveId/restore — fork mode (characterization)', () => {
  it('creates a NEW gameId and remaps artist/song/release ids consistently', async () => {
    const seed = await seedGame(TEST_USER_ID);
    const snapshot = buildSnapshot(seed);
    const saveId = await insertSave(TEST_USER_ID, snapshot);

    const res = await request(app)
      .post(`/api/saves/${saveId}/restore`)
      .send({ mode: 'fork' });

    expect(res.status).toBe(200);
    const newGameId: string = res.body.gameId;
    expect(newGameId).toBeTruthy();
    expect(newGameId).not.toBe(seed.gameId);

    // Original game still exists (fork does not delete it)
    const [origGame] = await db.select().from(gameStates).where(eq(gameStates.id, seed.gameId));
    expect(origGame).toBeTruthy();

    // New game exists and is owned by the authenticated user
    const [forkedGame] = await db.select().from(gameStates).where(eq(gameStates.id, newGameId));
    expect(forkedGame).toBeTruthy();
    expect(forkedGame.userId).toBe(TEST_USER_ID);

    // Forked rows have NEW ids and FK references line up within the new game.
    const forkedArtists = await db.select().from(artists).where(eq(artists.gameId, newGameId));
    const forkedProjects = await db.select().from(projects).where(eq(projects.gameId, newGameId));
    const forkedSongs = await db.select().from(songs).where(eq(songs.gameId, newGameId));
    const forkedReleases = await db.select().from(releases).where(eq(releases.gameId, newGameId));

    expect(forkedArtists).toHaveLength(1);
    expect(forkedProjects).toHaveLength(1);
    expect(forkedSongs).toHaveLength(1);
    expect(forkedReleases).toHaveLength(1);

    const newArtistId = forkedArtists[0].id;
    const newProjectId = forkedProjects[0].id;
    const newReleaseId = forkedReleases[0].id;

    // Ids are remapped (differ from originals)
    expect(newArtistId).not.toBe(seed.artistId);
    expect(forkedSongs[0].id).not.toBe(seed.songId);
    expect(newReleaseId).not.toBe(seed.releaseId);

    // FK references line up: the forked song points at the forked artist/project/release
    expect(forkedSongs[0].artistId).toBe(newArtistId);
    expect(forkedSongs[0].projectId).toBe(newProjectId);
    expect(forkedProjects[0].artistId).toBe(newArtistId);
    expect(forkedReleases[0].artistId).toBe(newArtistId);

    // release_songs junction was remapped to the new release + song ids
    const forkedReleaseSongs = await db
      .select()
      .from(releaseSongs)
      .where(eq(releaseSongs.releaseId, newReleaseId));
    expect(forkedReleaseSongs).toHaveLength(1);
    expect(forkedReleaseSongs[0].songId).toBe(forkedSongs[0].id);
  });
});

describe('POST /api/saves/:saveId/restore — overwrite mode (characterization)', () => {
  it('restores onto the original gameId and row counts match', async () => {
    const seed = await seedGame(TEST_USER_ID);
    const snapshot = buildSnapshot(seed);
    const saveId = await insertSave(TEST_USER_ID, snapshot);

    const res = await request(app)
      .post(`/api/saves/${saveId}/restore`)
      .send({ mode: 'overwrite' });

    expect(res.status).toBe(200);
    expect(res.body.gameId).toBe(seed.gameId);

    // Same gameId retains its rows (deleted + reinserted with same ids)
    const restoredArtists = await db.select().from(artists).where(eq(artists.gameId, seed.gameId));
    const restoredSongs = await db.select().from(songs).where(eq(songs.gameId, seed.gameId));
    const restoredReleases = await db.select().from(releases).where(eq(releases.gameId, seed.gameId));

    expect(restoredArtists).toHaveLength(1);
    expect(restoredSongs).toHaveLength(1);
    expect(restoredReleases).toHaveLength(1);

    // Ids are preserved on overwrite
    expect(restoredArtists[0].id).toBe(seed.artistId);
    expect(restoredSongs[0].id).toBe(seed.songId);
    expect(restoredReleases[0].id).toBe(seed.releaseId);

    const restoredReleaseSongs = await db
      .select()
      .from(releaseSongs)
      .where(eq(releaseSongs.releaseId, seed.releaseId));
    expect(restoredReleaseSongs).toHaveLength(1);
    expect(restoredReleaseSongs[0].songId).toBe(seed.songId);
  });

  it('defaults to overwrite mode when body omits mode', async () => {
    const seed = await seedGame(TEST_USER_ID);
    const snapshot = buildSnapshot(seed);
    const saveId = await insertSave(TEST_USER_ID, snapshot);

    const res = await request(app).post(`/api/saves/${saveId}/restore`).send({});

    expect(res.status).toBe(200);
    expect(res.body.gameId).toBe(seed.gameId);
  });
});

describe('POST /api/saves/:saveId/restore — error paths (characterization)', () => {
  it('returns 400 UNSUPPORTED_SNAPSHOT_VERSION on a wrong snapshotVersion', async () => {
    const seed = await seedGame(TEST_USER_ID);
    const snapshot = buildSnapshot(seed, { snapshotVersion: SNAPSHOT_VERSION + 999 });
    const saveId = await insertSave(TEST_USER_ID, snapshot);

    const res = await request(app).post(`/api/saves/${saveId}/restore`).send({ mode: 'overwrite' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('UNSUPPORTED_SNAPSHOT_VERSION');
    expect(res.body.message).toBe(
      `Snapshot version ${SNAPSHOT_VERSION + 999} is not supported. Expected version ${SNAPSHOT_VERSION}.`
    );
  });

  it('returns 400 INVALID_SNAPSHOT_COLLECTIONS with details when releaseSongs entries are malformed', async () => {
    const seed = await seedGame(TEST_USER_ID);
    const snapshot = buildSnapshot(seed, {
      // songId is a number, not a string -> malformed
      releaseSongs: [{ releaseId: seed.releaseId, songId: 12345, trackNumber: 1, isSingle: true }],
    });
    const saveId = await insertSave(TEST_USER_ID, snapshot);

    const res = await request(app).post(`/api/saves/${saveId}/restore`).send({ mode: 'overwrite' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_SNAPSHOT_COLLECTIONS');
    expect(res.body.message).toBe(
      'Snapshot collections are missing required fields or are malformed'
    );
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details).toContain('releaseSongs[0] is missing required releaseId/songId');
  });

  it('returns 404 SAVE_NOT_FOUND for a save owned by another user', async () => {
    const seed = await seedGame(OTHER_USER_ID);
    const snapshot = buildSnapshot(seed);
    const saveId = await insertSave(OTHER_USER_ID, snapshot);

    const res = await request(app).post(`/api/saves/${saveId}/restore`).send({ mode: 'overwrite' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('SAVE_NOT_FOUND');
    expect(res.body.message).toBe('Save file not found or does not belong to this user');
  });

  it('returns 403 UNAUTHORIZED when overwriting a game owned by another user', async () => {
    // Save row belongs to the authenticated user, but the snapshot points at a
    // game owned by OTHER_USER_ID -> overwrite ownership check must 403.
    const otherSeed = await seedGame(OTHER_USER_ID);
    const snapshot = buildSnapshot(otherSeed);
    const saveId = await insertSave(TEST_USER_ID, snapshot);

    const res = await request(app).post(`/api/saves/${saveId}/restore`).send({ mode: 'overwrite' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('UNAUTHORIZED');
    expect(res.body.message).toBe('You do not have permission to restore this game');
  });
});

describe('DELETE /api/saves/:saveId (characterization)', () => {
  it('returns 404 SAVE_NOT_FOUND for a missing save', async () => {
    const res = await request(app).delete(`/api/saves/${randomUUID()}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('SAVE_NOT_FOUND');
    expect(res.body.message).toBe('Save file not found or does not belong to this user');
  });

  it('deletes an owned save and returns the deletedSaveId', async () => {
    const seed = await seedGame(TEST_USER_ID);
    const snapshot = buildSnapshot(seed);
    const saveId = await insertSave(TEST_USER_ID, snapshot);

    const res = await request(app).delete(`/api/saves/${saveId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Save deleted successfully');
    expect(res.body.deletedSaveId).toBe(saveId);

    const remaining = await db.select().from(gameSaves).where(eq(gameSaves.id, saveId));
    expect(remaining).toHaveLength(0);
  });
});

describe('POST /api/saves (characterization)', () => {
  it('creates a save when the snapshot carries a game identifier', async () => {
    const seed = await seedGame(TEST_USER_ID);
    const snapshot = buildSnapshot(seed);

    const res = await request(app)
      // `week` must match snapshot currentWeek (insertGameSaveSchema.superRefine)
      .post('/api/saves')
      .send({ name: 'My Save', week: snapshot.gameState.currentWeek, gameState: snapshot, isAutosave: false });

    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(res.body.week).toBe(snapshot.gameState.currentWeek);

    const [row] = await db.select().from(gameSaves).where(eq(gameSaves.id, res.body.id));
    expect(row).toBeTruthy();
    expect(row.userId).toBe(TEST_USER_ID);
  });

  it('returns a Zod 400 when snapshot.gameState.id is missing', async () => {
    // NOTE: gameSaveSnapshotSchema requires gameState.id (z.string()), so an
    // omitted id fails Zod parsing FIRST and never reaches the handler's own
    // INVALID_SNAPSHOT guard. The observable result is the generic Zod 400.
    const snapshot = {
      snapshotVersion: SNAPSHOT_VERSION,
      gameState: { currentWeek: 3, money: 0, reputation: 0, creativeCapital: 0 }, // no id
    };

    const res = await request(app)
      .post('/api/saves')
      .send({ name: 'No Id Save', week: 3, gameState: snapshot, isAutosave: false });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid save data');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
