/**
 * Unit tests for the shared admin content-editor helpers (content-editor slice 4,
 * playtest feedback: creation dialogs need a slug generator + uniqueness check).
 */
import { describe, it, expect } from 'vitest';
import { slugifyId, isIdAvailable, orderWithNewestFirst } from '@/admin/utils';

describe('slugifyId', () => {
  it('lowercases and joins words with underscores', () => {
    expect(slugifyId('CMO: Viral Push')).toBe('cmo_viral_push');
  });

  it('collapses repeated non-alphanumeric runs into a single underscore', () => {
    expect(slugifyId('  Multiple   Spaces  ')).toBe('multiple_spaces');
    expect(slugifyId('a---b___c')).toBe('a_b_c');
  });

  it('trims leading and trailing underscores', () => {
    expect(slugifyId('!!!Leading and trailing!!!')).toBe('leading_and_trailing');
  });

  it('preserves already-snake-case input modulo punctuation normalization', () => {
    expect(slugifyId('Already_snake-case!')).toBe('already_snake_case');
  });

  it('handles numbers and mixed case', () => {
    expect(slugifyId('Q3 2026 Campaign')).toBe('q3_2026_campaign');
  });

  it('returns an empty string for input with no alphanumeric content', () => {
    expect(slugifyId('!!!')).toBe('');
  });
});

describe('isIdAvailable', () => {
  const existing = new Set(['action_a', 'action_b', 'action_c']);

  it('returns false for an empty id', () => {
    expect(isIdAvailable('', existing)).toBe(false);
  });

  it('returns false when the id is already present', () => {
    expect(isIdAvailable('action_b', existing)).toBe(false);
  });

  it('returns true when the id is not present', () => {
    expect(isIdAvailable('action_d', existing)).toBe(true);
  });

  it('accepts a plain readonly array as well as a Set', () => {
    const arr = ['x', 'y', 'z'] as const;
    expect(isIdAvailable('y', arr)).toBe(false);
    expect(isIdAvailable('w', arr)).toBe(true);
  });
});

/**
 * Content-editor slice 4 (playtest feedback): newly created items must render at
 * the TOP of the list, newest first, with originals following in their existing
 * order. This is a pure display-order helper — it does not affect what gets
 * written to disk on save.
 */
describe('orderWithNewestFirst', () => {
  it('returns originals unchanged when there are no new items', () => {
    expect(orderWithNewestFirst([], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('places new items before originals', () => {
    const result = orderWithNewestFirst(['new1'], ['orig1', 'orig2']);
    expect(result).toEqual(['new1', 'orig1', 'orig2']);
  });

  it('orders multiple new items newest-first (most recently added first)', () => {
    // newActions accumulates oldest->newest via push; the most recent add
    // (last in the array) should render first.
    const result = orderWithNewestFirst(['new1', 'new2', 'new3'], ['orig1']);
    expect(result).toEqual(['new3', 'new2', 'new1', 'orig1']);
  });

  it('does not mutate the input arrays', () => {
    const newItems = ['new1', 'new2'];
    const originals = ['orig1'];
    orderWithNewestFirst(newItems, originals);
    expect(newItems).toEqual(['new1', 'new2']);
    expect(originals).toEqual(['orig1']);
  });
});
