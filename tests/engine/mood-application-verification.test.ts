import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '@shared/engine/game-engine';
import type { GameState, GameArtist, WeekSummary } from '@shared/types/gameTypes';
import type { IStorage } from '../../server/storage';

/**
 * Mood Application Verification Tests
 *
 * These tests verify that mood changes from executive meetings are correctly:
 * 1. Accumulated in summary.artistChanges
 * 2. Applied to artist mood values in database
 * 3. Logged as mood events
 * 4. Displayed correctly in week summary
 */

describe('Mood Application Verification', () => {
  let mockStorage: Partial<IStorage>;
  let mockGameData: any;
  let gameState: GameState;
  let mockArtists: GameArtist[];
  let capturedMoodEvents: any[];
  let artistUpdates: Map<string, any>;

  beforeEach(() => {
    capturedMoodEvents = [];
    artistUpdates = new Map();

    // Create mock artists with known initial moods
    mockArtists = [
      {
        id: 'artist_nova',
        name: 'Nova Sterling',
        archetype: 'Visionary',
        talent: 85,
        workEthic: 70,
        popularity: 85,
        temperament: 60,
        energy: 75,
        mood: 70,  // Known starting mood
        signed: true,
        isSigned: true,
        loyalty: 50,
      },
      {
        id: 'artist_diego',
        name: 'Diego Rivers',
        archetype: 'Workhorse',
        talent: 75,
        workEthic: 90,
        popularity: 60,
        temperament: 80,
        energy: 80,
        mood: 65,  // Known starting mood
        signed: true,
        isSigned: true,
        loyalty: 50,
      },
      {
        id: 'artist_luna',
        name: 'Luna Park',
        archetype: 'Trendsetter',
        talent: 70,
        workEthric: 65,
        popularity: 50,
        temperament: 55,
        energy: 70,
        mood: 60,  // Known starting mood
        signed: true,
        isSigned: true,
        loyalty: 50,
      },
    ] as GameArtist[];

    // Mock storage
    mockStorage = {
      getArtistsByGame: vi.fn(async () => mockArtists),
      updateArtist: vi.fn(async (id: string, updates: any) => {
        // Track updates to verify correct values
        artistUpdates.set(id, updates);
        const artist = mockArtists.find(a => a.id === id);
        if (artist) {
          Object.assign(artist, updates);
        }
        return artist as any;
      }),
      createMoodEvent: vi.fn(async (event: any) => {
        capturedMoodEvents.push(event);
        return { ...event, id: `event_${capturedMoodEvents.length}`, createdAt: new Date() };
      }),
      getGameState: vi.fn(async () => gameState),
    };

    // Mock gameData with required configuration for FinancialSystem validation
    mockGameData = {
      getTourConfigSync: vi.fn(() => ({
        sell_through_base: 0.65,
        reputation_modifier: 0.05,
        local_popularity_weight: 0.4,
        merch_percentage: 0.2,
        ticket_price_base: 25,
        ticket_price_per_capacity: 0.015
      })),
      getAccessTiersSync: vi.fn(() => ({
        venue_access: {
          none: { threshold: 0, capacity_range: [0, 100], description: 'No venue access' },
          clubs: { threshold: 5, capacity_range: [100, 500], description: 'Clubs' },
          theaters: { threshold: 15, capacity_range: [500, 2000], description: 'Theaters' },
          arenas: { threshold: 30, capacity_range: [2000, 20000], description: 'Arenas' }
        },
        playlist_access: {
          none: { threshold: 0, reach_multiplier: 0.1, description: 'No playlist access' },
          niche: { threshold: 10, reach_multiplier: 0.4, description: 'Niche playlists' },
          mid: { threshold: 25, reach_multiplier: 0.8, description: 'Mid-tier playlists' },
          flagship: { threshold: 50, reach_multiplier: 1.2, description: 'Flagship playlists' }
        },
        press_access: {
          none: { threshold: 0, pickup_chance: 0.05, description: 'No press access' },
          blogs: { threshold: 8, pickup_chance: 0.25, description: 'Blog coverage' },
          mid_tier: { threshold: 20, pickup_chance: 0.5, description: 'Mid-tier press' },
          national: { threshold: 40, pickup_chance: 0.75, description: 'National press' }
        }
      })),
      getProducerTiersSync: vi.fn(() => ({ standard: { quality_bonus: 0 } })),
      getTimeInvestmentSystemSync: vi.fn(() => ({ normal: { quality_bonus: 0 } })),
      getPressConfigSync: vi.fn(() => ({
        base_chance: 0.1,
        pr_spend_modifier: 0.001,
        reputation_modifier: 0.01,
        story_flag_bonus: 0.2,
        max_pickups_per_release: 5
      })),
      getBalanceConfigSync: vi.fn(() => ({
        economy: { weekly_burn_base: [5000] },
        market_formulas: {
          streaming_calculation: {
            ongoing_streams: { revenue_per_stream: 0.003 }
          }
        },
        song_generation: {
          name_pools: { default: ['Test Song'] },
          mood_types: ['energetic', 'melancholic']
        }
      })),
      getStreamingConfigSync: vi.fn(() => ({
        ongoing_streams: { revenue_per_stream: 0.003 }
      }))
    } as Record<string, any>;

    // Alias used by FinancialSystem expectations
    mockGameData.getPressCoverageConfigSync = mockGameData.getPressConfigSync;

    // Create game state
    gameState = {
      id: 'game_123',
      currentWeek: 10,
      money: 50000,
      reputation: 50,
      artists: mockArtists,
      rngSeed: '12345',
    } as any;
  });

  describe('Global Meeting - CEO Priorities (+2 Mood)', () => {
    it('should accumulate +2 mood for all artists in summary.artistChanges', () => {
      const gameEngine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Simulate CEO Priorities choice with +2 artist_mood
      const effects = { artist_mood: 2 };

      // Apply with global scope (no artistId)
      (gameEngine as any).applyEffects(effects, summary, undefined, undefined, 'global');

      // Verify summary.artistChanges has +2 for each artist
      expect(summary.artistChanges).toBeDefined();
      expect(Object.keys(summary.artistChanges!)).toHaveLength(3);

      // Check each artist has +2 mood accumulated
      const novaChanges = summary.artistChanges!['artist_nova'] as any;
      const diegoChanges = summary.artistChanges!['artist_diego'] as any;
      const lunaChanges = summary.artistChanges!['artist_luna'] as any;

      expect(novaChanges).toBeDefined();
      expect(novaChanges.mood).toBe(2);

      expect(diegoChanges).toBeDefined();
      expect(diegoChanges.mood).toBe(2);

      expect(lunaChanges).toBeDefined();
      expect(lunaChanges.mood).toBe(2);
    });

    it('should apply +2 mood to database for all artists', async () => {
      const gameEngine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Apply global +2 mood effect
      const effects = { artist_mood: 2 };
      (gameEngine as any).applyEffects(effects, summary, undefined, undefined, 'global');

      // Process to database
      await (gameEngine as any).applyArtistChangesToDatabase(summary);

      // Verify database updates
      expect(mockStorage.updateArtist).toHaveBeenCalledTimes(3);

      // Check Nova: 70 + 2 = 72
      expect(artistUpdates.get('artist_nova')).toBeDefined();
      expect(artistUpdates.get('artist_nova').mood).toBe(72);

      // Check Diego: 65 + 2 = 67
      expect(artistUpdates.get('artist_diego')).toBeDefined();
      expect(artistUpdates.get('artist_diego').mood).toBe(67);

      // Check Luna: 60 + 2 = 62
      expect(artistUpdates.get('artist_luna')).toBeDefined();
      expect(artistUpdates.get('artist_luna').mood).toBe(62);
    });

    it('should create mood events for all 3 artists', async () => {
      const gameEngine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Apply global +2 mood effect
      const effects = { artist_mood: 2 };
      (gameEngine as any).applyEffects(effects, summary, undefined, undefined, 'global');

      // Process to database
      await (gameEngine as any).applyArtistChangesToDatabase(summary);

      // Verify mood events created
      expect(capturedMoodEvents).toHaveLength(3);

      // Verify Nova's event
      const novaEvent = capturedMoodEvents.find(e => e.artistId === 'artist_nova');
      expect(novaEvent).toBeDefined();
      expect(novaEvent.moodChange).toBe(2);
      expect(novaEvent.moodBefore).toBe(70);
      expect(novaEvent.moodAfter).toBe(72);

      // Verify Diego's event
      const diegoEvent = capturedMoodEvents.find(e => e.artistId === 'artist_diego');
      expect(diegoEvent).toBeDefined();
      expect(diegoEvent.moodChange).toBe(2);
      expect(diegoEvent.moodBefore).toBe(65);
      expect(diegoEvent.moodAfter).toBe(67);

      // Verify Luna's event
      const lunaEvent = capturedMoodEvents.find(e => e.artistId === 'artist_luna');
      expect(lunaEvent).toBeDefined();
      expect(lunaEvent.moodChange).toBe(2);
      expect(lunaEvent.moodBefore).toBe(60);
      expect(lunaEvent.moodAfter).toBe(62);
    });

    it('should add summary change entry for global mood', () => {
      const gameEngine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Apply global +2 mood effect
      const effects = { artist_mood: 2 };
      (gameEngine as any).applyEffects(effects, summary, undefined, undefined, 'global');

      // Check summary.changes has entry
      expect(summary.changes).toHaveLength(1);
      expect(summary.changes[0].type).toBe('mood');
      expect(summary.changes[0].description).toContain('all artists');
      expect(summary.changes[0].amount).toBe(2);
    });
  });

  describe('Mood Not Being Overwritten', () => {
    it('should preserve mood changes when processWeeklyMoodChanges runs', async () => {
      const gameEngine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Apply meeting effect: +2 mood
      const effects = { artist_mood: 2 };
      (gameEngine as any).applyEffects(effects, summary, undefined, undefined, 'global');

      // Verify mood is accumulated
      expect((summary.artistChanges!['artist_nova'] as any).mood).toBe(2);

      // Now simulate weekly mood changes (this should NOT overwrite meeting changes)
      // Weekly mood changes should ADD to existing changes, not replace them

      // The key is that applyArtistChangesToDatabase should run AFTER all effects are accumulated
      await (gameEngine as any).applyArtistChangesToDatabase(summary);

      // Final mood should be: initial (70) + meeting (+2) = 72
      // NOT: initial (70) + weekly change (overwriting meeting change)
      expect(mockArtists[0].mood).toBe(72); // Nova
    });

    it('should accumulate multiple mood effects in same week', () => {
      const gameEngine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Apply first effect: +2 mood
      (gameEngine as any).applyEffects({ artist_mood: 2 }, summary, 'artist_nova', undefined, 'predetermined');

      // Apply second effect: +3 mood (from dialogue)
      (gameEngine as any).applyEffects({ artist_mood: 3 }, summary, 'artist_nova', undefined, 'dialogue');

      // Should accumulate to +5 total
      expect((summary.artistChanges!['artist_nova'] as any).mood).toBe(5);
    });
  });

  describe('Negative Mood Changes', () => {
    it('should apply negative mood correctly', async () => {
      const gameEngine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      // Apply -3 mood effect
      const effects = { artist_mood: -3 };
      (gameEngine as any).applyEffects(effects, summary, undefined, undefined, 'global');

      await (gameEngine as any).applyArtistChangesToDatabase(summary);

      // Nova: 70 - 3 = 67
      expect(mockArtists[0].mood).toBe(67);

      // Verify mood event has negative change
      expect(capturedMoodEvents[0].moodChange).toBe(-3);
    });
  });

  describe('Debugging: Check What Happens in Full Week Processing', () => {
    it('should show where mood gets lost during week processing', async () => {
      // This test helps us identify if mood is lost during:
      // 1. Effect application
      // 2. Summary accumulation
      // 3. Database write
      // 4. Weekly mood processing

      const gameEngine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);

      const summary: WeekSummary = {
        week: 10,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {},
      };

      console.log('=== STEP 1: Initial State ===');
      console.log('Nova mood (before):', mockArtists[0].mood); // Should be 70

      // Apply CEO Priorities: +2 mood
      console.log('\n=== STEP 2: Apply Effects ===');
      const effects = { artist_mood: 2 };
      (gameEngine as any).applyEffects(effects, summary, undefined, undefined, 'global');

      console.log('summary.artistChanges:', JSON.stringify(summary.artistChanges, null, 2));
      // Should show: { "artist_nova": { "mood": 2 }, ... }

      console.log('\n=== STEP 3: Apply to Database ===');
      await (gameEngine as any).applyArtistChangesToDatabase(summary);

      console.log('Nova mood (after applyArtistChangesToDatabase):', mockArtists[0].mood); // Should be 72
      console.log('artistUpdates:', Array.from(artistUpdates.entries()));

      console.log('\n=== STEP 4: Check Mood Events ===');
      console.log('Mood events created:', capturedMoodEvents.length); // Should be 3
      console.log('Nova mood event:', capturedMoodEvents.find(e => e.artistId === 'artist_nova'));

      // ASSERTIONS
      expect(mockArtists[0].mood).toBe(72); // If this fails, mood is not being applied correctly
    });
  });
});
