import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../../shared/engine/game-engine';
import type { GameArtist, GameState, WeekSummary } from '../../shared/types/gameTypes';
import type { IStorage } from '../../server/storage';
import type { Artist } from '../../shared/schema';
import { createTestDBArtist } from '../helpers/test-factories';

/**
 * Integration test to verify immediate artist_mood effects from executive meetings
 *
 * Flow:
 * 1. Week 10: Choose TEST meeting with +5 immediate artist_mood
 * 2. Advance to Week 11
 * 3. Verify: Artists should have +5 mood applied BEFORE depreciation
 * 4. Expected result: 67 mood → 72 (67 + 5), then depreciation → 69 (72 - 3)
 */

describe('Immediate Mood Effect Integration Test', () => {
  let mockStorage: Partial<IStorage>;
  let mockGameData: any;
  let artists: Artist[];

  beforeEach(() => {
    artists = [];

    mockStorage = {
      getArtistsByGame: vi.fn(async () => artists),
      updateArtist: vi.fn(async (id: string, updates: Partial<Artist>) => {
        const artist = artists.find(a => a.id === id);
        if (artist) {
          Object.assign(artist, updates);
        }
        return artist as any;
      }),
      createMoodEvent: vi.fn(async (event: any) => ({ ...event, id: `event_${event.artistId}` })),
      getProjectsByGame: vi.fn(async () => [])
    };

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
      getPressCoverageConfigSync: vi.fn(() => ({
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
        }
      })),
      getStreamingConfigSync: vi.fn(() => ({
        ongoing_streams: { revenue_per_stream: 0.003 }
      }))
    };
  });

  function createSummary(currentWeek: number): WeekSummary {
    return {
      week: currentWeek,
      changes: [],
      revenue: 0,
      expenses: 0,
      reputationChanges: {},
      events: [],
      artistChanges: {}
    };
  }

  it('should apply immediate artist_mood effect from TEST meeting before depreciation', async () => {
    artists = [
      createTestDBArtist({
        id: 'artist_test',
        name: 'Test Artist',
        mood: 67,
      })
    ];

    const gameState: GameState = {
      id: 'test-game-immediate-mood',
      userId: 'test-user',
      money: 100000,
      reputation: 50,
      currentWeek: 10,
      creativeCapital: 0,
      focusSlots: 3,
      usedFocusSlots: 0,
      arOfficeSlotUsed: false,
      playlistAccess: 'none',
      pressAccess: 'none',
      venueAccess: 'none',
      campaignType: 'Balanced',
      campaignCompleted: false,
      rngSeed: 'test-seed',
      arOfficeSourcingType: null,
      arOfficePrimaryGenre: null,
      arOfficeSecondaryGenre: null,
      arOfficeOperationStart: null,
      flags: {},
      weeklyStats: {},
      tierUnlockHistory: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const engine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);
    const summary = createSummary(gameState.currentWeek);

    // Apply immediate +5 global mood boost
    (engine as any).applyEffects({ artist_mood: 5 }, summary, undefined, 'global');
    await (engine as any).applyArtistChangesToDatabase(summary);
    await (engine as any).processWeeklyMoodChanges(summary);

    const moodChanges = summary.changes.filter(change => change.type === 'mood');
    const updatedArtist = artists[0];

    const immediateEntry = moodChanges.find(change =>
      change.description?.includes('morale') && change.moodChange === 5
    );
    expect(immediateEntry).toBeDefined();

    const depreciationEntry = moodChanges.find(change =>
      change.description?.includes('mood') && change.moodChange === -3
    );
    expect(depreciationEntry).toBeDefined();

    // 67 + 5 (immediate) - 3 (depreciation) = 69
    expect(updatedArtist.mood).toBe(69);
  });

  it('should apply immediate artist_mood globally to all artists', async () => {
    artists = [
      createTestDBArtist({
        id: 'artist_1',
        name: 'Artist One',
        archetype: 'Visionary',
        talent: 70,
        workEthic: 60,
        popularity: 50,
        temperament: 50,
        energy: 50,
        mood: 40,
        signed: true
      }),
      createTestDBArtist({
        id: 'artist_2',
        name: 'Artist Two',
        archetype: 'Workhorse',
        talent: 70,
        workEthic: 90,
        popularity: 60,
        temperament: 55,
        energy: 50,
        mood: 50,
        signed: true
      }),
      createTestDBArtist({
        id: 'artist_3',
        name: 'Artist Three',
        archetype: 'Trendsetter',
        talent: 70,
        workEthic: 60,
        popularity: 70,
        temperament: 60,
        energy: 50,
        mood: 70,
        signed: true
      })
    ];

    const gameState: GameState = {
      id: 'test-game-global-immediate',
      userId: 'test-user',
      money: 100000,
      reputation: 50,
      currentWeek: 10,
      creativeCapital: 0,
      focusSlots: 3,
      usedFocusSlots: 0,
      arOfficeSlotUsed: false,
      playlistAccess: 'none',
      pressAccess: 'none',
      venueAccess: 'none',
      campaignType: 'Balanced',
      campaignCompleted: false,
      rngSeed: 'test-seed',
      arOfficeSourcingType: null,
      arOfficePrimaryGenre: null,
      arOfficeSecondaryGenre: null,
      arOfficeOperationStart: null,
      flags: {},
      weeklyStats: {},
      tierUnlockHistory: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const engine = new GameEngine(gameState, mockGameData, mockStorage as IStorage);
    const summary = createSummary(gameState.currentWeek);

    (engine as any).applyEffects({ artist_mood: 5 }, summary, undefined, 'global');
    await (engine as any).applyArtistChangesToDatabase(summary);
    await (engine as any).processWeeklyMoodChanges(summary);

    const artist1 = artists.find(a => a.id === 'artist_1')!;
    const artist2 = artists.find(a => a.id === 'artist_2')!;
    const artist3 = artists.find(a => a.id === 'artist_3')!;

    expect(artist1.mood).toBe(45); // 40 + 5 (immediate), drift does not trigger at 45 threshold
    expect(artist2.mood).toBe(55); // 50 + 5 + 0 drift
    expect(artist3.mood).toBe(72); // 70 + 5 - 3 drift down
  });
});
