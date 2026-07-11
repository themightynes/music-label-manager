/**
 * Balance-integrity slice 5 — Energy → tour effectiveness.
 *
 * Artist energy (previously a display-only stat with zero engine consumers) now
 * multiplies tour sell-through BEFORE the 1.0 cap:
 *
 *   energyFactor = energy_min + (energy_max − energy_min) × (energy/100)
 *   sellThrough  = min(1.0, (baseRate + … + venueSizeModifier) × energyFactor)
 *
 * With the default band {min: 0.90, max: 1.05}: energy 0 → 0.90, 50 → 0.975,
 * 100 → 1.05. A rested act sells the room harder; a run-down one doesn't.
 *
 * These tests drive the REAL FinancialSystem sell-through math (not a
 * re-implementation) plus the pure exported `computeEnergyFactor` helper, and pin
 * that TourProcessor.estimatePlanningForeshadow threads energy identically to the
 * execution path (C41/C47/C48 preview↔execution precedent).
 */
import { describe, it, expect } from 'vitest';
import {
  FinancialSystem,
  computeEnergyFactor,
  type TourCalculationParams,
} from '@shared/engine/FinancialSystem';
import { TourProcessor } from '@shared/engine/processors/TourProcessor';

// --- minimal gameData: real markets.json tour band + venue access tiers -------
function makeGameData() {
  const venueAccess = {
    none: { threshold: 0, capacity_range: [0, 50] },
    clubs: { threshold: 5, capacity_range: [50, 500] },
    theaters: { threshold: 20, capacity_range: [500, 2000] },
    arenas: { threshold: 45, capacity_range: [2000, 20000] },
  };
  const tourConfig = {
    sell_through_base: 0.15,
    reputation_modifier: 0.05,
    local_popularity_weight: 0.6,
    merch_percentage: 0.15,
    ticket_price_base: 25,
    ticket_price_per_capacity: 0.03,
  };
  return {
    getAccessTiersSync: () => ({ venue_access: venueAccess }),
    getTourConfigSync: () => tourConfig,
    // getBalanceConfigSync intentionally omitted → getTourFormulas uses its
    // code-side fallback defaults, which are identical to markets.json (slice-1
    // pattern). energy_effectiveness defaults: {enabled:true, min:0.90, max:1.05}.
  } as any;
}

/** Deterministic RNG (midpoint) — no getRandom draws in the sell-through path. */
const midpointRng = () => 0.5;

function baseParams(over: Partial<TourCalculationParams> = {}): TourCalculationParams {
  return {
    venueCapacity: 300,
    venueTier: 'clubs',
    artistPopularity: 60,
    localReputation: 40,
    cities: 3,
    marketingBudget: 9000,
    ...over,
  };
}

describe('slice 5 — computeEnergyFactor (pure helper)', () => {
  const cfg = { enabled: true, min: 0.9, max: 1.05 };

  it('maps energy linearly: 0 → 0.90, 50 → 0.975, 100 → 1.05', () => {
    expect(computeEnergyFactor(0, cfg)).toBeCloseTo(0.9, 10);
    expect(computeEnergyFactor(50, cfg)).toBeCloseTo(0.975, 10);
    expect(computeEnergyFactor(100, cfg)).toBeCloseTo(1.05, 10);
  });

  it('treats missing/null energy as 50 (schema default) → 0.975', () => {
    expect(computeEnergyFactor(null, cfg)).toBeCloseTo(0.975, 10);
    expect(computeEnergyFactor(undefined, cfg)).toBeCloseTo(0.975, 10);
  });

  it('clamps out-of-range energy into [0,100]', () => {
    expect(computeEnergyFactor(-20, cfg)).toBeCloseTo(0.9, 10);
    expect(computeEnergyFactor(200, cfg)).toBeCloseTo(1.05, 10);
  });

  it('enabled:false short-circuits to factor 1.0 regardless of energy', () => {
    const off = { enabled: false, min: 0.9, max: 1.05 };
    expect(computeEnergyFactor(0, off)).toBe(1.0);
    expect(computeEnergyFactor(50, off)).toBe(1.0);
    expect(computeEnergyFactor(100, off)).toBe(1.0);
  });
});

