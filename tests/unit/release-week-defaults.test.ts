import { describe, it, expect } from 'vitest';
import {
  MIN_RELEASE_LEAD_WEEKS,
  getDefaultReleaseWeek,
  getDefaultLeadSingleWeek,
  resolveReleaseWeek
} from '../../client/src/lib/releaseWeekDefaults';

describe('releaseWeekDefaults', () => {
  describe('getDefaultReleaseWeek', () => {
    it('defaults to the earliest legally schedulable week (currentWeek + min lead)', () => {
      // Server rejects scheduledReleaseWeek <= currentWeek (releasePlanningService),
      // so the earliest legal week is currentWeek + 1.
      expect(MIN_RELEASE_LEAD_WEEKS).toBe(1);
      expect(getDefaultReleaseWeek(1)).toBe(2);
      expect(getDefaultReleaseWeek(5)).toBe(6);
      expect(getDefaultReleaseWeek(23)).toBe(24);
    });

    it('tracks the current week as it advances (no hardcoded week 6)', () => {
      expect(getDefaultReleaseWeek(17)).toBe(18);
      expect(getDefaultReleaseWeek(18)).toBe(19);
    });

    it('falls back to the week-1 default while game state is still loading', () => {
      expect(getDefaultReleaseWeek(null)).toBe(1 + MIN_RELEASE_LEAD_WEEKS);
      expect(getDefaultReleaseWeek(undefined)).toBe(1 + MIN_RELEASE_LEAD_WEEKS);
    });
  });

  describe('resolveReleaseWeek', () => {
    it('snaps an untouched picker to the earliest legal week when game state loads', () => {
      // Page mounts before gameState is available (prev = fallback default 2),
      // then currentWeek 12 arrives.
      expect(resolveReleaseWeek(2, 12, false)).toBe(13);
    });

    it('keeps a player-picked week that is still legal', () => {
      expect(resolveReleaseWeek(20, 12, true)).toBe(20);
    });

    it('clamps a player-picked week forward once it is no longer legal', () => {
      // Picked week 13, weeks advanced to 13 — server would reject <= currentWeek.
      expect(resolveReleaseWeek(13, 13, true)).toBe(14);
      expect(resolveReleaseWeek(13, 15, true)).toBe(16);
    });
  });

  describe('getDefaultLeadSingleWeek', () => {
    it('defaults to one week before the main release', () => {
      expect(getDefaultLeadSingleWeek(24)).toBe(23);
    });
  });
});
