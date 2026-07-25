import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProcessor, LIVE_EFFECT_KEYS, EFFECT_CHANNEL_DESCRIPTIONS } from '@shared/engine/processors/ActionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';

/**
 * Engine-verbs M1a/M1b (tangible catalog) — grant_song + spawn_release unit tests.
 *
 * NO database: gameData is a mock capturing the rows the effect cases persist,
 * so these tests pin ROW SHAPE, seed DETERMINISM (isolated seededRandom — the
 * engine's ctx.getRandom stream must never be drawn), the granted→spawned
 * handoff inside one effects block, and the skip/warn guard rails.
 */

const GAME_ID = 'game-tangible';
const WEEK = 12;
const ARTIST = { id: 'artist-1', name: 'Nova Sterling', genre: 'pop' };

const BALANCE = {
  song_generation: {
    name_pools: {
      default: ['Fallback Anthem', 'Second Fallback'],
      genre_specific: { pop: ['Pop Hook', 'Sugar Rush'] },
    },
    mood_types: ['upbeat', 'melancholic'],
    granted_song: { default_quality_range: [40, 60] },
  },
  market_formulas: {
    spawned_release: { default_marketing_budget: 0, release_offset_weeks: 1 },
  },
};

interface MockCaptures {
  createdSongs: any[];
  createdReleases: any[];
  createdReleaseSongs: any[];
  songUpdates: Array<{ songId: string; updates: any; tx: any }>;
}

function buildContext(overrides: {
  artistSongs?: any[];
  balance?: any;
  dbTransaction?: any;
} = {}): { ctx: WeekContext; captures: MockCaptures; getRandomSpy: ReturnType<typeof vi.fn> } {
  const captures: MockCaptures = {
    createdSongs: [],
    createdReleases: [],
    createdReleaseSongs: [],
    songUpdates: [],
  };
  const gameState: any = {
    id: GAME_ID,
    currentWeek: WEEK,
    reputation: 50,
    creativeCapital: 10,
    flags: {},
  };
  const gameData: any = {
    getBalanceConfigSync: () => overrides.balance ?? BALANCE,
    getArtistById: async (id: string) => (id === ARTIST.id ? ARTIST : null),
    createSong: async (song: any, tx: any) => {
      captures.createdSongs.push({ song, tx });
      return { ...song, id: `song-created-${captures.createdSongs.length}` };
    },
    createRelease: async (release: any, tx: any) => {
      captures.createdReleases.push({ release, tx });
      return { ...release, id: `release-created-${captures.createdReleases.length}` };
    },
    createReleaseSong: async (row: any, tx: any) => {
      captures.createdReleaseSongs.push({ row, tx });
      return row;
    },
    updateSong: async (songId: string, updates: any, tx: any) => {
      captures.songUpdates.push({ songId, updates, tx });
      return { id: songId, ...updates };
    },
    getSongsByArtist: async (_artistId: string, _gameId: string, _tx: any) =>
      overrides.artistSongs ?? [],
  };
  const getRandomSpy = vi.fn(() => {
    throw new Error('ctx.getRandom must NEVER be drawn by tangible-catalog effects (isolated seeds only)');
  });
  const ctx: WeekContext = {
    gameState,
    summary: createTestWeekSummary({ week: WEEK }),
    gameData,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: getRandomSpy as any,
    dbTransaction: overrides.dbTransaction,
  };
  return { ctx, captures, getRandomSpy };
}

describe('key tax (M1a/M1b)', () => {
  it('grant_song and spawn_release are LIVE keys with channel descriptions', () => {
    expect(LIVE_EFFECT_KEYS.has('grant_song')).toBe(true);
    expect(LIVE_EFFECT_KEYS.has('spawn_release')).toBe(true);
    expect(EFFECT_CHANNEL_DESCRIPTIONS.grant_song).toBeDefined();
    expect(EFFECT_CHANNEL_DESCRIPTIONS.spawn_release).toBeDefined();
  });
});