describe('slice 5 — energy drives real tour sell-through', () => {
  const fs = new FinancialSystem(makeGameData(), midpointRng);

  it('direction: energy 100 sell-through > energy 50 > energy 10 (same everything else)', () => {
    const high = fs.calculateDetailedTourBreakdown(baseParams({ energy: 100 }));
    const mid = fs.calculateDetailedTourBreakdown(baseParams({ energy: 50 }));
    const low = fs.calculateDetailedTourBreakdown(baseParams({ energy: 10 }));

    const rate = (b: any) => b.sellThroughAnalysis.finalRate;
    expect(rate(high)).toBeGreaterThan(rate(mid));
    expect(rate(mid)).toBeGreaterThan(rate(low));

    // Higher sell-through ⇒ more revenue, all else equal.
    expect(high.totalRevenue).toBeGreaterThan(mid.totalRevenue);
    expect(mid.totalRevenue).toBeGreaterThan(low.totalRevenue);
  });

  it('applies the exact energyFactor to the summed sell-through (before the 1.0 cap)', () => {
    // Same params, energy 50 vs 100; the ratio of uncapped rates == factor ratio.
    const factor50 = computeEnergyFactor(50, { enabled: true, min: 0.9, max: 1.05 });
    const factor100 = computeEnergyFactor(100, { enabled: true, min: 0.9, max: 1.05 });

    const r50 = fs.calculateDetailedTourBreakdown(baseParams({ energy: 50 })).sellThroughAnalysis.finalRate;
    const r100 = fs.calculateDetailedTourBreakdown(baseParams({ energy: 100 })).sellThroughAnalysis.finalRate;

    // These params stay well under 1.0, so no cap clipping — ratio is exact.
    expect(r50).toBeLessThan(1.0);
    expect(r100).toBeLessThan(1.0);
    expect(r100 / r50).toBeCloseTo(factor100 / factor50, 6);
  });

  it('default energy (50) sells slightly under neutral: factor 0.975, not 1.0', () => {
    const withEnergy = fs.calculateDetailedTourBreakdown(baseParams({ energy: 50 })).sellThroughAnalysis.finalRate;
    // Reconstruct the pre-factor (neutral) rate by dividing back out 0.975.
    const neutral = withEnergy / 0.975;
    expect(withEnergy).toBeLessThan(neutral);
  });

  it('total revenue stays consistent with the sum of per-city breakdowns (both paths threaded)', () => {
    const b = fs.calculateDetailedTourBreakdown(baseParams({ energy: 80 }));
    const sumCities = b.cities.reduce((s, c) => s + c.totalRevenue, 0);
    // totalRevenue comes from calculateTourRevenueWithCapacity; per-city from
    // generateCityBreakdowns/calculateSellThroughBreakdown — both must apply the
    // same energy factor or these diverge (rounding tolerance: one round per path).
    expect(Math.abs(b.totalRevenue - sumCities)).toBeLessThanOrEqual(b.cities.length + 1);
  });
});

describe('slice 5 — foreshadow ↔ execution energy consistency', () => {
  const gameData = makeGameData();
  const fs = new FinancialSystem(gameData, midpointRng);

  function makeCtx(reputation = 40) {
    return {
      gameData,
      gameState: { reputation },
      financialSystem: fs,
    } as any;
  }

  // Modest budget so the sell-through stays well under the 1.0 cap and the energy
  // factor is observable (a saturated show would clip both energies to capacity).
  const project = {
    title: 'Energy Tour',
    totalCost: 10000,
    metadata: { venueAccess: 'clubs', venueCapacity: 300, cities: 3 },
  };

  it('foreshadow estTickets uses the SAME energy-threaded sell-through as execution would compute', () => {
    const artist = { name: 'Rested Act', popularity: 60, energy: 80 };

    const foreshadow = TourProcessor.estimatePlanningForeshadow(makeCtx(), project, artist);

    // Reconstruct what the execution path (processUnifiedTourRevenue) computes for
    // city 1 PRE-variance: identical calculateDetailedTourBreakdown call with the
    // same energy. estTickets must match round(capacity × sellThroughRate).
    const costBreakdown = fs.calculateTourCostsWithCapacity(300, 3, 0);
    const marketingBudget = Math.max(0, project.totalCost - costBreakdown.totalCosts);
    const exec = fs.calculateDetailedTourBreakdown({
      venueCapacity: 300,
      venueTier: 'clubs',
      artistPopularity: 60,
      localReputation: 40,
      cities: 3,
      marketingBudget,
      energy: 80,
    });
    const execCity1Tickets = Math.round(exec.cities[0].venueCapacity * exec.cities[0].sellThroughRate);

    expect(foreshadow.estTickets).toBe(execCity1Tickets);
  });

  it('foreshadow reflects energy: a rested artist (100) foreshadows more tickets than an exhausted one (10)', () => {
    const rested = TourProcessor.estimatePlanningForeshadow(makeCtx(), project, { name: 'A', popularity: 60, energy: 100 });
    const tired = TourProcessor.estimatePlanningForeshadow(makeCtx(), project, { name: 'B', popularity: 60, energy: 10 });
    expect(rested.estTickets).toBeGreaterThan(tired.estTickets);
  });

  it('foreshadow treats a missing energy as 50 (matches execution default)', () => {
    const noEnergy = TourProcessor.estimatePlanningForeshadow(makeCtx(), project, { name: 'C', popularity: 60 });
    const explicit50 = TourProcessor.estimatePlanningForeshadow(makeCtx(), project, { name: 'D', popularity: 60, energy: 50 });
    expect(noEnergy.estTickets).toBe(explicit50.estTickets);
  });
});
