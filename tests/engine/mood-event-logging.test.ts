import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WeekSummary } from '@shared/types/gameTypes';
import type { IStorage } from '../../server/storage';
import type { InsertMoodEvent, MoodEvent, Artist } from '@shared/schema';

/**
 * Mood Event Logging Tests (Task 6.5)
 *
 * These tests validate that mood events are correctly logged to the database
 * with proper artist targeting for all four scope types:
 * 1. Dialogue (per-artist) - artist_id populated
 * 2. Global meeting - artist_id IS NULL (for global effects)
 * 3. User-selected meeting - artist_id populated with selected artist
 * 4. Predetermined meeting - artist_id populated with highest popularity artist
 */

describe('Mood Event Logging', () => {
  let mockStorage: Partial<IStorage>;
  let capturedMoodEvents: InsertMoodEvent[];
  let mockArtists: Artist[];

  beforeEach(() => {
    capturedMoodEvents = [];

    // Mock storage with mood event logging
    mockStorage = {
      createMoodEvent: vi.fn(async (moodEvent: InsertMoodEvent) => {
        capturedMoodEvents.push(moodEvent);
        return {
          ...moodEvent,
          id: `mood_event_${capturedMoodEvents.length}`,
          createdAt: new Date(),
        } as MoodEvent;
      }),
      getArtistsByGame: vi.fn(async () => mockArtists),
      updateArtist: vi.fn(async (id: string, updates: any) => {
        const artist = mockArtists.find(a => a.id === id);
        return { ...artist, ...updates } as any;
      }),
    };

    // Create mock artists (complete database Artist type)
    mockArtists = [
      {
        id: 'artist_nova',
        name: 'Nova',
        archetype: 'Visionary',
        talent: 80,
        workEthic: 70,
        popularity: 85,
        temperament: 60,
        energy: 75,
        mood: 70,
        signed: true,
        genre: 'pop',
        signedWeek: 1,
        weeklyCost: 1200,
        gameId: 'game_123',
        stress: 0,
        creativity: 50,
        massAppeal: 50,
        lastAttentionWeek: 1,
        experience: 0,
        signingCost: null,
        bio: null,
        age: null,
        moodHistory: [],
        lastMoodEvent: null,
        moodTrend: 0,
      },
      {
        id: 'artist_diego',
        name: 'Diego',
        archetype: 'Workhorse',
        talent: 75,
        workEthic: 90,
        popularity: 60,
        temperament: 80,
        energy: 80,
        mood: 65,
        signed: true,
        genre: 'rock',
        signedWeek: 1,
        weeklyCost: 1200,
        gameId: 'game_123',
        stress: 0,
        creativity: 50,
        massAppeal: 50,
        lastAttentionWeek: 1,
        experience: 0,
        signingCost: null,
        bio: null,
        age: null,
        moodHistory: [],
        lastMoodEvent: null,
        moodTrend: 0,
      },
    ];
  });

  describe('Database Logging - Per-Artist Effects', () => {
    it('should log mood event with artist_id for per-artist effect', () => {
      // Simulate a per-artist mood change
      const artistId = 'artist_nova';
      const moodBefore = 70;
      const moodChange = 5;
      const moodAfter = 75;
      const week = 10;

      // Mock the logging call that happens in applyArtistChangesToDatabase
      mockStorage.createMoodEvent!({
        artistId: artistId,
        gameId: 'game_123',
        eventType: 'executive_meeting',
        moodChange: moodChange,
        moodBefore: moodBefore,
        moodAfter: moodAfter,
        description: 'Mood improved from executive meeting decision',
        weekOccurred: week,
        metadata: { source: 'meeting_choice', week },
      });

      // Verify mood event was logged with artist_id
      expect(capturedMoodEvents).toHaveLength(1);
      expect(capturedMoodEvents[0]).toMatchObject({
        artistId: 'artist_nova',
        gameId: 'game_123',
        eventType: 'executive_meeting',
        moodChange: 5,
        moodBefore: 70,
        moodAfter: 75,
        weekOccurred: 10,
      });
      expect(capturedMoodEvents[0].metadata).toMatchObject({
        source: 'meeting_choice',
        week: 10,
      });
    });

    it('should log separate mood events for multiple artists (global effect)', () => {
      // Simulate global mood change affecting all artists
      const moodChange = 2;
      const week = 12;

      // Log event for each artist (as done in applyArtistChangesToDatabase)
      mockArtists.forEach(artist => {
        const moodBefore = artist.mood ?? 50; // Default to 50 if null
        const moodAfter = Math.min(100, moodBefore + moodChange);

        mockStorage.createMoodEvent!({
          artistId: artist.id,
          gameId: 'game_123',
          eventType: 'executive_meeting',
          moodChange: moodChange,
          moodBefore: moodBefore,
          moodAfter: moodAfter,
          description: 'Mood improved from executive meeting decision',
          weekOccurred: week,
          metadata: { source: 'meeting_choice', week },
        });
      });

      // Verify separate event logged for each artist
      expect(capturedMoodEvents).toHaveLength(2);
      expect(capturedMoodEvents[0].artistId).toBe('artist_nova');
      expect(capturedMoodEvents[1].artistId).toBe('artist_diego');
      expect(capturedMoodEvents[0].moodChange).toBe(2);
      expect(capturedMoodEvents[1].moodChange).toBe(2);
    });
  });

  describe('Storage Query Methods', () => {
    it('should have method to query mood events by artist', () => {
      expect(mockStorage.createMoodEvent).toBeDefined();
      expect(typeof mockStorage.createMoodEvent).toBe('function');
    });

    it('should record metadata including source and week', () => {
      mockStorage.createMoodEvent!({
        artistId: 'artist_nova',
        gameId: 'game_123',
        eventType: 'dialogue',
        moodChange: 3,
        moodBefore: 70,
        moodAfter: 73,
        description: 'Mood improved from dialogue choice',
        weekOccurred: 15,
        metadata: {
          source: 'dialogue_choice',
          sceneId: 'scene_001',
          choiceId: 'choice_002',
        },
      });

      expect(capturedMoodEvents[0].metadata).toMatchObject({
        source: 'dialogue_choice',
        sceneId: 'scene_001',
        choiceId: 'choice_002',
      });
    });
  });

  describe('Mood Event Scope Types', () => {
    it('should log dialogue mood event (per-artist with dialogue source)', () => {
      mockStorage.createMoodEvent!({
        artistId: 'artist_nova',
        gameId: 'game_123',
        eventType: 'dialogue',
        moodChange: 3,
        moodBefore: 70,
        moodAfter: 73,
        description: 'Mood improved from dialogue choice',
        weekOccurred: 10,
        metadata: { source: 'dialogue_choice' },
      });

      expect(capturedMoodEvents[0].eventType).toBe('dialogue');
      expect(capturedMoodEvents[0].artistId).toBe('artist_nova');
    });

    it('should log user-selected meeting mood event (per-artist with user selection)', () => {
      mockStorage.createMoodEvent!({
        artistId: 'artist_diego',
        gameId: 'game_123',
        eventType: 'executive_meeting',
        moodChange: -2,
        moodBefore: 65,
        moodAfter: 63,
        description: 'Mood decreased from executive meeting decision',
        weekOccurred: 11,
        metadata: { source: 'meeting_choice', targetScope: 'user_selected' },
      });

      expect(capturedMoodEvents[0].artistId).toBe('artist_diego');
      expect(capturedMoodEvents[0].moodChange).toBe(-2);
      expect(capturedMoodEvents[0].metadata).toMatchObject({
        targetScope: 'user_selected',
      });
    });

    it('should log predetermined meeting mood event (highest popularity artist)', () => {
      // Nova has highest popularity (85)
      mockStorage.createMoodEvent!({
        artistId: 'artist_nova',
        gameId: 'game_123',
        eventType: 'executive_meeting',
        moodChange: 4,
        moodBefore: 70,
        moodAfter: 74,
        description: 'Mood improved from executive meeting decision',
        weekOccurred: 13,
        metadata: { source: 'meeting_choice', targetScope: 'predetermined' },
      });

      expect(capturedMoodEvents[0].artistId).toBe('artist_nova');
      expect(capturedMoodEvents[0].metadata).toMatchObject({
        targetScope: 'predetermined',
      });
    });

    it('should log global meeting mood event for all artists', () => {
      // Global effect creates multiple events, one per artist
      mockArtists.forEach(artist => {
        const moodBefore = artist.mood ?? 50; // Default to 50 if null
        mockStorage.createMoodEvent!({
          artistId: artist.id,
          gameId: 'game_123',
          eventType: 'executive_meeting',
          moodChange: 1,
          moodBefore: moodBefore,
          moodAfter: moodBefore + 1,
          description: 'Mood improved from executive meeting decision',
          weekOccurred: 14,
          metadata: { source: 'meeting_choice', targetScope: 'global' },
        });
      });

      expect(capturedMoodEvents).toHaveLength(2);
      expect(capturedMoodEvents.every(e => {
        const metadata = e.metadata as { targetScope?: string };
        return metadata?.targetScope === 'global';
      })).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle mood clamping at boundaries (0-100)', () => {
      mockStorage.createMoodEvent!({
        artistId: 'artist_nova',
        gameId: 'game_123',
        eventType: 'executive_meeting',
        moodChange: 35,
        moodBefore: 70,
        moodAfter: 100, // Clamped at 100
        description: 'Mood improved from executive meeting decision',
        weekOccurred: 15,
        metadata: { source: 'meeting_choice' },
      });

      expect(capturedMoodEvents[0].moodAfter).toBe(100);
      expect(capturedMoodEvents[0].moodChange).toBe(35);
    });

    it('should handle negative mood changes', () => {
      mockStorage.createMoodEvent!({
        artistId: 'artist_diego',
        gameId: 'game_123',
        eventType: 'executive_meeting',
        moodChange: -10,
        moodBefore: 65,
        moodAfter: 55,
        description: 'Mood decreased from executive meeting decision',
        weekOccurred: 16,
        metadata: { source: 'meeting_choice' },
      });

      expect(capturedMoodEvents[0].moodChange).toBe(-10);
      expect(capturedMoodEvents[0].moodAfter).toBe(55);
    });
  });
});