describe('grant_song (M1a)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('creates a recorded, unreleased song row via gameData.createSong with the week transaction', async () => {
    const fakeTx = { tag: 'week-tx' };
    const { ctx, captures } = buildContext({ dbTransaction: fakeTx });
    await new ActionProcessor().applyEffects(
      ctx,
      { grant_song: { title_hint: 'Wall of Misses', quality: 72, artist: 'targeted' } },
      ARTIST.id,
      'user_selected',
      'mac_test_meeting',
      'choice_a'
    );

    expect(captures.createdSongs).toHaveLength(1);
    const { song, tx } = captures.createdSongs[0];
    expect(tx).toBe(fakeTx); // D6: rides the one-transaction week
    // Row shape mirrors SongGenerationProcessor.generateSong
    expect(song).toMatchObject({
      title: 'Wall of Misses',
      artistId: ARTIST.id,
      gameId: GAME_ID,
      quality: 72,
      genre: 'pop',
      createdWeek: WEEK,
      producerTier: 'local',
      timeInvestment: 'standard',
      isRecorded: true,
      isReleased: false,
      releaseId: null,
      projectId: null,
      productionBudget: 0,
      marketingAllocation: 0,
    });
    expect(song.id).toBeUndefined(); // DB generates the id
    expect(song.recordedAt).toBeInstanceOf(Date);
    expect(song.metadata.grantedBy).toEqual({
      meetingName: 'mac_test_meeting',
      choiceId: 'choice_a',
      week: WEEK,
    });

    // Qualitative WeekSummary surfacing, rendered category (never `other`-swallowed).
    const granted = ctx.summary.changes.filter((c: any) => c.type === 'song_granted');
    expect(granted).toHaveLength(1);
    expect(granted[0].description).toContain('Wall of Misses');
    expect(granted[0].description).toContain(ARTIST.name);
    expect(granted[0].description).not.toMatch(/\d/); // no numbers in player prose
  });

  it('quality_range rolls are seed-deterministic and in range, without touching ctx.getRandom', async () => {
    const roll = async () => {
      const { ctx, captures, getRandomSpy } = buildContext();
      await new ActionProcessor().applyEffects(
        ctx,
        { grant_song: { quality_range: [55, 65], artist: 'targeted' } },
        ARTIST.id,
        'user_selected',
        'meeting_x',
        'choice_y'
      );
      expect(getRandomSpy).not.toHaveBeenCalled();
      return captures.createdSongs[0].song;
    };
    const first = await roll();
    const second = await roll();
    expect(first.quality).toBe(second.quality); // same gameId/week/meeting/choice → same roll
    expect(first.quality).toBeGreaterThanOrEqual(55);
    expect(first.quality).toBeLessThanOrEqual(65);
    expect(first.title).toBe(second.title); // deterministic fallback title too
    expect(first.mood).toBe(second.mood);
    // Fallback title comes from the artist-genre name pool.
    expect(BALANCE.song_generation.name_pools.genre_specific.pop).toContain(first.title);
  });

  it('falls back to the balance-knobbed default quality range when nothing is authored', async () => {
    const pinned = {
      ...BALANCE,
      song_generation: {
        ...BALANCE.song_generation,
        granted_song: { default_quality_range: [50, 50] },
      },
    };
    const { ctx, captures } = buildContext({ balance: pinned });
    await new ActionProcessor().applyEffects(
      ctx,
      { grant_song: { artist: 'targeted' } },
      ARTIST.id,
      'user_selected',
      'meeting_x',
      'choice_y'
    );
    expect(captures.createdSongs[0].song.quality).toBe(50);
  });

  it('warns and skips when no artist is targeted (no row, no change entry)', async () => {
    const { ctx, captures } = buildContext();
    await new ActionProcessor().applyEffects(
      ctx,
      { grant_song: { artist: 'targeted' } },
      undefined,
      'global',
      'meeting_x',
      'choice_y'
    );
    expect(captures.createdSongs).toHaveLength(0);
    expect(ctx.summary.changes.filter((c: any) => c.type === 'song_granted')).toHaveLength(0);
    expect(
      warnSpy.mock.calls.some((call) => String(call[0]).includes('grant_song'))
    ).toBe(true);
  });
});

