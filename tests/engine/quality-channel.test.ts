/**
 * Exec-meetings-revival PR-4 (C1) — next-release quality channel unit tests.
 *
 * Covers:
 *  (a) quality_bonus is in LIVE_EFFECT_KEYS.
 *  (b) ActionProcessor.applyEffects: quality_bonus accumulates (signed) into
 *      flags.pendingQualityBonus and stamps flags.pendingQualityBonusWeek.
 *  (c) ActionProcessor.processDelayedEffects: an unconsumed bank expires after
 *      pending_quality_bonus_expiry_weeks weeks (default 8, data/balance/quality.json);
 *      it survives if still within the window; games with no bank in play are
 *      untouched (no stray flags keys added).
 *  (d) SongGenerationProcessor.calculateEnhancedSongQuality: the banked bonus is
 *      applied as an ADDITIVE points adjustment post-formula (positive raises,
 *      negative lowers, floor/ceiling still respected); it does not change the
 *      RNG draw count (draw-order invariance, mirroring the PR-3 press-channel
 *      precedent).
 *  (e) SongGenerationProcessor.processRecordingProjects: the bank is consumed by
 *      ALL songs generated in the week that first consumes it, then zeroed
 *      (stacking across meetings before consumption is exercised via applyEffects
 *      accumulation in (b); zero-after-consumption is exercised here).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ActionProcessor, LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import { SongGenerationProcessor } from '@shared/engine/processors/SongGenerationProcessor';
import { FinancialSystem } from '@shared/engine/FinancialSystem';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary } from '../helpers/test-factories';
import { createGameData } from './golden-master-fixtures';

const quality = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'quality.json'), 'utf-8'),
);

function buildContext(overrides: Partial<WeekContext> = {}): WeekContext {
  const gameState: any = {
    id: 'test-game-state',
    currentWeek: 5,
    reputation: 50,
    creativeCapital: 10,
    flags: {},
  };

  return {
    gameState,
    summary: createTestWeekSummary({ week: 5 }),
    gameData: {} as any,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
    ...overrides,
  };
}

describe('LIVE_EFFECT_KEYS — PR-4 quality channel key', () => {
  it('includes quality_bonus', () => {
    expect(LIVE_EFFECT_KEYS.has('quality_bonus')).toBe(true);
  });
});

describe('ActionProcessor.applyEffects — quality_bonus', () => {
  it('accumulates (signed) into flags.pendingQualityBonus and stamps the week', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { quality_bonus: 5 }, undefined, 'global', 'cco_timeline', 'add_revision');
    expect((ctx.gameState.flags as any).pendingQualityBonus).toBe(5);
    expect((ctx.gameState.flags as any).pendingQualityBonusWeek).toBe(5);

    await processor.applyEffects(ctx, { quality_bonus: -2 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pendingQualityBonus).toBe(3);
  });

  it('stacks two positive meeting bonuses across the same week', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { quality_bonus: 3 }, undefined, 'global');
    await processor.applyEffects(ctx, { quality_bonus: 4 }, undefined, 'global');

    expect((ctx.gameState.flags as any).pendingQualityBonus).toBe(7);
  });

  it('re-stamps pendingQualityBonusWeek to the CURRENT week on a later accumulation', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext();

    await processor.applyEffects(ctx, { quality_bonus: 2 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pendingQualityBonusWeek).toBe(5);

    ctx.gameState.currentWeek = 7;
    await processor.applyEffects(ctx, { quality_bonus: 1 }, undefined, 'global');
    expect((ctx.gameState.flags as any).pendingQualityBonusWeek).toBe(7);
    expect((ctx.gameState.flags as any).pendingQualityBonus).toBe(3);
  });
});

describe('ActionProcessor.processDelayedEffects — pendingQualityBonus expiry', () => {
  const expiryWeeks = quality.quality_system.pending_quality_bonus_expiry_weeks;

  function gameDataWithExpiry(weeks: number) {
    return {
      getQualityBonusConfigSync: () => ({ pending_quality_bonus_expiry_weeks: weeks }),
    } as any;
  }

  it(`clears an unconsumed bank at exactly ${expiryWeeks} weeks unconsumed (default balance knob)`, async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(expiryWeeks) });
    (ctx.gameState.flags as any).pendingQualityBonus = 6;
    (ctx.gameState.flags as any).pendingQualityBonusWeek = 5;
    ctx.gameState.currentWeek = 5 + expiryWeeks;

    await processor.processDelayedEffects(ctx);

    expect((ctx.gameState.flags as any).pendingQualityBonus).toBe(0);
    expect((ctx.gameState.flags as any).pendingQualityBonusWeek).toBeUndefined();
  });

  it('leaves the bank intact one week before expiry', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(expiryWeeks) });
    (ctx.gameState.flags as any).pendingQualityBonus = 6;
    (ctx.gameState.flags as any).pendingQualityBonusWeek = 5;
    ctx.gameState.currentWeek = 5 + expiryWeeks - 1;

    await processor.processDelayedEffects(ctx);

    expect((ctx.gameState.flags as any).pendingQualityBonus).toBe(6);
  });

  it('does not touch flags at all when no bonus is banked (no-flags games stay byte-stable)', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(expiryWeeks) });

    await processor.processDelayedEffects(ctx);

    expect('pendingQualityBonus' in (ctx.gameState.flags as any)).toBe(false);
    expect('pendingQualityBonusWeek' in (ctx.gameState.flags as any)).toBe(false);
  });

  it('reads the expiry window from data/balance/quality.json via getQualityBonusConfigSync', async () => {
    const processor = new ActionProcessor();
    const ctx = buildContext({ gameData: gameDataWithExpiry(2) });
    (ctx.gameState.flags as any).pendingQualityBonus = 6;
    (ctx.gameState.flags as any).pendingQualityBonusWeek = 5;
    ctx.gameState.currentWeek = 7; // exactly 2 weeks later with a 2-week knob

    await processor.processDelayedEffects(ctx);

    expect((ctx.gameState.flags as any).pendingQualityBonus).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Consumption site: SongGenerationProcessor.calculateEnhancedSongQuality
// ---------------------------------------------------------------------------
const baseGameData = createGameData({} as any, []);
const fullBalance = {
  ...baseGameData.getBalanceConfigSync(),
  quality_system: quality.quality_system,
  producer_tier_system: quality.producer_tier_system,
};
const gameData: any = { ...baseGameData, getBalanceConfigSync: () => fullBalance };

function makeQualityCtx(rng: () => number, flags: Record<string, any> = {}): WeekContext {
  const financialSystem = new FinancialSystem(gameData, rng);
  return {
    gameState: { flags } as any,
    summary: { changes: [] } as any,
    gameData,
    storage: {},
    financialSystem,
    getRandom: (min: number, max: number) => min + rng() * (max - min),
  };
}

const proc = new SongGenerationProcessor();
const PROJECT = { type: 'single', songCount: 1 };
const NEUTRAL_ARTIST = { talent: 50, workEthic: 50, popularity: 0, mood: 50 };

function qualWithFlags(flags: Record<string, any>, rngValues: number[] = [0.5, 0.5]) {
  let i = 0;
  const rng = () => rngValues[i++ % rngValues.length];
  return proc.calculateEnhancedSongQuality(
    makeQualityCtx(rng, flags),
    NEUTRAL_ARTIST,
    PROJECT,
    'local',
    'standard',
    4000,
    1,
  );
}

describe('SongGenerationProcessor.calculateEnhancedSongQuality — quality_bonus consumption', () => {
  it('a banked positive bonus raises quality additively over the no-bonus baseline', () => {
    const baseline = qualWithFlags({});
    const boosted = qualWithFlags({ pendingQualityBonus: 6 });
    expect(baseline).toBe(44); // pinned baseline (matches song-quality.test.ts)
    expect(boosted).toBe(50); // +6 additive post-formula
  });

  it('a banked negative bonus lowers quality additively', () => {
    const baseline = qualWithFlags({});
    const penalized = qualWithFlags({ pendingQualityBonus: -5 });
    expect(baseline).toBe(44);
    expect(penalized).toBe(39);
  });

  it('respects the QUALITY_FLOOR (25) even with a large negative bonus', () => {
    const floored = qualWithFlags({ pendingQualityBonus: -100 });
    expect(floored).toBe(25);
  });

  it('respects the QUALITY_CEILING (98) even with a large positive bonus', () => {
    const ceiled = qualWithFlags({ pendingQualityBonus: 100 });
    expect(ceiled).toBe(98);
  });

  it('zero/absent bonus is a pure no-op (backward compatible default)', () => {
    const omitted = qualWithFlags({});
    const explicitZero = qualWithFlags({ pendingQualityBonus: 0 });
    expect(explicitZero).toBe(omitted);
  });

  it('does not change RNG draw count regardless of bonus presence (draw-order invariance)', () => {
    let callsNoBonus = 0;
    let callsWithBonus = 0;

    proc.calculateEnhancedSongQuality(
      makeQualityCtx(() => { callsNoBonus++; return 0.5; }, {}),
      NEUTRAL_ARTIST, PROJECT, 'local', 'standard', 4000, 1,
    );
    proc.calculateEnhancedSongQuality(
      makeQualityCtx(() => { callsWithBonus++; return 0.5; }, { pendingQualityBonus: 6 }),
      NEUTRAL_ARTIST, PROJECT, 'local', 'standard', 4000, 1,
    );

    expect(callsWithBonus).toBe(callsNoBonus);
  });

  it('same seed + same bonus => identical quality (determinism preserved)', () => {
    const q1 = qualWithFlags({ pendingQualityBonus: 4 }, [0.3, 0.7]);
    const q2 = qualWithFlags({ pendingQualityBonus: 4 }, [0.3, 0.7]);
    expect(q1).toBe(q2);
  });
});

// ---------------------------------------------------------------------------
// Consumption + zeroing: SongGenerationProcessor.processRecordingProjects
// ---------------------------------------------------------------------------
function buildRecordingGameData(songsPerCreateSong: { count: number } = { count: 0 }) {
  const createdSongs: any[] = [];
  return {
    ...gameData,
    getActiveRecordingProjects: async () => [
      {
        id: 'proj-1',
        type: 'Single',
        stage: 'production',
        songCount: 1,
        songsCreated: 0,
        artistId: 'artist-1',
        gameId: 'game-1',
        budgetPerSong: 4000,
      },
    ],
    getArtistById: async () => ({ id: 'artist-1', ...NEUTRAL_ARTIST, genre: 'pop' }),
    createSong: async (song: any) => {
      songsPerCreateSong.count++;
      createdSongs.push(song);
      return { ...song, id: `song-${songsPerCreateSong.count}` };
    },
    updateProject: async () => {},
  };
}

describe('SongGenerationProcessor.processRecordingProjects — bank consumption + zeroing', () => {
  it('bank -> generate -> applied and zeroed after the week that consumes it', async () => {
    const counter = { count: 0 };
    const gd = buildRecordingGameData(counter);
    const flags: any = { pendingQualityBonus: 6, pendingQualityBonusWeek: 5 };
    const ctx: WeekContext = {
      gameState: { id: 'game-1', currentWeek: 5, flags } as any,
      summary: { changes: [] } as any,
      gameData: gd,
      storage: {},
      financialSystem: new FinancialSystem(gameData, () => 0.5),
      getRandom: (min: number, max: number) => min + 0.5 * (max - min),
    };

    await proc.processRecordingProjects(ctx);

    expect(counter.count).toBe(1);
    expect(flags.pendingQualityBonus).toBe(0);
    expect(flags.pendingQualityBonusWeek).toBeUndefined();

    const summaryEntry = (ctx.summary.changes as any[]).find((c) => c.type === 'meeting' && /quality/i.test(c.description));
    expect(summaryEntry).toBeDefined();
    expect(summaryEntry.amount).toBe(6);
  });

  it('does not touch flags when no bonus is banked (no stray flags keys)', async () => {
    const counter = { count: 0 };
    const gd = buildRecordingGameData(counter);
    const flags: any = {};
    const ctx: WeekContext = {
      gameState: { id: 'game-1', currentWeek: 5, flags } as any,
      summary: { changes: [] } as any,
      gameData: gd,
      storage: {},
      financialSystem: new FinancialSystem(gameData, () => 0.5),
      getRandom: (min: number, max: number) => min + 0.5 * (max - min),
    };

    await proc.processRecordingProjects(ctx);

    expect(counter.count).toBe(1);
    expect('pendingQualityBonus' in flags).toBe(false);
  });

  it('does not zero the bank in a week where no songs are generated', async () => {
    const gd = {
      ...gameData,
      getActiveRecordingProjects: async () => [
        { id: 'proj-1', type: 'Single', stage: 'writing', songCount: 1, songsCreated: 0, artistId: 'a1', gameId: 'g1' },
      ],
    };
    const flags: any = { pendingQualityBonus: 5, pendingQualityBonusWeek: 5 };
    const ctx: WeekContext = {
      gameState: { id: 'game-1', currentWeek: 5, flags } as any,
      summary: { changes: [] } as any,
      gameData: gd,
      storage: {},
      financialSystem: new FinancialSystem(gameData, () => 0.5),
      getRandom: (min: number, max: number) => min + 0.5 * (max - min),
    };

    await proc.processRecordingProjects(ctx);

    // shouldGenerateProjectSongs requires stage === 'production'; this project is 'writing'
    expect(flags.pendingQualityBonus).toBe(5);
  });
});
