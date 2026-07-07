/**
 * Awareness slice 1: bucket routing.
 *
 * Pure-module tests (house preference, mirrors TourCityCard.test.tsx — no
 * full WeekSummary mount): routing lives in categorizeWeekChanges. The
 * weekly buzz-line aggregation (aggregateAwarenessBuzz/formatBuzzLine) was
 * removed with the WeekSummary buzz line (playtest feedback July 6) — the
 * persistent core-status Buzz stat in MetricsDashboard replaced it (see
 * tests/client/buzz-status.test.tsx). The awareness bucket itself stays so
 * these entries never fall back into the never-rendered `other` bucket.
 * Fixtures mirror the EXACT engine description formats from ReleaseProcessor
 * (~lines 671-783).
 */
import { describe, it, expect } from 'vitest';
import { categorizeWeekChanges } from '@/components/week-summary/categorizeChanges';
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
