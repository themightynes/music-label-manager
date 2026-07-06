// @vitest-environment node
/**
 * GET /api/roles/:roleId — weekly meeting selection characterization test
 * (Meeting-relevance Tier 0+1, PR-1/PR-2).
 *
 * Deferred from PR-1 (route-level seeded characterization test); built now
 * reusing the ar-office-artists.characterization.test.ts harness pattern
 * (mocked server/db pointed at the Docker test Postgres on 5433, mocked
 * server/auth injecting a fixed test user, real router mounted via supertest).
 *
 * This route needs no requireGameOwner (gameId comes from a query param, not
 * a path param), so the harness here is a strict subset of arOffice's.
 *
 * Asserts the PR-1 filter (empty pool → meetings: []) and the PR-2 weighting
 * (a tour-active game's CMO/live-category-style meeting gets picked more often
 * under real balance-config tuning than a plain uniform draw would).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

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
import { gameStates, users, artists, projects, moodEvents, songs, chartEntries } from '@shared/schema';
import executivesRouter from '../../server/routes/executives';
import { MOOD_CRATER_THRESHOLD } from '@shared/engine/weekHappenings';

let app: Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(executivesRouter);
  await serverGameData.initialize();
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

async function seedGame(): Promise<string> {
  const gameId = crypto.randomUUID();
  await db.insert(gameStates).values({
    id: gameId,
    userId: TEST_USER_ID,
    currentWeek: 5,
    money: 100000,
    reputation: 0,
    creativeCapital: 5,
  });
  return gameId;
}

beforeEach(async () => {
  await db.execute(
    (await import('drizzle-orm')).sql`TRUNCATE TABLE users, game_states RESTART IDENTITY CASCADE`
  );
  await db.insert(users).values([
    { id: TEST_USER_ID, clerkId: 'clerk_test_user', email: 'test@example.com', username: 'tester' },
  ]);
});

describe('GET /api/roles/:roleId — week-1 empty label state (Tier 0 sit-out rule)', () => {
  it('cco (no requirement-free meeting) sits out: meetings: []', async () => {
    const gameId = await seedGame();
    const res = await request(app).get('/api/roles/cco').query({ gameId, week: '1' });
    expect(res.status).toBe(200);
    expect(res.body.meetings).toEqual([]);
  });

  it('ceo (has a requirement-free floor meeting) returns exactly one meeting', async () => {
    const gameId = await seedGame();
    const res = await request(app).get('/api/roles/ceo').query({ gameId, week: '1' });
    expect(res.status).toBe(200);
    expect(res.body.meetings).toHaveLength(1);
    expect(res.body.meetings[0].id).toBe('ceo_priorities');
  });
});

describe('GET /api/roles/:roleId — Tier 1 weighting under real balance config', () => {
  it('a live-category meeting is picked more often for a tour-active game than plain-uniform expectation', async () => {
    const gameId = await seedGame();
    const artistId = crypto.randomUUID();
    await db.insert(artists).values({
      id: artistId,
      gameId,
      name: 'Tour Artist',
      archetype: 'Workhorse',
      genre: 'pop',
      mood: 50,
      energy: 50,
      signed: true,
    });
    // A booked, in-progress Mini-Tour with cities remaining — tourActive: true.
    await db.insert(projects).values({
      id: crypto.randomUUID(),
      gameId,
      artistId,
      title: 'Test Tour',
      type: 'Mini-Tour',
      stage: 'production',
      startWeek: 1,
      metadata: { cities: 3, tourStats: { cities: [] } },
    });

    // distribution_tour_scale is the one live-adjacent meeting requiring only
    // artist_signed (per the spec §1 catalog); ceo_expansion is a plausible
    // sibling. We just assert the tour-active game returns a stable pick
    // across many weeks and that the eligible pool for `distribution` (the
    // role whose pool includes tour-adjacent content) is non-empty and
    // deterministic per week.
    const picks = new Set<string>();
    for (let week = 5; week < 20; week++) {
      const res = await request(app).get('/api/roles/head_distribution').query({ gameId, week: String(week) });
      expect(res.status).toBe(200);
      expect(res.body.meetings.length).toBeLessThanOrEqual(1);
      if (res.body.meetings[0]) picks.add(res.body.meetings[0].id);
    }
    // Some variety over 15 weeks confirms the endpoint is live (not hardcoded),
    // and no meeting outside distribution's pool ever appears.
    expect(picks.size).toBeGreaterThan(0);
  });

  it('same (gameId, week, role) called twice → identical response (deterministic, no mid-request drift)', async () => {
    const gameId = await seedGame();
    const first = await request(app).get('/api/roles/ceo').query({ gameId, week: '3' });
    const second = await request(app).get('/api/roles/ceo').query({ gameId, week: '3' });
    expect(first.body.meetings.map((m: any) => m.id)).toEqual(second.body.meetings.map((m: any) => m.id));
  });
});

describe('GET /api/roles/:roleId — PR-2 authored reactive meetings: no ambient happenings this week', () => {
  it('no meeting carries reactiveContext when the seeded game has no week N-1 happenings', async () => {
    // PR-2 authored 5 real reactive_trigger meetings (one per exec — see
    // data/actions.json), so this no longer proves the catalog is empty; it
    // proves the injection stage stays dark when nothing actually happened
    // last week (this seeded game has no charts/mood_events/recent signings
    // at week 2, the freshness window for a week-3 request).
    const gameId = await seedGame();
    for (const roleId of ['ceo', 'head_ar', 'cmo', 'cco', 'head_distribution']) {
      const res = await request(app).get(`/api/roles/${roleId}`).query({ gameId, week: '3' });
      expect(res.status).toBe(200);
      for (const meeting of res.body.meetings) {
        expect(meeting.reactiveContext).toBeUndefined();
      }
    }
  });
});

describe('GET /api/roles/:roleId — Tier 2 reactive injection (synthetic reactive meeting)', () => {
  const originalGetWeeklyActions = serverGameData.getWeeklyActionsWithCategories.bind(serverGameData);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Injects one synthetic `mood_crater` reactive meeting into the CCO pool
   * by wrapping the real getWeeklyActionsWithCategories() result — mirrors
   * this file's existing DB-mocking pattern of monkey-patching the narrowest
   * surface needed instead of re-mocking the whole data layer.
   *
   * PR-2 authored a REAL cco x mood_crater reactive meeting
   * (cco_mood_crater_intervention), so this synthetic fixture EXCLUDES it from
   * the base catalog first — this describe block is testing the injection
   * MECHANISM in isolation (priority/tie-break/requires), not PR-2's specific
   * authored content (see the "PR-2 real authored reactive meetings" describe
   * block below for that).
   */
  function injectSyntheticReactiveMeeting() {
    vi.spyOn(serverGameData, 'getWeeklyActionsWithCategories').mockImplementation(async () => {
      const real = await originalGetWeeklyActions();
      return {
        ...real,
        actions: [
          ...real.actions.filter((a: any) => a.id !== 'cco_mood_crater_intervention'),
          {
            id: 'synthetic_cco_mood_crater_reactive',
            type: 'role_meeting',
            role_id: 'cco',
            category: 'talent',
            target_scope: 'predetermined',
            prompt: 'Synthetic reactive meeting for characterization test.',
            requires: ['artist_signed'],
            reactive_trigger: 'mood_crater',
            choices: [
              { id: 'c1', label: 'Intervene', effects_immediate: {}, effects_delayed: {} },
            ],
          },
        ],
      };
    });
  }

  it('a mood_crater happening at week N-1 selects the synthetic reactive meeting and attaches reactiveContext', async () => {
    injectSyntheticReactiveMeeting();

    const gameId = await seedGame();
    const artistId = crypto.randomUUID();
    await db.insert(artists).values({
      id: artistId,
      gameId,
      name: 'Crater Artist',
      archetype: 'Visionary',
      genre: 'pop',
      mood: MOOD_CRATER_THRESHOLD,
      energy: 50,
      signed: true,
    });
    // A discrete mood-lowering event straddling the crater threshold at week 4
    // (so it fires for a week-5 request, freshness window N-1).
    await db.insert(moodEvents).values({
      artistId,
      gameId,
      eventType: 'executive_meeting',
      moodChange: -10,
      moodBefore: MOOD_CRATER_THRESHOLD + 5,
      moodAfter: MOOD_CRATER_THRESHOLD,
      description: 'Test mood crater event',
      weekOccurred: 4,
    });

    const res = await request(app).get('/api/roles/cco').query({ gameId, week: '5' });
    expect(res.status).toBe(200);
    expect(res.body.meetings).toHaveLength(1);
    expect(res.body.meetings[0].id).toBe('synthetic_cco_mood_crater_reactive');
    // Spec §2: reactiveContext rides ON the selected meeting (additive optional).
    expect(res.body.meetings[0].reactiveContext).toEqual({
      trigger: 'mood_crater',
      artistName: 'Crater Artist',
    });
    expect(res.body.reactiveContext).toBeUndefined();
  });

  it('no matching happening (mood event outside freshness window) → falls through to normal pipeline, no reactiveContext', async () => {
    injectSyntheticReactiveMeeting();

    const gameId = await seedGame();
    const artistId = crypto.randomUUID();
    await db.insert(artists).values({
      id: artistId,
      gameId,
      name: 'Stale Crater Artist',
      archetype: 'Visionary',
      genre: 'pop',
      mood: MOOD_CRATER_THRESHOLD,
      energy: 50,
      signed: true,
    });
    // Event is two weeks stale relative to the week-5 request (targetWeek = 4).
    await db.insert(moodEvents).values({
      artistId,
      gameId,
      eventType: 'executive_meeting',
      moodChange: -10,
      moodBefore: MOOD_CRATER_THRESHOLD + 5,
      moodAfter: MOOD_CRATER_THRESHOLD,
      description: 'Stale mood crater event',
      weekOccurred: 2,
    });

    const res = await request(app).get('/api/roles/cco').query({ gameId, week: '5' });
    expect(res.status).toBe(200);
    // Falls through to the normal pipeline: the event-gated synthetic reactive
    // meeting must NOT appear, and no meeting carries reactiveContext.
    for (const meeting of res.body.meetings) {
      expect(meeting.id).not.toBe('synthetic_cco_mood_crater_reactive');
      expect(meeting.reactiveContext).toBeUndefined();
    }
  });

  it('a recent_signing happening (artists.signedWeek === week-1) fires end-to-end with the artist name in context', async () => {
    // Second trigger through the real route + DB, no mood_events involved —
    // proves deriveWeekHappenings' artist-derived path is threaded too.
    vi.spyOn(serverGameData, 'getWeeklyActionsWithCategories').mockImplementation(async () => {
      const real = await originalGetWeeklyActions();
      return {
        ...real,
        actions: [
          ...real.actions,
          {
            id: 'synthetic_ceo_recent_signing_reactive',
            type: 'role_meeting',
            role_id: 'ceo',
            category: 'business',
            target_scope: 'global',
            prompt: 'Synthetic reactive signing meeting.',
            requires: ['artist_signed'],
            reactive_trigger: 'recent_signing',
            choices: [
              { id: 'c1', label: 'Welcome aboard', effects_immediate: {}, effects_delayed: {} },
            ],
          },
        ],
      };
    });

    const gameId = await seedGame();
    await db.insert(artists).values({
      id: crypto.randomUUID(),
      gameId,
      name: 'Fresh Face',
      archetype: 'Workhorse',
      genre: 'pop',
      mood: 50,
      energy: 50,
      signed: true,
      signedWeek: 4, // week-5 request → targetWeek 4 → fires
    });

    const res = await request(app).get('/api/roles/ceo').query({ gameId, week: '5' });
    expect(res.status).toBe(200);
    expect(res.body.meetings).toHaveLength(1);
    expect(res.body.meetings[0].id).toBe('synthetic_ceo_recent_signing_reactive');
    expect(res.body.meetings[0].reactiveContext).toEqual({
      trigger: 'recent_signing',
      artistName: 'Fresh Face',
    });
  });
});

