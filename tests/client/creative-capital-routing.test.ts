/**
 * PENDING-DECISIONS #9 — WeekSummary bucket routing for the chart-milestone
 * Creative Capital grant.
 *
 * The 'creative_capital' change entry MUST land in the rendered Achievements
 * bucket (alongside the chart-milestone reputation line it accompanies), never
 * in the never-rendered `other` bucket (this repo's recurring swallow-bug).
 *
 * Pure-module test (no full WeekSummary mount) — routing lives in
 * categorizeWeekChanges.
 */
import { describe, it, expect } from 'vitest';
import { categorizeWeekChanges } from '@/components/week-summary/categorizeChanges';
import type { GameChange } from '@shared/types/gameTypes';

const ccGrant: GameChange = {
  type: 'creative_capital',
  description: "Creative spark: Neon Nights's chart run inspires the label (+1 creative capital)",
  amount: 1,
};
const chartRep: GameChange = {
  type: 'reputation',
  description: 'Chart smash: Neon Nights hit the Top 10 debut (+5 reputation)',
  amount: 5,
};

describe('categorizeWeekChanges (chart-milestone creative capital routing)', () => {
  it('routes creative_capital into achievements, NOT other', () => {
    const categories = categorizeWeekChanges([ccGrant]);
    expect(categories.achievements).toEqual([ccGrant]);
    expect(categories.other).toEqual([]);
  });

  it('rides the same Achievements card as the chart-milestone reputation line', () => {
    const categories = categorizeWeekChanges([chartRep, ccGrant]);
    expect(categories.achievements).toEqual([chartRep, ccGrant]);
    expect(categories.other).toEqual([]);
  });
});
