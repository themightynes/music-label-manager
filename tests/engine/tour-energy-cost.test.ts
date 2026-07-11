/**
 * C87 — touring consumes artist energy.
 *
 * TourProcessor.applyTourPerformanceImpacts (runs exactly once per city reveal)
 * now drains a flat per-city energy cost from the touring artist:
 *   - accumulated into summary.artistChanges[artistId].energy (same pattern as
 *     mood), with a player-visible `type: 'energy'` change entry,
 *   - knob: markets.json market_formulas.tour_revenue.energy_cost
 *     { enabled, per_city } with fallback defaults (?? 6, enabled !== false),
 *   - DB write + 0–100 clamp happen downstream in ArtistStateProcessor —
 *     TourProcessor adds NO separate floor.
 *
 * GM note: tour revenue pre-calculates ALL cities from starting energy on city 1,
 * so the drain never changes the revenue of the tour that caused it — only the
 * NEXT tour feels it (via energy_effectiveness).
 */
import { describe, it, expect } from 'vitest';
import { TourProcessor } from '@shared/engine/processors/TourProcessor';
import { ArtistStateProcessor } from '@shared/engine/processors/ArtistStateProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import type { WeekSummary, GameChange } from '@shared/types/gameTypes';

const ARTIST = { id: 'artist-1', name: 'Road Dog', popularity: 60, mood: 50, energy: 50 };

/** Minimal ctx for applyTourPerformanceImpacts: summary + storage.getArtist + config. */
function makeCtx(energyCostCfg?: Record<string, any>) {
  const summary = { changes: [], artistChanges: {} } as unknown as WeekSummary;
  const ctx = {
    summary,
    gameState: { id: 'game-1', currentWeek: 3, reputation: 10 },
    storage: { getArtist: async (id: string) => (id === ARTIST.id ? { ...ARTIST } : null) },
    gameData: {
      getBalanceConfigSync: () => ({
        market_formulas: {
          tour_revenue: energyCostCfg === undefined ? {} : { energy_cost: energyCostCfg },
        },
      }),
    },
    getRandom: () => 0.5,
  } as unknown as WeekContext;
  return { ctx, summary };
}

// attendanceRate 60 → 'good' mood band (+5), below the 70 popularity threshold —
// keeps the assertions focused on the energy channel.
const CITY = { attendanceRate: 60, capacity: 500, ticketsSold: 300 };

const proc = new TourProcessor();

describe('C87 — per-city energy drain', () => {
  it('drains the default 6 energy per city reveal into summary.artistChanges', async () => {
    const { ctx, summary } = makeCtx(); // no energy_cost block → fallback defaults
    await proc.applyTourPerformanceImpacts(ctx, ARTIST.id, CITY, undefined);

    expect((summary.artistChanges as any)[ARTIST.id].energy).toBe(-6);

    const entry = summary.changes.find((c: GameChange) => c.type === 'energy');
    expect(entry).toBeDefined();
    expect(entry!.amount).toBe(-6);
    expect(entry!.artistId).toBe(ARTIST.id);
    expect(entry!.description).toBe('Road Dog: -6 energy from the road');
  });

  it('accumulates across multiple city reveals (-6 each → -12)', async () => {
    const { ctx, summary } = makeCtx();
    await proc.applyTourPerformanceImpacts(ctx, ARTIST.id, CITY, undefined);
    await proc.applyTourPerformanceImpacts(ctx, ARTIST.id, CITY, undefined);

    expect((summary.artistChanges as any)[ARTIST.id].energy).toBe(-12);
    expect(summary.changes.filter((c: GameChange) => c.type === 'energy')).toHaveLength(2);
  });

  it('reads per_city from the balance knob (markets.json energy_cost)', async () => {
    const { ctx, summary } = makeCtx({ enabled: true, per_city: 10 });
    await proc.applyTourPerformanceImpacts(ctx, ARTIST.id, CITY, undefined);

    expect((summary.artistChanges as any)[ARTIST.id].energy).toBe(-10);
    const entry = summary.changes.find((c: GameChange) => c.type === 'energy');
    expect(entry!.amount).toBe(-10);
  });

  it('enabled:false short-circuits to zero drain and pushes NO energy entry', async () => {
    const { ctx, summary } = makeCtx({ enabled: false, per_city: 6 });
    await proc.applyTourPerformanceImpacts(ctx, ARTIST.id, CITY, undefined);

    expect((summary.artistChanges as any)[ARTIST.id].energy).toBeUndefined();
    expect(summary.changes.find((c: GameChange) => c.type === 'energy')).toBeUndefined();
  });

  it('does not disturb the mood/popularity reactions (same reveal, same summary)', async () => {
    const { ctx, summary } = makeCtx();
    const reaction = await proc.applyTourPerformanceImpacts(ctx, ARTIST.id, CITY, undefined);

    // 60% attendance → good show (+5 mood), no popularity gain (< 70 threshold).
    expect(reaction).toEqual({ moodChange: 5, popularityChange: 0 });
    expect((summary.artistChanges as any)[ARTIST.id].mood).toBe(5);
    expect(summary.changes.find((c: GameChange) => c.type === 'mood')).toBeDefined();
  });
});

describe('C87 — floor via the downstream clamp path (ArtistStateProcessor)', () => {
  it('a drain past zero clamps to 0 in applyArtistChangesToDatabase (no separate floor in TourProcessor)', async () => {
    const updates: Array<{ id: string; data: any }> = [];
    const tiredArtist = { ...ARTIST, energy: 4 };
    const summary = {
      changes: [],
      artistChanges: { [ARTIST.id]: { energy: -6 } },
    } as unknown as WeekSummary;
    const ctx = {
      summary,
      gameState: { id: 'game-1', currentWeek: 3 },
      storage: {
        getArtistsByGame: async () => [tiredArtist],
        updateArtist: async (id: string, data: any) => { updates.push({ id, data }); },
      },
    } as unknown as WeekContext;

    await new ArtistStateProcessor().applyArtistChangesToDatabase(ctx, undefined);

    expect(updates).toHaveLength(1);
    expect(updates[0].data.energy).toBe(0); // 4 − 6 clamped to the 0 floor
  });
});
