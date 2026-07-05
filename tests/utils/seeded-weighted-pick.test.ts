import { describe, it, expect } from 'vitest';
import { seededWeightedPick, seededRandomPick, generateMeetingSeed } from '@shared/utils/seededRandom';

/**
 * Meeting-relevance Tier 1 (PR-2) — unit tests for seededWeightedPick.
 * Pure, no DB. Sibling of the existing seededRandomPick usage in
 * shared/engine/meetingSelection.ts.
 */

describe('seededWeightedPick', () => {
  it('is deterministic: same array/weights/seed → same pick, repeatedly', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const weights = [1, 1, 2, 1, 1];
    const seed = generateMeetingSeed('game-1', 3, 'cmo');
    const first = seededWeightedPick(items, weights, seed);
    for (let i = 0; i < 10; i++) {
      expect(seededWeightedPick(items, weights, seed)).toBe(first);
    }
  });

  it('single item: always returns it regardless of weights/seed', () => {
    expect(seededWeightedPick(['only'], [5], 'seed-x')).toBe('only');
    expect(seededWeightedPick(['only'], [0], 'seed-y')).toBe('only');
  });

  it('empty array: returns undefined', () => {
    expect(seededWeightedPick([], [], 'seed')).toBeUndefined();
  });

  it('zero-total weights: falls back to uniform seededRandomPick behavior', () => {
    const items = ['a', 'b', 'c'];
    const weights = [0, 0, 0];
    const seed = 'zero-total-seed';
    expect(seededWeightedPick(items, weights, seed)).toBe(seededRandomPick(items, seed));
  });

  it('mismatched-length weights array: falls back to uniform seededRandomPick behavior', () => {
    const items = ['a', 'b', 'c'];
    const weights = [1, 1]; // one short
    const seed = 'mismatched-seed';
    expect(seededWeightedPick(items, weights, seed)).toBe(seededRandomPick(items, seed));
  });

  it('negative weights are clamped to 0, not treated as valid mass', () => {
    // All-negative ⇒ total <= 0 ⇒ uniform fallback.
    const items = ['a', 'b'];
    const seed = 'negative-seed';
    expect(seededWeightedPick(items, [-5, -3], seed)).toBe(seededRandomPick(items, seed));
  });

  it('weight bias sanity: over many seeds, a heavily-weighted item is picked far more often', () => {
    const items = ['boosted', 'plain1', 'plain2', 'plain3', 'plain4'];
    const weights = [8, 1, 1, 1, 1]; // boosted should dominate
    let boostedCount = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      const seed = `bias-check-${i}`;
      if (seededWeightedPick(items, weights, seed) === 'boosted') boostedCount++;
    }
    // Expected share ~= 8/12 = 0.667; assert loose bounds to avoid flakiness.
    const share = boostedCount / N;
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(0.85);
  });

  it('uniform weights (all 1) approximate the plain seededRandomPick distribution', () => {
    const items = ['a', 'b', 'c', 'd'];
    const weights = [1, 1, 1, 1];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    const N = 400;
    for (let i = 0; i < N; i++) {
      const seed = `uniform-check-${i}`;
      const pick = seededWeightedPick(items, weights, seed)!;
      counts[pick]++;
    }
    // Expected ~25% each; loose bounds.
    for (const key of Object.keys(counts)) {
      const share = counts[key] / N;
      expect(share).toBeGreaterThan(0.1);
      expect(share).toBeLessThan(0.45);
    }
  });
});
