/**
 * Meeting-content session — PER-ARTIST quality_bonus scoping ("hypeArtistPools
 * treatment"), mirroring buzz-v2's awareness_boost artist fork.
 *
 * Designer requirement (v3MacPoolReview.ts scenario `second_album_syndrome`): a
 * meeting choice that pairs quality_bonus with a NAMED/targeted artist must bank a
 * delayed quality_bonus that applies to THAT artist's next recording session only —
 * not the next session by any label-mate.
 *
 * Covers:
 *  (a) ActionProcessor.applyEffects: a user_selected + artistId meeting banks to
 *      flags.qualityBonusArtistPools[artistId] = { amount, week }, NOT the label
 *      pool. Untargeted/global meetings keep banking to flags.pendingQualityBonus.
 *  (b) SongGenerationProcessor.calculateEnhancedSongQuality: an artist pool applies
 *      only to that artist's songs (project.artistId keyed); it stacks additively
 *      with the label-wide pool.
 *  (c) SongGenerationProcessor.processRecordingProjects: the target artist's pool is
 *      consumed + zeroed when THAT artist records; a label-mate who records does not
 *      drain it; two artists keep separate pools.
 *  (d) ActionProcessor.processDelayedEffects: per-artist pools expire after
 *      pending_quality_bonus_expiry_weeks (each pool aged from its own bank week),
 *      and the container is dropped when it empties.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ActionProcessor } from '@shared/engine/processors/ActionProcessor';
import { SongGenerationProcessor } from '@shared/engine/processors/SongGenerationProcessor';
import { FinancialSystem } from '@shared/engine/FinancialSystem';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';
import { createGameData } from './golden-master-fixtures';

const quality = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'quality.json'), 'utf-8'),
);
const EXPIRY_WEEKS = quality.quality_system.pending_quality_bonus_expiry_weeks;

// ---------------------------------------------------------------------------
// (a) Banking scope: ActionProcessor.applyEffects
// ---------------------------------------------------------------------------
function bankingContext(overrides: Partial<WeekContext> = {}): WeekContext {
  const gameState: any = { id: 'g', currentWeek: 5, reputation: 50, creativeCapital: 10, flags: {} };
  return {
    gameState,
    summary: createTestWeekSummary({ week: 5 }),
    gameData: {} as any,
    storage: { getArtist: async (id: string) => ({ id, name: id === 'artist-1' ? 'Nova' : 'Other' }) } as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
    ...overrides,
  };
}

describe('ActionProcessor.applyEffects — quality_bonus artist scoping', () => {
  it('a user_selected + artistId meeting banks to the per-artist pool, not the label pool', async () => {
    const processor = new ActionProcessor();
    const ctx = bankingContext();

    await processor.applyEffects(ctx, { quality_bonus: 6 }, 'artist-1', 'user_selected', 'second_album_syndrome', 'back_the_restart');

    const flags = ctx.gameState.flags as any;
    expect(flags.qualityBonusArtistPools['artist-1']).toEqual({ amount: 6, week: 5 });
    expect('pendingQualityBonus' in flags).toBe(false);
  });

  it('accumulates (signed) within one artist pool and stamps the current week', async () => {
    const processor = new ActionProcessor();
    const ctx = bankingContext();

    await processor.applyEffects(ctx, { quality_bonus: 3 }, 'artist-1', 'user_selected');
    ctx.gameState.currentWeek = 7;
    await processor.applyEffects(ctx, { quality_bonus: -1 }, 'artist-1', 'user_selected');

    const flags = ctx.gameState.flags as any;
    expect(flags.qualityBonusArtistPools['artist-1']).toEqual({ amount: 2, week: 7 });
  });

  it('keeps two targeted artists in separate pools', async () => {
    const processor = new ActionProcessor();
    const ctx = bankingContext();

    await processor.applyEffects(ctx, { quality_bonus: 6 }, 'artist-1', 'user_selected');
    await processor.applyEffects(ctx, { quality_bonus: 3 }, 'artist-2', 'user_selected');

    const flags = ctx.gameState.flags as any;
    expect(flags.qualityBonusArtistPools['artist-1'].amount).toBe(6);
    expect(flags.qualityBonusArtistPools['artist-2'].amount).toBe(3);
  });

  it('untargeted/global meetings still bank to the label-wide pool (backward compatible)', async () => {
    const processor = new ActionProcessor();
    const ctx = bankingContext();

    // No artistId (global)
    await processor.applyEffects(ctx, { quality_bonus: 5 }, undefined, 'global');
    // artistId present but scope is NOT user_selected (e.g. a role meeting) → label pool
    await processor.applyEffects(ctx, { quality_bonus: 2 }, 'artist-1', 'predetermined');

    const flags = ctx.gameState.flags as any;
    expect(flags.pendingQualityBonus).toBe(7);
    expect('qualityBonusArtistPools' in flags).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (b)/(c) Consumption at recording time
// ---------------------------------------------------------------------------
const baseGameData = createGameData({} as any, []);
const fullBalance = {
  ...baseGameData.getBalanceConfigSync(),
  quality_system: quality.quality_system,
  producer_tier_system: quality.producer_tier_system,
};
const gameData: any = { ...baseGameData, getBalanceConfigSync: () => fullBalance };
const proc = new SongGenerationProcessor();
const NEUTRAL_ARTIST = { talent: 50, workEthic: 50, popularity: 0, mood: 50 };

function makeQualityCtx(flags: Record<string, any>): WeekContext {
  const rng = () => 0.5;
  return {
    gameState: { flags } as any,
    summary: { changes: [] } as any,
    gameData,
    storage: {},
    financialSystem: new FinancialSystem(gameData, rng),
    getRandom: (min: number, max: number) => min + rng() * (max - min),
  };
}

function qual(flags: Record<string, any>, artistId: string) {
  return proc.calculateEnhancedSongQuality(
    makeQualityCtx(flags),
    NEUTRAL_ARTIST,
    { type: 'single', songCount: 1, artistId },
    'local',
    'standard',
    4000,
    1,
  );
}

describe('calculateEnhancedSongQuality — per-artist pool consumption', () => {
  it('applies the pool only to the target artist and stacks additively with the label pool', () => {
    const flags = {
      pendingQualityBonus: 2,
      qualityBonusArtistPools: { 'artist-1': { amount: 6, week: 5 } },
    };
    // artist-1: baseline(44) + label(2) + own pool(6) = 52
    expect(qual(flags, 'artist-1')).toBe(52);
    // artist-2: baseline(44) + label(2) only = 46 (never touches artist-1's pool)
    expect(qual(flags, 'artist-2')).toBe(46);
  });

  it('an artist with no pool falls back to label-only (byte-stable with legacy)', () => {
    expect(qual({ qualityBonusArtistPools: { 'artist-1': { amount: 6, week: 5 } } }, 'artist-2')).toBe(44);
  });
});

// ---------------------------------------------------------------------------
// (c) processRecordingProjects — targeted consumption + zeroing
// ---------------------------------------------------------------------------
function recordingGameData(recordingArtistId: string, counter = { count: 0 }) {
  return {
    ...gameData,
    getActiveRecordingProjects: async () => [
      {
        id: 'proj-1', type: 'Single', stage: 'production', songCount: 1, songsCreated: 0,
        artistId: recordingArtistId, gameId: 'game-1', budgetPerSong: 4000,
      },
    ],
    getArtistById: async () => ({ id: recordingArtistId, ...NEUTRAL_ARTIST, genre: 'pop' }),
    createSong: async (song: any) => { counter.count++; return { ...song, id: `song-${counter.count}` }; },
    updateProject: async () => {},
  };
}

function recordingCtx(flags: any, gd: any): WeekContext {
  return {
    gameState: { id: 'game-1', currentWeek: 6, flags } as any,
    summary: { changes: [] } as any,
    gameData: gd,
    storage: {},
    financialSystem: new FinancialSystem(gameData, () => 0.5),
    getRandom: (min: number, max: number) => min + 0.5 * (max - min),
  };
}

describe('processRecordingProjects — per-artist pool consumption + zeroing', () => {
  it('the target artist recording drains + zeroes ONLY its own pool', async () => {
    const flags: any = { qualityBonusArtistPools: { 'artist-1': { amount: 6, week: 5 }, 'artist-2': { amount: 3, week: 5 } } };
    const ctx = recordingCtx(flags, recordingGameData('artist-1'));

    await proc.processRecordingProjects(ctx);

    // artist-1 recorded → its pool zeroed (container keeps artist-2)
    expect(flags.qualityBonusArtistPools['artist-1']).toBeUndefined();
    expect(flags.qualityBonusArtistPools['artist-2']).toEqual({ amount: 3, week: 5 });
    const entry = (ctx.summary.changes as any[]).find(c => c.type === 'meeting' && /quality/i.test(c.description));
    expect(entry?.amount).toBe(6);
  });

  it('a label-mate recording does NOT drain the target artist pool', async () => {
    const flags: any = { qualityBonusArtistPools: { 'artist-1': { amount: 6, week: 5 } } };
    const ctx = recordingCtx(flags, recordingGameData('artist-2'));

    await proc.processRecordingProjects(ctx);

    // artist-2 recorded, but the pool belongs to artist-1 → untouched
    expect(flags.qualityBonusArtistPools['artist-1']).toEqual({ amount: 6, week: 5 });
  });

  it('drops the container entirely once the last pool is consumed (byte-stable)', async () => {
    const flags: any = { qualityBonusArtistPools: { 'artist-1': { amount: 6, week: 5 } } };
    const ctx = recordingCtx(flags, recordingGameData('artist-1'));

    await proc.processRecordingProjects(ctx);

    expect('qualityBonusArtistPools' in flags).toBe(false);
  });

  it('leaves artist pools untouched in a week with no song generation', async () => {
    const gd = {
      ...gameData,
      getActiveRecordingProjects: async () => [
        { id: 'proj-1', type: 'Single', stage: 'writing', songCount: 1, songsCreated: 0, artistId: 'artist-1', gameId: 'game-1' },
      ],
    };
    const flags: any = { qualityBonusArtistPools: { 'artist-1': { amount: 6, week: 5 } } };
    const ctx = recordingCtx(flags, gd);

    await proc.processRecordingProjects(ctx);

    expect(flags.qualityBonusArtistPools['artist-1']).toEqual({ amount: 6, week: 5 });
  });
});

// ---------------------------------------------------------------------------
// (d) Expiry: ActionProcessor.processDelayedEffects
// ---------------------------------------------------------------------------
function expiryGameData(weeks: number) {
  return { getQualityBonusConfigSync: () => ({ pending_quality_bonus_expiry_weeks: weeks }) } as any;
}

function expiryCtx(flags: any, currentWeek: number): WeekContext {
  return {
    gameState: { id: 'g', currentWeek, flags } as any,
    summary: createTestWeekSummary({ week: currentWeek }),
    gameData: expiryGameData(EXPIRY_WEEKS),
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
  };
}

describe('processDelayedEffects — per-artist quality pool expiry', () => {
  it(`expires an unconsumed artist pool at exactly ${EXPIRY_WEEKS} weeks and drops the container`, async () => {
    const processor = new ActionProcessor();
    const flags: any = { qualityBonusArtistPools: { 'artist-1': { amount: 6, week: 5 } } };
    const ctx = expiryCtx(flags, 5 + EXPIRY_WEEKS);

    await processor.processDelayedEffects(ctx);

    expect('qualityBonusArtistPools' in flags).toBe(false);
  });

  it('ages each pool from its own bank week (fresher pool survives, stale one expires)', async () => {
    const processor = new ActionProcessor();
    const flags: any = {
      qualityBonusArtistPools: {
        'artist-1': { amount: 6, week: 5 },                    // stale
        'artist-2': { amount: 3, week: 5 + EXPIRY_WEEKS - 1 }, // fresh
      },
    };
    const ctx = expiryCtx(flags, 5 + EXPIRY_WEEKS);

    await processor.processDelayedEffects(ctx);

    expect(flags.qualityBonusArtistPools['artist-1']).toBeUndefined();
    expect(flags.qualityBonusArtistPools['artist-2']).toEqual({ amount: 3, week: 5 + EXPIRY_WEEKS - 1 });
  });

  it('leaves a pool intact one week before expiry', async () => {
    const processor = new ActionProcessor();
    const flags: any = { qualityBonusArtistPools: { 'artist-1': { amount: 6, week: 5 } } };
    const ctx = expiryCtx(flags, 5 + EXPIRY_WEEKS - 1);

    await processor.processDelayedEffects(ctx);

    expect(flags.qualityBonusArtistPools['artist-1']).toEqual({ amount: 6, week: 5 });
  });
});
