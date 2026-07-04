/**
 * Email Narrative Phase 1 — mood banding + deterministic selection helpers.
 *
 * Covers band boundaries (guide thresholds), out-of-range/undefined clamping,
 * and the determinism guarantees of stableHash / pickVariant / pickFlag /
 * narrativeTimestamp (no RNG, no Math.random(); byte-identical for equal input).
 */
import { describe, it, expect } from 'vitest';
import {
  moodToBand,
  stableHash,
  pickVariant,
  pickFlag,
  narrativeTimestamp,
} from '@shared/engine/emailNarrative';

describe('moodToBand — boundaries', () => {
  it('maps exact lower bounds to the correct band', () => {
    expect(moodToBand(80)).toBe('excellent');
    expect(moodToBand(60)).toBe('good');
    expect(moodToBand(40)).toBe('neutral');
    expect(moodToBand(20)).toBe('poor');
    expect(moodToBand(0)).toBe('terrible');
  });

  it('maps just-below-boundary values to the lower band', () => {
    expect(moodToBand(79)).toBe('good');
    expect(moodToBand(59)).toBe('neutral');
    expect(moodToBand(39)).toBe('poor');
    expect(moodToBand(19)).toBe('terrible');
  });

  it('treats 50 (engine neutral default) as neutral', () => {
    expect(moodToBand(50)).toBe('neutral');
  });

  it('clamps out-of-range moods', () => {
    expect(moodToBand(-10)).toBe('terrible');
    expect(moodToBand(150)).toBe('excellent');
    expect(moodToBand(100)).toBe('excellent');
  });

  it('falls back to neutral for undefined/null/NaN', () => {
    expect(moodToBand(undefined)).toBe('neutral');
    expect(moodToBand(null)).toBe('neutral');
    expect(moodToBand(NaN)).toBe('neutral');
  });
});

describe('stableHash — deterministic', () => {
  it('is stable across calls', () => {
    expect(stableHash('game-1|5|ar|')).toBe(stableHash('game-1|5|ar|'));
  });

  it('differs for different inputs (very likely)', () => {
    expect(stableHash('a')).not.toBe(stableHash('b'));
  });

  it('returns an unsigned 32-bit integer', () => {
    const h = stableHash('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('pickVariant / pickFlag — deterministic', () => {
  const seed = { gameId: 'game-1', week: 5, category: 'ar' as const };

  it('picks the same variant for identical seeds', () => {
    const variants = ['a', 'b', 'c', 'd'];
    const first = pickVariant(variants, { ...seed, discriminator: 'x' });
    const second = pickVariant(variants, { ...seed, discriminator: 'x' });
    expect(first).toBe(second);
  });

  it('can pick different variants for different discriminators', () => {
    const variants = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const picks = new Set(
      ['x', 'y', 'z', 'q', 'r'].map((d) => pickVariant(variants, { ...seed, discriminator: d })),
    );
    // Not a strict guarantee, but the hash should spread across at least 2 buckets.
    expect(picks.size).toBeGreaterThan(1);
  });

  it('pickFlag is stable for identical seeds', () => {
    const a = pickFlag({ ...seed, discriminator: 'tuesday' }, 4);
    const b = pickFlag({ ...seed, discriminator: 'tuesday' }, 4);
    expect(a).toBe(b);
  });

  it('throws on empty variant list', () => {
    expect(() => pickVariant([], seed)).toThrow();
  });
});

describe('narrativeTimestamp — deterministic, in-character', () => {
  const seed = { gameId: 'game-1', week: 3, category: 'ar' };

  it('is byte-identical for identical inputs', () => {
    expect(narrativeTimestamp('head_ar', seed)).toBe(narrativeTimestamp('head_ar', seed));
  });

  it('Mac gets a 2-4 AM late-night timestamp', () => {
    const ts = narrativeTimestamp('head_ar', seed);
    expect(ts).toMatch(/^Sent at [234]:\d{2} AM$/);
  });

  it('Dante gets a cosmic-window timestamp', () => {
    const ts = narrativeTimestamp('cco', { ...seed, category: 'financial' });
    expect(ts).toContain('cosmic window');
  });

  it('Pat gets a scheduled on-the-quarter timestamp', () => {
    const ts = narrativeTimestamp('head_distribution', { ...seed, category: 'artist' });
    expect(ts).toMatch(/(00|15|30|45) (AM|PM) \(scheduled\)$/);
  });
});
