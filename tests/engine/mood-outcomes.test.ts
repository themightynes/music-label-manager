/**
 * Volatility-economy slice 2 — mood responds to outcomes + volatility.
 *
 *  - FLOP → the release artist loses mood (config knob
 *    progression.json reputation_system.flop_artist_mood_penalty, default -8),
 *    applied once inside the same once-only flop gate as the reputation sink.
 *  - BREAKTHROUGH → the song artist gains mood (config knob
 *    markets.json awareness_system.breakthrough_effects.artist_mood_bonus,
 *    default +5), applied at the breakthrough site.
 *  - Passive NATURAL DRIFT amplified (knob liberation): bands + magnitude read
 *    from artists.json artist_stats.mood_drift (drift_amount 8 as of round-2
 *    tuning 2026-07-12, up from 5 / originally 1.5× the old hardcoded 3),
 *    fallback defaults preserve the pre-liberation ±3 / 55-45.
 *
 * All three are arithmetic-only — zero new RNG draws.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ReleaseProcessor } from '@shared/engine/processors/ReleaseProcessor';
import { ArtistStateProcessor } from '@shared/engine/processors/ArtistStateProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import type { WeekSummary } from '@shared/types/gameTypes';

const balanceDir = path.join(process.cwd(), 'data', 'balance');
const progression = JSON.parse(fs.readFileSync(path.join(balanceDir, 'progression.json'), 'utf-8'));
const markets = JSON.parse(fs.readFileSync(path.join(balanceDir, 'markets.json'), 'utf-8'));
const artistsBalance = JSON.parse(fs.readFileSync(path.join(balanceDir, 'artists.json'), 'utf-8'));
const repSystem = progression.reputation_system;
const FLOP_MOOD: number = repSystem.flop_artist_mood_penalty; // -12 (round-2 tuning 2026-07-12)
const BREAKTHROUGH_MOOD: number = markets.market_formulas.awareness_system.breakthrough_effects.artist_mood_bonus; // 5
const DRIFT_CFG = artistsBalance.artist_stats.mood_drift; // { threshold_high:55, threshold_low:45, drift_amount:8 } (round-2 tuning 2026-07-12)

// ---------------------------------------------------------------------------
// FLOP MOOD PENALTY — via ReleaseProcessor.processPlannedReleases (flop gate).
// ---------------------------------------------------------------------------
function buildFlopCtx(opts: { productionBudget: number; revenue: number }) {
  const song = {
    id: 'song-1', artistId: 'artist-1', title: 'Track', quality: 70,
    productionBudget: opts.productionBudget, awareness: 0, peak_awareness: 0,
    isReleased: false, totalStreams: 0, totalRevenue: 0,
  };
  const gameData: any = {
    getBalanceConfigSync: () => ({ reputation_system: repSystem }),
    getAwarenessBoostConfigSync: () => ({ awareness_boost_points_per_unit: 8, pending_awareness_boost_expiry_weeks: 8 }),
    getPlannedReleases: async () => [{
      id: 'release-1', gameId: 'game-1', artistId: 'artist-1', title: 'Neon Nights',
      type: 'single', status: 'planned', releaseWeek: 5, marketingBudget: 0, metadata: {},
    }],
    getSongsByRelease: async () => [song],
    updateReleaseStatus: async () => {},
    updateSongs: async () => {},
  };
  const ctx: WeekContext = {
    gameState: { id: 'game-1', currentWeek: 5, reputation: 50, flags: {} } as any,
    summary: { week: 5, changes: [], revenue: 0, expenses: 0, streams: 0, reputationChanges: {} } as any,
    gameData,
    storage: { getArtist: async () => ({ id: 'artist-1', popularity: 50, name: 'Nova' }) } as any,
    financialSystem: { investmentTracker: null } as any,
    getRandom: (min: number, max: number) => min + 0.5 * (max - min),
    dbTransaction: undefined,
  };
  return { ctx };
}
function stubOutcome(proc: ReleaseProcessor, revenue: number) {
  (proc as any).calculateSophisticatedReleaseOutcome = () => ({
    perSongBreakdown: [{ songId: 'song-1', streams: 1000, revenue }],
    totalStreams: 1000, totalRevenue: revenue,
  });
}

describe('slice 2 — flop mood penalty', () => {
  it('a flop wounds the release artist mood (config knob) with a change entry', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc, 500); // 500 < 0.10 × 12000 (=1200) → flop
    const { ctx } = buildFlopCtx({ productionBudget: 12000, revenue: 500 });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    const moodEntry = (ctx.summary.changes as any[]).find(
      (c) => c.type === 'mood' && c.artistId === 'artist-1' && c.description.includes('flopped'),
    );
    expect(moodEntry).toBeDefined();
    expect(moodEntry.amount).toBe(FLOP_MOOD); // -12
    // Net accumulation: the base +5 single release-mood boost combines with the
    // -12 flop penalty on the same artist → -7 pending in artistChanges.
    expect((ctx.summary.artistChanges as any)['artist-1'].mood).toBe(5 + FLOP_MOOD);
  });

  it('a healthy (non-flop) release applies NO flop mood penalty', async () => {
    const proc = new ReleaseProcessor();
    stubOutcome(proc, 5000); // 5000 ≥ 1200 → healthy
    const { ctx } = buildFlopCtx({ productionBudget: 12000, revenue: 5000 });

    await proc.processPlannedReleases(ctx, ctx.summary, undefined);

    expect((ctx.summary.changes as any[]).some((c) => c.type === 'mood' && c.description.includes('flopped'))).toBe(false);
    // Only the base +5 release-mood boost remains.
    expect((ctx.summary.artistChanges as any)['artist-1'].mood).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// BREAKTHROUGH MOOD BONUS — via ReleaseProcessor.processReleasedProjects.
// Deterministic sin-seed: artistId '...00' → suffix 0, quality 80, currentWeek 4
// (weeksSinceRelease 3), awareness 40, gain 0 → newAwareness 40, potential 0.65,
// seedVal 124 → random ≈ 0.002 < 0.65 → breakthrough fires.
// ---------------------------------------------------------------------------
describe('slice 2 — breakthrough mood bonus', () => {
  it('a breakthrough lifts the song artist mood (config knob) with a change entry', async () => {
    const proc = new ReleaseProcessor();
    const song = {
      id: 'song-1', artistId: 'artist-00', title: 'Anthem', quality: 80,
      awareness: 40, peak_awareness: 40, breakthrough_achieved: false,
      releaseId: 'release-1', releaseWeek: 1, totalStreams: 0, totalRevenue: 0,
    };
    const gameData: any = {
      getReleasedSongs: async () => [song],
      getBalanceConfigSync: () => ({ market_formulas: markets.market_formulas }),
      getStreamingConfigSync: () => markets.market_formulas.streaming_calculation,
      updateSongs: async () => {},
    };
    const summary = { week: 4, changes: [], revenue: 0, expenses: 0, streams: 0, reputationChanges: {}, artistChanges: {} } as unknown as WeekSummary;
    const ctx: WeekContext = {
      gameState: { id: 'game-1', currentWeek: 4 } as any,
      summary,
      gameData,
      storage: {
        getArtistsByGame: async () => [{ id: 'artist-00', name: 'Sol', popularity: 50 }],
        getReleasesByGame: async () => [{ id: 'release-1', metadata: { marketingBudgetBreakdown: { radio: 1000 } } }],
      } as any,
      financialSystem: {
        calculateOngoingSongRevenue: async () => 0,
        calculateAwarenessGain: async () => 0,
      } as any,
      getRandom: () => { throw new Error('breakthrough mood must not draw RNG'); },
      dbTransaction: undefined,
    };

    await proc.processReleasedProjects(ctx, summary);

    // Breakthrough itself fired
    expect(summary.changes.some((c: any) => c.type === 'breakthrough')).toBe(true);
    // Mood bonus applied to the song artist
    const moodEntry = (summary.changes as any[]).find(
      (c) => c.type === 'mood' && c.artistId === 'artist-00' && c.description.includes('broke through'),
    );
    expect(moodEntry).toBeDefined();
    expect(moodEntry.amount).toBe(BREAKTHROUGH_MOOD); // +5
    expect((summary.artistChanges as any)['artist-00'].mood).toBe(BREAKTHROUGH_MOOD);
  });
});

// ---------------------------------------------------------------------------
// NATURAL DRIFT amplification (knob liberation).
// ---------------------------------------------------------------------------
describe('slice 2 — amplified natural mood drift', () => {
  const proc = new ArtistStateProcessor();
  const artist = { id: 'a', name: 'Drift' };

  it('config drift_amount is 8 (round-2 tuning 2026-07-12, up from 5)', () => {
    expect(DRIFT_CFG.drift_amount).toBe(8);
  });

  it('mood above threshold_high drifts DOWN by the configured amount', () => {
    const summary = { changes: [] } as unknown as WeekSummary;
    const drift = proc.calculateNaturalMoodDrift(artist, 70, summary, DRIFT_CFG);
    expect(drift).toBe(-DRIFT_CFG.drift_amount); // -8
    const entry = (summary.changes as any[]).find((c) => c.source === 'weekly_drift');
    expect(entry.amount).toBe(-8);
  });

  it('mood below threshold_low drifts UP by the configured amount', () => {
    const summary = { changes: [] } as unknown as WeekSummary;
    const drift = proc.calculateNaturalMoodDrift(artist, 20, summary, DRIFT_CFG);
    expect(drift).toBe(DRIFT_CFG.drift_amount); // +8
  });

  it('mood inside the band does not drift', () => {
    const summary = { changes: [] } as unknown as WeekSummary;
    expect(proc.calculateNaturalMoodDrift(artist, 50, summary, DRIFT_CFG)).toBe(0);
    expect(summary.changes).toHaveLength(0);
  });

  it('falls back to the pre-liberation ±3 when no config is supplied', () => {
    const summary = { changes: [] } as unknown as WeekSummary;
    expect(proc.calculateNaturalMoodDrift(artist, 70, summary, undefined)).toBe(-3);
  });
});
