/**
 * Buzz-v2 (Hype & Pre-Marketing) slice 1 — WeekSummary bucket routing.
 *
 * The three banked-hype lifecycle entries MUST land in buckets that WeekSummary
 * actually renders, never in the never-rendered `other` bucket (this repo's
 * recurring swallow-bug). hype_applied/hype_expired render as notable lines;
 * hype_banked renders as a routine line.
 *
 * Pure-module test (no full WeekSummary mount) — routing lives in
 * categorizeWeekChanges.
 */
import { describe, it, expect } from 'vitest';
import { categorizeWeekChanges } from '@/components/week-summary/categorizeChanges';
import type { GameChange } from '@shared/types/gameTypes';

const banked: GameChange = {
  type: 'hype_banked',
  description: '📦 Banked +3 Hype for your next release',
  amount: 3,
  hypeTotal: 3,
};
const applied: GameChange = {
  type: 'hype_applied',
  description: '🚀 Banked Hype seeded "Neon Nights" with +24 starting Buzz',
  amount: 24,
  hypeUnits: 3,
  releaseId: 'r1',
  releaseName: 'Neon Nights',
};
const expired: GameChange = {
  type: 'hype_expired',
  description: '💨 +3 banked Hype faded away unused (no release shipped in 8 weeks)',
  amount: 3,
};

describe('categorizeWeekChanges (buzz-v2 hype routing)', () => {
  it('routes hype_applied and hype_expired into hypeNotable, NOT other', () => {
    const categories = categorizeWeekChanges([applied, expired]);
    expect(categories.hypeNotable).toEqual([applied, expired]);
    expect(categories.other).toEqual([]);
  });

  it('routes hype_banked into hypeRoutine, NOT other', () => {
    const categories = categorizeWeekChanges([banked]);
    expect(categories.hypeRoutine).toEqual([banked]);
    expect(categories.hypeNotable).toEqual([]);
    expect(categories.other).toEqual([]);
  });

  it('keeps the three hype types out of the meetings bucket', () => {
    const categories = categorizeWeekChanges([banked, applied, expired]);
    expect(categories.meetings).toEqual([]);
    expect(categories.other).toEqual([]);
  });
});