describe('spawn_release (M1b)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it("songs:'granted' releases the song granted earlier in the SAME effects block", async () => {
    const fakeTx = { tag: 'week-tx' };
    const { ctx, captures } = buildContext({ dbTransaction: fakeTx });
    await new ActionProcessor().applyEffects(
      ctx,
      {
        grant_song: { title_hint: 'Leaked Demo', quality: 60, artist: 'targeted' },
        spawn_release: { songs: 'granted', type: 'single' },
      },
      ARTIST.id,
      'user_selected',
      'meeting_x',
      'choice_y'
    );

    expect(captures.createdReleases).toHaveLength(1);
    const { release, tx } = captures.createdReleases[0];
    expect(tx).toBe(fakeTx);
    expect(release).toMatchObject({
      gameId: GAME_ID,
      artistId: ARTIST.id,
      title: 'Leaked Demo',
      type: 'single',
      releaseWeek: WEEK + 1, // release_offset_weeks knob (1) — immediate drop next week
      status: 'planned',
      marketingBudget: 0, // default_marketing_budget knob
    });
    expect(release.metadata.attachedHype).toBe(0); // must never drain the label hype pool
    expect(release.metadata.spawnedBy).toEqual({
      meetingName: 'meeting_x',
      choiceId: 'choice_y',
      week: WEEK,
    });

    // Song reserved for the release (songs.releaseId) + junction row, in order.
    expect(captures.songUpdates).toHaveLength(1);
    expect(captures.songUpdates[0]).toMatchObject({
      songId: 'song-created-1',
      updates: { releaseId: 'release-created-1' },
      tx: fakeTx,
    });
    expect(captures.createdReleaseSongs).toHaveLength(1);
    expect(captures.createdReleaseSongs[0].row).toMatchObject({
      releaseId: 'release-created-1',
      songId: 'song-created-1',
      trackNumber: 1,
    });

    const spawned = ctx.summary.changes.filter((c: any) => c.type === 'release_spawned');
    expect(spawned).toHaveLength(1);
    expect(spawned[0].description).toContain('Leaked Demo');
    expect(spawned[0].description).not.toMatch(/\d/);
  });

  it("songs:'latest_recorded' picks the targeted artist's newest recorded, unreleased song deterministically", async () => {
    const artistSongs = [
      { id: 's-old', artistId: ARTIST.id, title: 'Old Cut', isRecorded: true, isReleased: false, releaseId: null, createdWeek: 3 },
      { id: 's-new', artistId: ARTIST.id, title: 'Fresh Cut', isRecorded: true, isReleased: false, releaseId: null, createdWeek: 9 },
      { id: 's-reserved', artistId: ARTIST.id, title: 'Reserved', isRecorded: true, isReleased: false, releaseId: 'rel-x', createdWeek: 11 },
      { id: 's-out', artistId: ARTIST.id, title: 'Already Out', isRecorded: true, isReleased: true, releaseId: null, createdWeek: 10 },
    ];
    const { ctx, captures } = buildContext({ artistSongs });
    await new ActionProcessor().applyEffects(
      ctx,
      { spawn_release: { songs: 'latest_recorded', type: 'single' } },
      ARTIST.id,
      'user_selected',
      'meeting_x',
      'choice_y'
    );
    expect(captures.createdReleases).toHaveLength(1);
    expect(captures.createdReleases[0].release.title).toBe('Fresh Cut');
    expect(captures.createdReleaseSongs[0].row.songId).toBe('s-new');
  });

  it('defer_weeks pushes the release week out beyond the offset knob', async () => {
    const { ctx, captures } = buildContext({
      artistSongs: [
        { id: 's-1', artistId: ARTIST.id, title: 'Held Back', isRecorded: true, isReleased: false, releaseId: null, createdWeek: 5 },
      ],
    });
    await new ActionProcessor().applyEffects(
      ctx,
      { spawn_release: { songs: 'latest_recorded', type: 'single', defer_weeks: 2 } },
      ARTIST.id,
      'user_selected',
      'meeting_x',
      'choice_y'
    );
    expect(captures.createdReleases[0].release.releaseWeek).toBe(WEEK + 1 + 2);
  });

  it("songs:'granted' with no earlier grant_song warns and skips", async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { ctx, captures } = buildContext();
    await new ActionProcessor().applyEffects(
      ctx,
      { spawn_release: { songs: 'granted', type: 'single' } },
      ARTIST.id,
      'user_selected',
      'meeting_x',
      'choice_y'
    );
    expect(captures.createdReleases).toHaveLength(0);
    expect(ctx.summary.changes.filter((c: any) => c.type === 'release_spawned')).toHaveLength(0);
    expect(warnSpy.mock.calls.some((call) => String(call[0]).includes('spawn_release'))).toBe(true);
  });

  it('the granted song does NOT leak across separate applyEffects calls', async () => {
    const { ctx, captures } = buildContext();
    const processor = new ActionProcessor();
    await processor.applyEffects(
      ctx,
      { grant_song: { title_hint: 'One-Off', quality: 50, artist: 'targeted' } },
      ARTIST.id, 'user_selected', 'meeting_x', 'choice_y'
    );
    await processor.applyEffects(
      ctx,
      { spawn_release: { songs: 'granted', type: 'single' } },
      ARTIST.id, 'user_selected', 'meeting_x', 'choice_z'
    );
    expect(captures.createdSongs).toHaveLength(1);
    expect(captures.createdReleases).toHaveLength(0); // handoff is per-call, never persisted
  });
});
