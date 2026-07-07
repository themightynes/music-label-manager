/**
 * Awareness slice 1: bucket routing + buzz-line aggregation.
 *
 * Pure-module tests (house preference, mirrors TourCityCard.test.tsx — no
 * full WeekSummary mount): routing lives in categorizeWeekChanges, the
 * aggregation in aggregateAwarenessBuzz/formatBuzzLine. Fixtures mirror the
 * EXACT engine description formats from ReleaseProcessor (~lines 671-783) —
 * the entries are description-only (amount: 0, no structured songId/delta
 * fields), so the aggregation parses text and must tolerate malformed input.
 */
import { describe, it, expect } from 'vitest';
import {
  categorizeWeekChanges,
  aggregateAwarenessBuzz,
  formatBuzzLine,
  AWARENESS_BUZZ_SUPPRESS_BELOW,
} from '@/components/week-summary/categorizeChanges';
import type { GameChange } from '@shared/types/gameTypes';

// Exact engine shapes (ReleaseProcessor pushes description-only, amount: 0).
const gain = (title: string, delta: string, total: number): GameChange => ({
  type: 'awareness_gain',
  description: `🎯 "${title}" awareness gained +${delta} (${total}/100)`,
  amount: 0,
});
const decay = (title: string, total: number, drop: number): GameChange => ({
  type: 'awareness_decay',
  description: `📉 "${title}" awareness decay ${total}/100 (-${drop})`,
  amount: 0,
});
const BREAKTHROUGH: GameChange = {
  type: 'breakthrough',
  description: '🔥 "Neon Nights" BREAKTHROUGH ACHIEVED! Awareness exploded to 88/100',
  amount: 0,
};

describe('categorizeWeekChanges (awareness routing)', () => {
  it('routes awareness_gain and awareness_decay into the awareness bucket, NOT other', () => {
    const g = gain('Song A', '4.2', 30);
    const d = decay('Song B', 40, 2);
    const categories = categorizeWeekChanges([g, d]);

    expect(categories.awareness).toEqual([g, d]);
    expect(categories.other).toEqual([]);
  });

  it('routes breakthrough into its own breakthroughs bucket, NOT other or awareness', () => {
    const categories = categorizeWeekChanges([BREAKTHROUGH]);

    expect(categories.breakthroughs).toEqual([BREAKTHROUGH]);
    expect(categories.awareness).toEqual([]);
    expect(categories.other).toEqual([]);
  });

  it('leaves unrelated routing untouched alongside awareness entries', () => {
    const revenue: GameChange = { type: 'revenue', description: 'Streaming', amount: 5000 };
    const categories = categorizeWeekChanges([revenue, gain('Song A', '3.0', 20), BREAKTHROUGH]);

    expect(categories.revenue).toEqual([revenue]);
    expect(categories.awareness).toHaveLength(1);
    expect(categories.breakthroughs).toHaveLength(1);
    expect(categories.other).toEqual([]);
  });
});

describe('aggregateAwarenessBuzz', () => {
  it('counts building/fading and sums parsed deltas from descriptions', () => {
    const summary = aggregateAwarenessBuzz([
      gain('Alpha', '5.0', 30),
      gain('Beta', '4.5', 22),
      gain('Gamma', '2.5', 10),
      decay('Old One', 45, 3),
      decay('Old Two', 12, 1),
    ]);

    expect(summary.buildingCount).toBe(3);
    expect(summary.fadingCount).toBe(2);
    expect(summary.totalGain).toBeCloseTo(12.0);
    expect(summary.totalDecay).toBe(4);
    expect(summary.totalMovement).toBeCloseTo(16.0);
  });

  it('names the LARGEST single gain as the top mover', () => {
    const summary = aggregateAwarenessBuzz([
      gain('Small Fry', '1.5', 5),
      gain('Big Hit', '9.0', 60),
      gain('Middling', '4.0', 20),
    ]);
    expect(summary.topMoverTitle).toBe('Big Hit');
  });

  it('tolerates descriptions with missing numbers: still counted, contributes 0', () => {
    const garbled: GameChange = {
      type: 'awareness_gain',
      description: 'awareness moved somehow',
      amount: 0,
    };
    const summary = aggregateAwarenessBuzz([garbled, gain('Real', '3.0', 15)]);

    expect(summary.buildingCount).toBe(2);
    expect(summary.totalGain).toBeCloseTo(3.0);
    expect(summary.topMoverTitle).toBe('Real');
    expect(Number.isNaN(summary.totalMovement)).toBe(false);
  });

  it('tolerates a decay description without the (-D) suffix', () => {
    const garbled: GameChange = {
      type: 'awareness_decay',
      description: '📉 "Faded" awareness decay',
      amount: 0,
    };
    const summary = aggregateAwarenessBuzz([garbled]);
    expect(summary.fadingCount).toBe(1);
    expect(summary.totalDecay).toBe(0);
  });

  it('ignores non-awareness change types entirely', () => {
    const summary = aggregateAwarenessBuzz([
      BREAKTHROUGH,
      { type: 'revenue', description: '+9999 not awareness', amount: 9999 },
    ]);
    expect(summary.buildingCount).toBe(0);
    expect(summary.fadingCount).toBe(0);
    expect(summary.totalMovement).toBe(0);
  });

  it('returns an empty summary for an empty bucket', () => {
    const summary = aggregateAwarenessBuzz([]);
    expect(summary).toEqual({
      buildingCount: 0,
      fadingCount: 0,
      totalGain: 0,
      totalDecay: 0,
      topMoverTitle: null,
      totalMovement: 0,
    });
  });
});

describe('formatBuzzLine', () => {
  it('renders the aggregated line with counts, total gain, fading, and top mover', () => {
    const line = formatBuzzLine(
      aggregateAwarenessBuzz([
        gain('Alpha', '5.0', 30),
        gain('Beta', '4.5', 22),
        gain('Gamma', '2.5', 10),
        decay('Old One', 45, 3),
        decay('Old Two', 12, 1),
      ]),
    );
    expect(line).toBe('🎯 Buzz: 3 songs building (+12) · 2 fading — led by "Alpha"');
  });

  it('SUPPRESSES the line when total movement is under the threshold (spec §2.1)', () => {
    // 1.0 gain + 1 decay = 2 total movement < 3 → nothing rendered.
    const line = formatBuzzLine(
      aggregateAwarenessBuzz([gain('Quiet', '1.0', 5), decay('Old', 10, 1)]),
    );
    expect(line).toBeNull();
    expect(AWARENESS_BUZZ_SUPPRESS_BELOW).toBe(3);
  });

  it('renders at exactly the threshold (>= semantics)', () => {
    const line = formatBuzzLine(aggregateAwarenessBuzz([gain('Edge', '3.0', 10)]));
    expect(line).toBe('🎯 Buzz: 1 song building (+3) — led by "Edge"');
  });

  it('handles a decay-only week (no building segment)', () => {
    const line = formatBuzzLine(
      aggregateAwarenessBuzz([decay('One', 40, 2), decay('Two', 30, 2)]),
    );
    expect(line).toBe('🎯 Buzz: 2 fading');
  });

  it('returns null for an empty week', () => {
    expect(formatBuzzLine(aggregateAwarenessBuzz([]))).toBeNull();
  });

  it('never shows a multiplier number (fork E: qualitative only)', () => {
    const line = formatBuzzLine(
      aggregateAwarenessBuzz([gain('Alpha', '8.0', 80), decay('Beta', 70, 4)]),
    );
    expect(line).not.toMatch(/[×x]\s*\d/);
  });
});
