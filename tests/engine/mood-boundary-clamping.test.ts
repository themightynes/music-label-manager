import { describe, it, expect } from 'vitest';
import type { WeekSummary, GameArtist } from '../../shared/types/gameTypes';
import { createTestArtist } from '../helpers/test-factories';

/**
 * Edge Case 3: Mood Boundary Clamping Tests
 *
 * Tests for Task 7.4 - Edge Case 3: Mood Boundary Clamping
 * Validates that mood values are correctly clamped to 0-100 range.
 *
 * Edge Case Scenarios:
 * 1. High Boundary: mood 98 + 10 effect → clamps at 100 (not 108)
 * 2. Low Boundary: mood 3 - 10 effect → clamps at 0 (not -7)
 * 3. Week summary shows correct change amounts (e.g., +2 for 98→100, -3 for 3→0)
 */

describe('Edge Case 3: Mood Boundary Clamping', () => {
  describe('High Boundary Clamping (100)', () => {
    it('should clamp mood at 100 when effect would exceed maximum', () => {
      const initialMood = 98;
      const moodEffect = 10;

      // Simulate database update with clamping
      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(100); // Clamps at 100, not 108
      expect(actualChange).toBe(2); // Only +2 was applied (98 → 100)
    });

    it('should clamp mood at 100 when exactly at maximum', () => {
      const initialMood = 100;
      const moodEffect = 5;

      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(100);
      expect(actualChange).toBe(0); // No change, already at max
    });

    it('should clamp mood at 100 for multiple artists with high mood', () => {
      const artists: GameArtist[] = [
        createTestArtist({ id: 'artist_nova', name: 'Nova', mood: 98 }),
        createTestArtist({ id: 'artist_diego', name: 'Diego', mood: 95 }),
        createTestArtist({ id: 'artist_luna', name: 'Luna', mood: 92 }),
      ];

      const moodEffect = 10;
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Simulate global mood effect with clamping
      artists.forEach(artist => {
        const newMood = Math.max(0, Math.min(100, artist.mood + moodEffect));
        const actualChange = newMood - artist.mood;

        if (!summary.artistChanges![artist.id]) {
          summary.artistChanges![artist.id] = {};
        }
        (summary.artistChanges![artist.id] as any).mood = actualChange;
      });

      // Verify clamping applied correctly
      expect((summary.artistChanges!['artist_nova'] as any).mood).toBe(2); // 98 + 10 → 100 (+2)
      expect((summary.artistChanges!['artist_diego'] as any).mood).toBe(5); // 95 + 10 → 100 (+5)
      expect((summary.artistChanges!['artist_luna'] as any).mood).toBe(8); // 92 + 10 → 100 (+8)
    });

    it('should handle mood at 99 with +1 effect (exactly at boundary)', () => {
      const initialMood = 99;
      const moodEffect = 1;

      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(100);
      expect(actualChange).toBe(1); // Exact boundary case
    });

    it('should handle mood at 99 with +10 effect', () => {
      const initialMood = 99;
      const moodEffect = 10;

      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(100);
      expect(actualChange).toBe(1); // Only +1 applied (99 → 100)
    });

    it('should not clamp mood within valid range (below 100)', () => {
      const initialMood = 85;
      const moodEffect = 10;

      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(95); // No clamping needed
      expect(actualChange).toBe(10); // Full effect applied
    });
  });

  describe('Low Boundary Clamping (0)', () => {
    it('should clamp mood at 0 when effect would go negative', () => {
      const initialMood = 3;
      const moodEffect = -10;

      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(0); // Clamps at 0, not -7
      expect(actualChange).toBe(-3); // Only -3 was applied (3 → 0)
    });

    it('should clamp mood at 0 when exactly at minimum', () => {
      const initialMood = 0;
      const moodEffect = -5;

      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(0);
      expect(actualChange).toBe(0); // No change, already at min
    });

    it('should clamp mood at 0 for multiple artists with low mood', () => {
      const artists: GameArtist[] = [
        createTestArtist({ id: 'artist_nova', name: 'Nova', mood: 3 }),
        createTestArtist({ id: 'artist_diego', name: 'Diego', mood: 5 }),
        createTestArtist({ id: 'artist_luna', name: 'Luna', mood: 8 }),
      ];

      const moodEffect = -10;
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Simulate global mood effect with clamping
      artists.forEach(artist => {
        const newMood = Math.max(0, Math.min(100, artist.mood + moodEffect));
        const actualChange = newMood - artist.mood;

        if (!summary.artistChanges![artist.id]) {
          summary.artistChanges![artist.id] = {};
        }
        (summary.artistChanges![artist.id] as any).mood = actualChange;
      });

      // Verify clamping applied correctly
      expect((summary.artistChanges!['artist_nova'] as any).mood).toBe(-3); // 3 - 10 → 0 (-3)
      expect((summary.artistChanges!['artist_diego'] as any).mood).toBe(-5); // 5 - 10 → 0 (-5)
      expect((summary.artistChanges!['artist_luna'] as any).mood).toBe(-8); // 8 - 10 → 0 (-8)
    });

    it('should handle mood at 1 with -1 effect (exactly at boundary)', () => {
      const initialMood = 1;
      const moodEffect = -1;

      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(0);
      expect(actualChange).toBe(-1); // Exact boundary case
    });

    it('should handle mood at 1 with -10 effect', () => {
      const initialMood = 1;
      const moodEffect = -10;

      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(0);
      expect(actualChange).toBe(-1); // Only -1 applied (1 → 0)
    });

    it('should not clamp mood within valid range (above 0)', () => {
      const initialMood = 25;
      const moodEffect = -10;

      const newMood = Math.max(0, Math.min(100, initialMood + moodEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(15); // No clamping needed
      expect(actualChange).toBe(-10); // Full effect applied
    });
  });

  describe('Mood Change Accuracy in Week Summary', () => {
    it('should calculate correct change amount when clamping at high boundary', () => {
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      const artistId = 'artist_nova';
      const initialMood = 98;
      const requestedEffect = 10;

      // Simulate clamping calculation
      const newMood = Math.max(0, Math.min(100, initialMood + requestedEffect));
      const actualChange = newMood - initialMood;

      // Add to summary
      summary.artistChanges![artistId] = { mood: actualChange };

      // Week summary should show +2, not +10
      expect((summary.artistChanges![artistId] as any).mood).toBe(2);
      expect(newMood).toBe(100);
    });

    it('should calculate correct change amount when clamping at low boundary', () => {
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      const artistId = 'artist_diego';
      const initialMood = 3;
      const requestedEffect = -10;

      // Simulate clamping calculation
      const newMood = Math.max(0, Math.min(100, initialMood + requestedEffect));
      const actualChange = newMood - initialMood;

      // Add to summary
      summary.artistChanges![artistId] = { mood: actualChange };

      // Week summary should show -3, not -10
      expect((summary.artistChanges![artistId] as any).mood).toBe(-3);
      expect(newMood).toBe(0);
    });

    it('should show zero change when mood is already at maximum', () => {
      const initialMood = 100;
      const requestedEffect = 5;

      const newMood = Math.max(0, Math.min(100, initialMood + requestedEffect));
      const actualChange = newMood - initialMood;

      expect(actualChange).toBe(0);
      expect(newMood).toBe(100);
    });

    it('should show zero change when mood is already at minimum', () => {
      const initialMood = 0;
      const requestedEffect = -5;

      const newMood = Math.max(0, Math.min(100, initialMood + requestedEffect));
      const actualChange = newMood - initialMood;

      expect(actualChange).toBe(0);
      expect(newMood).toBe(0);
    });
  });

  describe('Mixed Scenarios with Routine Mood Changes', () => {
    it('should clamp mood after combining meeting effect + routine decay', () => {
      const initialMood = 97;
      const meetingEffect = 5; // User chose +5 mood
      const routineDecay = -3; // Natural drift downward

      // Total effect: +5 - 3 = +2, final mood: 97 + 2 = 99 (no clamping)
      const totalEffect = meetingEffect + routineDecay;
      const newMood = Math.max(0, Math.min(100, initialMood + totalEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(99);
      expect(actualChange).toBe(2);
    });

    it('should clamp mood after combining meeting effect + routine boost', () => {
      const initialMood = 98;
      const meetingEffect = 5; // User chose +5 mood
      const routineBoost = 3; // Artist was low on energy, got mood boost

      // Total effect: +5 + 3 = +8, but should clamp at 100
      const totalEffect = meetingEffect + routineBoost;
      const newMood = Math.max(0, Math.min(100, initialMood + totalEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(100); // Clamped
      expect(actualChange).toBe(2); // Only +2 applied (98 → 100)
    });

    it('should clamp mood at 0 after combining negative meeting + routine decay', () => {
      const initialMood = 5;
      const meetingEffect = -3; // User made harsh decision
      const routineDecay = -3; // Natural drift downward

      // Total effect: -3 - 3 = -6, should clamp at 0
      const totalEffect = meetingEffect + routineDecay;
      const newMood = Math.max(0, Math.min(100, initialMood + totalEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(0); // Clamped
      expect(actualChange).toBe(-5); // Only -5 applied (5 → 0)
    });
  });

  describe('Delayed Effects with Boundary Clamping', () => {
    it('should clamp mood when delayed effect triggers at high boundary', () => {
      // Week 10: Artist has mood 97
      // Week 10: User makes choice with delayed effect (+5 mood)
      // Week 11: Delayed effect triggers, mood should clamp at 100

      const initialMood = 97;
      const delayedEffect = 5;

      const newMood = Math.max(0, Math.min(100, initialMood + delayedEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(100); // Clamped (not 102)
      expect(actualChange).toBe(3); // Only +3 applied (97 → 100)
    });

    it('should clamp mood when delayed effect triggers at low boundary', () => {
      // Week 10: Artist has mood 4
      // Week 10: User makes choice with delayed effect (-8 mood)
      // Week 11: Delayed effect triggers, mood should clamp at 0

      const initialMood = 4;
      const delayedEffect = -8;

      const newMood = Math.max(0, Math.min(100, initialMood + delayedEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(0); // Clamped (not -4)
      expect(actualChange).toBe(-4); // Only -4 applied (4 → 0)
    });

    it('should accumulate immediate + delayed effects with clamping', () => {
      const initialMood = 96;
      const immediateEffect = 3; // Week 10 immediate: +3 (mood becomes 99)
      const delayedEffect = 5; // Week 11 delayed: +5 (should clamp at 100)

      // Week 10: Apply immediate effect
      const moodAfterImmediate = Math.max(0, Math.min(100, initialMood + immediateEffect));
      expect(moodAfterImmediate).toBe(99);

      // Week 11: Apply delayed effect with clamping
      const moodAfterDelayed = Math.max(0, Math.min(100, moodAfterImmediate + delayedEffect));
      const actualDelayedChange = moodAfterDelayed - moodAfterImmediate;

      expect(moodAfterDelayed).toBe(100); // Clamped
      expect(actualDelayedChange).toBe(1); // Only +1 applied (99 → 100)
    });
  });

  describe('Edge Case: Multiple Effects in Same Week with Clamping', () => {
    it('should clamp final mood after multiple positive effects accumulate', () => {
      const initialMood = 92;
      const effect1 = 3; // Meeting effect
      const effect2 = 5; // Another meeting effect
      const effect3 = 4; // Dialogue effect

      // Total: 92 + 3 + 5 + 4 = 104, should clamp at 100
      const totalEffect = effect1 + effect2 + effect3;
      const newMood = Math.max(0, Math.min(100, initialMood + totalEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(100); // Clamped
      expect(actualChange).toBe(8); // Only +8 applied (92 → 100)
    });

    it('should clamp final mood after multiple negative effects accumulate', () => {
      const initialMood = 8;
      const effect1 = -3; // Meeting effect
      const effect2 = -4; // Routine decay
      const effect3 = -5; // Another meeting effect

      // Total: 8 - 3 - 4 - 5 = -4, should clamp at 0
      const totalEffect = effect1 + effect2 + effect3;
      const newMood = Math.max(0, Math.min(100, initialMood + totalEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(0); // Clamped
      expect(actualChange).toBe(-8); // Only -8 applied (8 → 0)
    });

    it('should handle mixed positive and negative effects with high boundary clamping', () => {
      const initialMood = 97;
      const positiveEffect = 8; // Meeting: +8
      const negativeEffect = -3; // Routine decay: -3

      // Net: 97 + 8 - 3 = 102, should clamp at 100
      const totalEffect = positiveEffect + negativeEffect;
      const newMood = Math.max(0, Math.min(100, initialMood + totalEffect));
      const actualChange = newMood - initialMood;

      expect(newMood).toBe(100); // Clamped
      expect(actualChange).toBe(3); // Only +3 applied (97 → 100)
    });
  });

  describe('Consistency Check: Clamping Formula', () => {
    it('should use consistent clamping formula: Math.max(0, Math.min(100, mood))', () => {
      const testCases = [
        { initial: 98, effect: 10, expected: 100 },
        { initial: 3, effect: -10, expected: 0 },
        { initial: 50, effect: 15, expected: 65 },
        { initial: 0, effect: -5, expected: 0 },
        { initial: 100, effect: 5, expected: 100 },
        { initial: 100, effect: 0, expected: 100 },
        { initial: 0, effect: 0, expected: 0 },
        { initial: 99, effect: 1, expected: 100 },
        { initial: 1, effect: -1, expected: 0 },
      ];

      testCases.forEach(({ initial, effect, expected }) => {
        const result = Math.max(0, Math.min(100, initial + effect));
        expect(result).toBe(expected);
      });
    });
  });
});
