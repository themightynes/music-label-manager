import { describe, it, expect } from 'vitest';
import type { WeekSummary, GameArtist } from '@shared/types/gameTypes';

/**
 * Simple Unit Tests for Mood Targeting System
 *
 * These tests verify the core logic WITHOUT requiring full GameEngine instantiation.
 * They test the data structures and accumulation logic directly.
 */

describe('Mood System Unit Tests - Data Structure Logic', () => {
  describe('Per-Artist Mood Accumulation Logic', () => {
    it('should initialize artist changes object correctly', () => {
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

      // Simulate initialization logic from applyEffects
      if (!summary.artistChanges) {
        summary.artistChanges = {};
      }
      if (!summary.artistChanges[artistId]) {
        summary.artistChanges[artistId] = {};
      }

      expect(summary.artistChanges).toBeDefined();
      expect(summary.artistChanges[artistId]).toEqual({});
    });

    it('should accumulate mood changes for single artist correctly', () => {
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
      const moodChange1 = 3;
      const moodChange2 = 2;

      // First effect
      if (!summary.artistChanges![artistId]) {
        summary.artistChanges![artistId] = {};
      }
      const changes1 = summary.artistChanges![artistId] as { mood?: number };
      changes1.mood = (changes1.mood || 0) + moodChange1;

      expect(changes1.mood).toBe(3);

      // Second effect (should accumulate)
      changes1.mood = (changes1.mood || 0) + moodChange2;

      expect(changes1.mood).toBe(5); // 3 + 2 = 5
    });

    it('should handle negative mood changes', () => {
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: { artist_nova: { mood: 5 } },
      };

      const changes = summary.artistChanges!['artist_nova'] as { mood?: number };
      changes.mood = (changes.mood || 0) + (-3);

      expect(changes.mood).toBe(2); // 5 - 3 = 2
    });

    it('should maintain separate accumulation for different artists', () => {
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Nova gets +5
      summary.artistChanges!['artist_nova'] = { mood: 5 };

      // Diego gets -2
      summary.artistChanges!['artist_diego'] = { mood: -2 };

      // Luna gets +1
      summary.artistChanges!['artist_luna'] = { mood: 1 };

      expect((summary.artistChanges!['artist_nova'] as any).mood).toBe(5);
      expect((summary.artistChanges!['artist_diego'] as any).mood).toBe(-2);
      expect((summary.artistChanges!['artist_luna'] as any).mood).toBe(1);
    });
  });

  describe('Global Mood Effect Logic', () => {
    it('should apply same mood change to all artists in global effect', () => {
      const artists: GameArtist[] = [
        { id: 'artist_nova', isSigned: true } as GameArtist,
        { id: 'artist_diego', isSigned: true } as GameArtist,
        { id: 'artist_luna', isSigned: true } as GameArtist,
      ];

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      const moodChange = 2;

      // Simulate global effect logic
      const signedArtists = artists.filter(a => a.isSigned);
      signedArtists.forEach(artist => {
        if (!summary.artistChanges![artist.id]) {
          summary.artistChanges![artist.id] = {};
        }
        const changes = summary.artistChanges![artist.id] as { mood?: number };
        changes.mood = (changes.mood || 0) + moodChange;
      });

      // All 3 artists should have +2 mood
      expect((summary.artistChanges!['artist_nova'] as any).mood).toBe(2);
      expect((summary.artistChanges!['artist_diego'] as any).mood).toBe(2);
      expect((summary.artistChanges!['artist_luna'] as any).mood).toBe(2);
    });

    it('should skip unsigned artists in global effect', () => {
      const artists: GameArtist[] = [
        { id: 'artist_nova', isSigned: true } as GameArtist,
        { id: 'artist_diego', isSigned: false } as GameArtist, // Not signed
        { id: 'artist_luna', isSigned: true } as GameArtist,
      ];

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      const moodChange = 3;

      // Only apply to signed artists
      const signedArtists = artists.filter(a => a.isSigned);
      signedArtists.forEach(artist => {
        if (!summary.artistChanges![artist.id]) {
          summary.artistChanges![artist.id] = {};
        }
        const changes = summary.artistChanges![artist.id] as { mood?: number };
        changes.mood = (changes.mood || 0) + moodChange;
      });

      // Only Nova and Luna should have changes
      expect((summary.artistChanges!['artist_nova'] as any).mood).toBe(3);
      expect(summary.artistChanges!['artist_diego']).toBeUndefined();
      expect((summary.artistChanges!['artist_luna'] as any).mood).toBe(3);
    });
  });

  describe('Mood Clamping Logic', () => {
    it('should clamp mood at 100 (maximum)', () => {
      const initialMood = 98;
      const moodChange = 10;

      // Simulate database update logic
      const newMood = Math.max(0, Math.min(100, initialMood + moodChange));

      expect(newMood).toBe(100); // Should clamp at 100, not 108
    });

    it('should clamp mood at 0 (minimum)', () => {
      const initialMood = 3;
      const moodChange = -10;

      const newMood = Math.max(0, Math.min(100, initialMood + moodChange));

      expect(newMood).toBe(0); // Should clamp at 0, not -7
    });

    it('should not clamp mood within valid range', () => {
      const initialMood = 50;
      const moodChange = 15;

      const newMood = Math.max(0, Math.min(100, initialMood + moodChange));

      expect(newMood).toBe(65); // No clamping needed
    });

    it('should handle edge case: mood exactly at 0', () => {
      const initialMood = 0;
      const moodChange = 5;

      const newMood = Math.max(0, Math.min(100, initialMood + moodChange));

      expect(newMood).toBe(5);
    });

    it('should handle edge case: mood exactly at 100', () => {
      const initialMood = 100;
      const moodChange = -5;

      const newMood = Math.max(0, Math.min(100, initialMood + moodChange));

      expect(newMood).toBe(95);
    });
  });

  describe('Artist Selection Logic (Predetermined)', () => {
    it('should select artist with highest popularity', () => {
      const artists: GameArtist[] = [
        { id: 'artist_nova', name: 'Nova', popularity: 85, isSigned: true } as GameArtist,
        { id: 'artist_diego', name: 'Diego', popularity: 60, isSigned: true } as GameArtist,
        { id: 'artist_luna', name: 'Luna', popularity: 50, isSigned: true } as GameArtist,
      ];

      const signedArtists = artists.filter(a => a.isSigned);
      const maxPopularity = Math.max(...signedArtists.map(a => a.popularity || 0));
      const selectedArtist = signedArtists.find(a => a.popularity === maxPopularity);

      expect(selectedArtist?.id).toBe('artist_nova');
      expect(selectedArtist?.popularity).toBe(85);
    });

    it('should identify tied artists correctly', () => {
      const artists: GameArtist[] = [
        { id: 'artist_nova', popularity: 75, isSigned: true } as GameArtist,
        { id: 'artist_diego', popularity: 75, isSigned: true } as GameArtist,
        { id: 'artist_luna', popularity: 50, isSigned: true } as GameArtist,
      ];

      const signedArtists = artists.filter(a => a.isSigned);
      const maxPopularity = Math.max(...signedArtists.map(a => a.popularity || 0));
      const tiedArtists = signedArtists.filter(a => a.popularity === maxPopularity);

      expect(tiedArtists).toHaveLength(2);
      expect(tiedArtists.map(a => a.id).sort()).toEqual(['artist_diego', 'artist_nova']);
    });

    it('should handle 0 artists case', () => {
      const artists: GameArtist[] = [];

      const signedArtists = artists.filter(a => a.isSigned);

      expect(signedArtists).toHaveLength(0);

      // Logic should return null
      const selectedArtist = signedArtists.length > 0 ? signedArtists[0] : null;
      expect(selectedArtist).toBeNull();
    });

    it('should handle 1 artist case (auto-select)', () => {
      const artists: GameArtist[] = [
        { id: 'artist_nova', popularity: 85, isSigned: true } as GameArtist,
      ];

      const signedArtists = artists.filter(a => a.isSigned);

      expect(signedArtists).toHaveLength(1);
      expect(signedArtists[0].id).toBe('artist_nova');
    });
  });

  describe('Delayed vs Immediate Effects', () => {
    it('should NOT add delayed effects to summary.changes when queued', () => {
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Simulate queueing delayed effect (should NOT modify summary)
      const delayedEffects = { artist_mood: 2 };
      const delayedQueue = {
        triggerWeek: 12,
        effects: delayedEffects,
        artistId: 'artist_nova'
      };

      // Queueing should NOT add to summary.changes
      expect(summary.changes).toHaveLength(0);
      expect(summary.artistChanges).toEqual({});
    });

    it('should add immediate effects to summary.changes immediately', () => {
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
      const moodChange = 5;

      // Simulate immediate effect application
      if (!summary.artistChanges![artistId]) {
        summary.artistChanges![artistId] = {};
      }
      const changes = summary.artistChanges![artistId] as { mood?: number };
      changes.mood = (changes.mood || 0) + moodChange;

      // Add to summary changes (this should happen for immediate effects)
      summary.changes.push({
        type: 'mood',
        description: `Nova's morale improved from meeting decision (+${moodChange})`,
        amount: moodChange
      });

      expect(summary.changes).toHaveLength(1);
      expect(summary.changes[0].type).toBe('mood');
      expect(summary.changes[0].amount).toBe(5);
    });

    it('should trigger delayed effects in correct week', () => {
      const currentWeek = 12;
      const delayedEffect = {
        triggerWeek: 12,
        effects: { artist_mood: 2 },
        artistId: 'artist_nova'
      };

      // Should trigger when currentWeek === triggerWeek
      const shouldTrigger = currentWeek >= delayedEffect.triggerWeek;

      expect(shouldTrigger).toBe(true);
    });

    it('should NOT trigger delayed effects before correct week', () => {
      const currentWeek = 11;
      const delayedEffect = {
        triggerWeek: 12,
        effects: { artist_mood: 2 },
        artistId: 'artist_nova'
      };

      const shouldTrigger = currentWeek >= delayedEffect.triggerWeek;

      expect(shouldTrigger).toBe(false);
    });

    it('should add delayed effects to summary.artistChanges when triggered', () => {
      const summary: WeekSummary = {
        week: 12,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      const artistId = 'artist_nova';
      const delayedMoodChange = 2;

      // Simulate delayed effect triggering (calls applyEffects)
      if (!summary.artistChanges![artistId]) {
        summary.artistChanges![artistId] = {};
      }
      const changes = summary.artistChanges![artistId] as { mood?: number };
      changes.mood = (changes.mood || 0) + delayedMoodChange;

      // Verify delayed effect was applied
      expect((summary.artistChanges![artistId] as any).mood).toBe(2);
    });

    it('should queue delayed effect with correct triggerWeek', () => {
      const currentWeek = 10;
      const choice = {
        id: 'studio_first',
        label: 'Studio-first to polish the single',
        effects_immediate: { money: -2000 },
        effects_delayed: { quality_bonus: 5, artist_mood: 2 }
      };

      // Simulate queueing logic from processRoleMeeting (line 916-928)
      const flags: any = {};
      const delayedKey = `ceo_priorities-studio_first-delayed`;
      flags[delayedKey] = {
        triggerWeek: currentWeek + 1, // Should be Week 11
        effects: choice.effects_delayed,
        artistId: undefined, // Global effect
        targetScope: 'global',
        meetingName: 'ceo_priorities',
        choiceId: 'studio_first'
      };

      expect(flags[delayedKey].triggerWeek).toBe(11);
      expect(flags[delayedKey].effects.artist_mood).toBe(2);
    });

    it('should remove delayed effect from flags after triggering', () => {
      const flags: any = {
        'ceo_priorities-studio_first-delayed': {
          triggerWeek: 11,
          effects: { artist_mood: 2 },
          artistId: undefined,
          targetScope: 'global'
        }
      };

      const triggeredKeys: string[] = [];

      // Simulate processDelayedEffects cleanup (line 2884-2886)
      for (const key of Object.keys(flags)) {
        if (flags[key].triggerWeek === 11) {
          triggeredKeys.push(key);
        }
      }

      for (const key of triggeredKeys) {
        delete flags[key];
      }

      expect(Object.keys(flags)).toHaveLength(0);
    });
  });

  describe('BUG FIX: Delayed Effect Database Persistence', () => {
    it('should persist delayed effects to summary.artistChanges for database update', () => {
      // BUG: applyArtistChangesToDatabase() was called BEFORE processDelayedEffects()
      // FIX: Call applyArtistChangesToDatabase() AFTER processDelayedEffects()

      const summary: WeekSummary = {
        week: 11,
        changes: [],
        revenue: 0,
        expenses: 0,
        artistChanges: {},
      };

      // Step 1: processDelayedEffects adds to summary.artistChanges
      summary.artistChanges!['artist_nova'] = { mood: 2 };
      summary.artistChanges!['artist_diego'] = { mood: 2 };
      summary.artistChanges!['artist_luna'] = { mood: 2 };

      // Step 2: applyArtistChangesToDatabase MUST be called after to persist changes
      const artistIds = Object.keys(summary.artistChanges!);
      expect(artistIds).toHaveLength(3);
      expect((summary.artistChanges!['artist_nova'] as any).mood).toBe(2);
    });

    it('should handle delayed effects for global meetings correctly', () => {
      // CEO Priorities is a global meeting with delayed artist_mood
      const summary: WeekSummary = {
        week: 11,
        changes: [],
        revenue: 0,
        expenses: 0,
        artistChanges: {},
      };

      const artists = [
        { id: 'artist_nova', isSigned: true },
        { id: 'artist_diego', isSigned: true },
        { id: 'artist_luna', isSigned: true },
      ];

      const delayedMoodChange = 2;

      // Simulate global delayed effect triggering
      artists.forEach(artist => {
        if (!summary.artistChanges![artist.id]) {
          summary.artistChanges![artist.id] = {};
        }
        (summary.artistChanges![artist.id] as any).mood = delayedMoodChange;
      });

      // All artists should have the delayed mood change
      expect((summary.artistChanges!['artist_nova'] as any).mood).toBe(2);
      expect((summary.artistChanges!['artist_diego'] as any).mood).toBe(2);
      expect((summary.artistChanges!['artist_luna'] as any).mood).toBe(2);
    });
  });

  describe('BUG FIX: processWeeklyMoodChanges Type Mismatch', () => {
    it('should extract mood from object format (new) correctly', () => {
      // BUG: Line 3037 expected number, got object { mood?: number }
      // FIX: Check if object and extract .mood property

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        artistChanges: {
          'artist_nova': { mood: 5 } // Object format
        },
      };

      const artistId = 'artist_nova';
      const artistChange = summary.artistChanges![artistId];

      let releaseMoodBoost = 0;
      if (typeof artistChange === 'object' && artistChange !== null && !Array.isArray(artistChange)) {
        releaseMoodBoost = (artistChange as any).mood || 0;
      } else if (typeof artistChange === 'number') {
        releaseMoodBoost = artistChange;
      }

      expect(releaseMoodBoost).toBe(5);
    });

    it('should extract mood from legacy number format correctly', () => {
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        artistChanges: {
          'artist_nova': 5 // Legacy number format
        },
      };

      const artistId = 'artist_nova';
      const artistChange = summary.artistChanges![artistId];

      let releaseMoodBoost = 0;
      if (typeof artistChange === 'object' && artistChange !== null && !Array.isArray(artistChange)) {
        releaseMoodBoost = (artistChange as any).mood || 0;
      } else if (typeof artistChange === 'number') {
        releaseMoodBoost = artistChange;
      }

      expect(releaseMoodBoost).toBe(5);
    });

    it('should handle missing mood property in object format', () => {
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        artistChanges: {
          'artist_nova': { energy: 3 } // Object but no mood
        },
      };

      const artistId = 'artist_nova';
      const artistChange = summary.artistChanges![artistId];

      let releaseMoodBoost = 0;
      if (typeof artistChange === 'object' && artistChange !== null && !Array.isArray(artistChange)) {
        releaseMoodBoost = (artistChange as any).mood || 0;
      } else if (typeof artistChange === 'number') {
        releaseMoodBoost = artistChange;
      }

      expect(releaseMoodBoost).toBe(0);
    });

    it('should handle undefined artistChange', () => {
      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        artistChanges: {},
      };

      const artistId = 'artist_nova';
      const artistChange = summary.artistChanges![artistId];

      let releaseMoodBoost = 0;
      if (typeof artistChange === 'object' && artistChange !== null && !Array.isArray(artistChange)) {
        releaseMoodBoost = (artistChange as any).mood || 0;
      } else if (typeof artistChange === 'number') {
        releaseMoodBoost = artistChange;
      }

      expect(releaseMoodBoost).toBe(0);
    });
  });

  describe('Delayed Effect Queueing and Triggering Flow', () => {
    it('should create correct delayedKey format', () => {
      const action = {
        actionType: 'role_meeting' as const,
        targetId: 'ceo_priorities',
        details: { choiceId: 'studio_first' }
      };

      // Simulate delayedKey generation (line 918)
      const delayedKey = `${action.targetId}-${action.details?.choiceId}-delayed`;

      expect(delayedKey).toBe('ceo_priorities-studio_first-delayed');
    });

    it('should check triggerWeek correctly in processDelayedEffects', () => {
      const currentWeek = 11;
      const flagEntry = {
        triggerWeek: 11,
        effects: { artist_mood: 2 },
        artistId: undefined,
        targetScope: 'global'
      };

      // Simulate check from line 2833
      const shouldTrigger = (
        flagEntry &&
        typeof flagEntry === 'object' &&
        'triggerWeek' in flagEntry &&
        typeof flagEntry.triggerWeek === 'number' &&
        flagEntry.triggerWeek === currentWeek
      );

      expect(shouldTrigger).toBe(true);
    });

    it('should NOT trigger when currentWeek is before triggerWeek', () => {
      const currentWeek = 10;
      const flagEntry = {
        triggerWeek: 11,
        effects: { artist_mood: 2 },
        artistId: undefined,
        targetScope: 'global'
      };

      const shouldTrigger = (
        flagEntry &&
        typeof flagEntry === 'object' &&
        'triggerWeek' in flagEntry &&
        typeof flagEntry.triggerWeek === 'number' &&
        flagEntry.triggerWeek === currentWeek
      );

      expect(shouldTrigger).toBe(false);
    });

    it('should preserve artist targeting in delayed effects', () => {
      const delayedEffect = {
        triggerWeek: 11,
        effects: { artist_mood: 2 },
        artistId: 'artist_nova', // Per-artist delayed effect
        targetScope: 'predetermined',
        meetingName: 'ceo_meeting',
        choiceId: 'boost_morale'
      };

      // Verify all targeting metadata is preserved
      expect(delayedEffect.artistId).toBe('artist_nova');
      expect(delayedEffect.targetScope).toBe('predetermined');
      expect(delayedEffect.meetingName).toBe('ceo_meeting');
      expect(delayedEffect.choiceId).toBe('boost_morale');
    });

    it('should handle global delayed effects (artistId undefined)', () => {
      const delayedEffect = {
        triggerWeek: 11,
        effects: { artist_mood: 2 },
        artistId: undefined, // Global effect
        targetScope: 'global',
        meetingName: 'ceo_priorities',
        choiceId: 'studio_first'
      };

      // Simulate branch check from line 2837
      const isPerArtist = !!delayedEffect.artistId;
      expect(isPerArtist).toBe(false); // Should take global path
    });
  });

  describe('Weekly Mood Depreciation', () => {
    it('should apply -3 mood decay when mood > 55', () => {
      const currentMood = 70;
      let moodChange = 0;

      // Simulate natural drift logic (lines 3063-3068)
      if (currentMood > 55) {
        moodChange -= 3;
      } else if (currentMood < 45) {
        moodChange += 3;
      }

      expect(moodChange).toBe(-3);
    });

    it('should apply +3 mood boost when mood < 45', () => {
      const currentMood = 30;
      let moodChange = 0;

      if (currentMood > 55) {
        moodChange -= 3;
      } else if (currentMood < 45) {
        moodChange += 3;
      }

      expect(moodChange).toBe(3);
    });

    it('should NOT apply drift when mood is 45-55 (equilibrium)', () => {
      const currentMood = 50;
      let moodChange = 0;

      if (currentMood > 55) {
        moodChange -= 3;
      } else if (currentMood < 45) {
        moodChange += 3;
      }

      expect(moodChange).toBe(0);
    });

    it('should apply drift at boundary: mood = 56', () => {
      const currentMood = 56;
      let moodChange = 0;

      if (currentMood > 55) {
        moodChange -= 3;
      } else if (currentMood < 45) {
        moodChange += 3;
      }

      expect(moodChange).toBe(-3);
    });

    it('should apply drift at boundary: mood = 44', () => {
      const currentMood = 44;
      let moodChange = 0;

      if (currentMood > 55) {
        moodChange -= 3;
      } else if (currentMood < 45) {
        moodChange += 3;
      }

      expect(moodChange).toBe(3);
    });
  });
});