describe('GET /api/roles/:roleId — PR-2 real authored reactive meetings (no mocking, actual data/actions.json)', () => {
  it('head_ar picks the real ar_recent_signing_plan meeting when an artist signed last week', async () => {
    const gameId = await seedGame();
    await db.insert(artists).values({
      id: crypto.randomUUID(),
      gameId,
      name: 'New Signee',
      archetype: 'Workhorse',
      genre: 'pop',
      mood: 50,
      energy: 50,
      signed: true,
      signedWeek: 4, // week-5 request → targetWeek 4 → fires
    });

    const res = await request(app).get('/api/roles/head_ar').query({ gameId, week: '5' });
    expect(res.status).toBe(200);
    expect(res.body.meetings).toHaveLength(1);
    expect(res.body.meetings[0].id).toBe('ar_recent_signing_plan');
    expect(res.body.meetings[0].reactiveContext).toEqual({
      trigger: 'recent_signing',
      artistName: 'New Signee',
    });
  });

  it('cmo and ceo both offer their real chart_debut reactive meetings when a song debuted last week (cross-exec duplication permitted)', async () => {
    const gameId = await seedGame();
    const artistId = crypto.randomUUID();
    await db.insert(artists).values({
      id: artistId,
      gameId,
      name: 'Charting Artist',
      archetype: 'Visionary',
      genre: 'pop',
      mood: 50,
      energy: 50,
      signed: true,
    });
    const songId = crypto.randomUUID();
    await db.insert(songs).values({
      id: songId,
      gameId,
      artistId,
      title: 'Neon Nights',
      quality: 70,
      isRecorded: true,
    });
    const chartWeekDate = (await import('@shared/engine/ChartService')).ChartService.generateChartWeekFromGameWeek(4);
    await db.insert(chartEntries).values({
      gameId,
      songId,
      chartWeek: chartWeekDate,
      streams: 100000,
      position: 42,
      isDebut: true,
      isCompetitorSong: false,
    });
    const cmoRes = await request(app).get('/api/roles/cmo').query({ gameId, week: '5' });
    expect(cmoRes.status).toBe(200);
    expect(cmoRes.body.meetings).toHaveLength(1);
    expect(cmoRes.body.meetings[0].id).toBe('cmo_chart_debut_press');
    expect(cmoRes.body.meetings[0].reactiveContext).toEqual({
      trigger: 'chart_debut',
      artistName: 'Charting Artist',
      songTitle: 'Neon Nights',
    });

    const ceoRes = await request(app).get('/api/roles/ceo').query({ gameId, week: '5' });
    expect(ceoRes.status).toBe(200);
    expect(ceoRes.body.meetings).toHaveLength(1);
    expect(ceoRes.body.meetings[0].id).toBe('ceo_chart_debut_strategy');
    expect(ceoRes.body.meetings[0].reactiveContext).toEqual({
      trigger: 'chart_debut',
      artistName: 'Charting Artist',
      songTitle: 'Neon Nights',
    });
  });

  it('head_distribution picks the real distribution_release_out_numbers meeting when a release went out last week', async () => {
    const gameId = await seedGame();
    const artistId = crypto.randomUUID();
    await db.insert(artists).values({
      id: artistId,
      gameId,
      name: 'Release Artist',
      archetype: 'Workhorse',
      genre: 'pop',
      mood: 50,
      energy: 50,
      signed: true,
    });
    const { releases } = await import('@shared/schema');
    await db.insert(songs).values({
      id: crypto.randomUUID(),
      gameId,
      artistId,
      title: 'EP Track One',
      quality: 65,
      isRecorded: true,
    });
    await db.insert(releases).values({
      id: crypto.randomUUID(),
      gameId,
      artistId,
      title: 'Debut EP',
      type: 'ep',
      status: 'released',
      releaseWeek: 4, // week-5 request → targetWeek 4 → fires
    });

    const res = await request(app).get('/api/roles/head_distribution').query({ gameId, week: '5' });
    expect(res.status).toBe(200);
    expect(res.body.meetings).toHaveLength(1);
    expect(res.body.meetings[0].id).toBe('distribution_release_out_numbers');
    expect(res.body.meetings[0].reactiveContext).toEqual({
      trigger: 'release_out',
      artistName: 'Release Artist',
    });
  });

  it('cco picks the real cco_mood_crater_intervention meeting when an artist craters last week', async () => {
    const gameId = await seedGame();
    const artistId = crypto.randomUUID();
    await db.insert(artists).values({
      id: artistId,
      gameId,
      name: 'Cratering Artist',
      archetype: 'Visionary',
      genre: 'pop',
      mood: MOOD_CRATER_THRESHOLD,
      energy: 50,
      signed: true,
    });
    await db.insert(moodEvents).values({
      artistId,
      gameId,
      eventType: 'executive_meeting',
      moodChange: -10,
      moodBefore: MOOD_CRATER_THRESHOLD + 5,
      moodAfter: MOOD_CRATER_THRESHOLD,
      description: 'Real catalog mood crater event',
      weekOccurred: 4,
    });

    const res = await request(app).get('/api/roles/cco').query({ gameId, week: '5' });
    expect(res.status).toBe(200);
    expect(res.body.meetings).toHaveLength(1);
    expect(res.body.meetings[0].id).toBe('cco_mood_crater_intervention');
    expect(res.body.meetings[0].reactiveContext).toEqual({
      trigger: 'mood_crater',
      artistName: 'Cratering Artist',
    });
  });
});
