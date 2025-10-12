/**
 * Integration Tests for Dialogue Mood Effects
 *
 * Tests the complete pipeline for dialogue choice mood changes:
 * - Loading dialogue data from dialogue.json
 * - Processing artist dialogue actions
 * - Applying per-artist mood changes
 * - Logging mood events to mood_events table
 * - Respecting 0-100 mood bounds
 *
 * Related to Task 2.7 in tasks-artist-mood-plan.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, clearDatabase, seedMinimalGame, seedArtist } from '../helpers/test-db';
import { createTestGameState } from '../helpers/test-factories';
import { GameEngine } from '@shared/engine/game-engine';
import { DatabaseStorage } from '../../server/storage';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import type { WeekSummary, GameState } from '@shared/types/gameTypes';
import type { Artist } from '@shared/schema';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('Dialogue Mood Integration Tests', () => {
  let db: NodePgDatabase<typeof schema> & { $client: Pool };
  let storage: DatabaseStorage;
  let gameId: string;
  let artist1: Artist;
  let artist2: Artist;

  beforeEach(async () => {
    console.log('[Test Setup] Initializing database...');
    db = createTestDatabase();
    await clearDatabase(db);
    console.log('[Test DB] Connection verified');

    // Create storage instance
    storage = new DatabaseStorage(db);

    // Create test game state
    const gameState = await seedMinimalGame(db, {
      money: 50000,
      reputation: 50,
      currentWeek: 1,
    });
    gameId = gameState.id;

    // Create test artists with known initial mood values
    artist1 = await seedArtist(db, gameId, {
      name: 'Nova',
      archetype: 'Visionary',
      talent: 85,
      mood: 50, // Mid-range for testing both increases and decreases
      energy: 75,
      popularity: 60,
      signed: true,
    });

    artist2 = await seedArtist(db, gameId, {
      name: 'Diego',
      archetype: 'Workhorse',
      talent: 75,
      mood: 10, // Low mood for testing lower bound
      energy: 80,
      popularity: 55,
      signed: true,
    });

    console.log('[Test Setup] Database ready!');
  });

  afterEach(async () => {
    console.log('[Test Cleanup] Closing database connection...');
    await clearDatabase(db);
    console.log('[Test Cleanup] Done!');
  });

  // Helper to create minimal game engine for tests
  function createTestEngine(): GameEngine {
    const gameState = createTestGameState({
      id: gameId,
      currentWeek: 1,
      money: 50000,
      reputation: 50,
    });

    // Mock gameData with required configuration
    const mockGameData = {
      getTourConfigSync: () => ({
        sell_through_base: 0.65,
        reputation_modifier: 0.05,
        local_popularity_weight: 0.4,
        merch_percentage: 0.2,
        ticket_price_base: 25,
        ticket_price_per_capacity: 0.015
      }),
      getAccessTiersSync: () => ({
        venue_access: {
          clubs: { capacity_range: [50, 500] },
          theaters: { capacity_range: [500, 3000] },
          arenas: { capacity_range: [3000, 20000] }
        },
        chart_access: {},
        press_access: {},
        playlist_access: {}
      }),
      getBalanceSync: () => ({
        marketing_effectiveness: { social_media: 0.15 },
        ongoing_streams: { revenue_per_stream: 0.003 }
      })
    };

    return new GameEngine(gameState, mockGameData as any, storage);
  }

  describe('Dialogue Choice Mood Effects', () => {
    it('should increase artist mood by +5 from positive dialogue choice', async () => {
      const engine = createTestEngine();

      // Simulate dialogue choice with +5 mood effect
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: {
            mood: 5,
            eventSource: {
              type: 'dialogue_choice',
              sceneId: 'dialogue_middle_mood_middle_energy',
              choiceId: 'supportive_feedback'
            }
          }
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify mood increased
      const updatedArtist = await storage.getArtist(artist1.id);
      expect(updatedArtist?.mood).toBe(55); // 50 + 5
    });

    it('should decrease artist mood by -5 from negative dialogue choice', async () => {
      const engine = createTestEngine();

      // Simulate dialogue choice with -5 mood effect
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: {
            mood: -5,
            eventSource: {
              type: 'dialogue_choice',
              sceneId: 'dialogue_low_mood_low_energy',
              choiceId: 'push_through_burnout'
            }
          }
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify mood decreased
      const updatedArtist = await storage.getArtist(artist1.id);
      expect(updatedArtist?.mood).toBe(45); // 50 - 5
    });

    it('should only affect targeted artist, not all artists', async () => {
      const engine = createTestEngine();

      // Only artist1 receives mood change
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: {
            mood: 10,
            eventSource: {
              type: 'dialogue_choice',
              sceneId: 'dialogue_high_mood_high_energy',
              choiceId: 'ambitious_project'
            }
          }
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify only artist1's mood changed
      const updatedArtist1 = await storage.getArtist(artist1.id);
      const updatedArtist2 = await storage.getArtist(artist2.id);

      expect(updatedArtist1?.mood).toBe(60); // 50 + 10
      expect(updatedArtist2?.mood).toBe(10); // unchanged
    });
  });

  describe('Mood Event Logging', () => {
    it('should log dialogue mood changes to mood_events table', async () => {
      const engine = createTestEngine();

      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: {
            mood: 5,
            eventSource: {
              type: 'dialogue_choice',
              sceneId: 'dialogue_low_mood_middle_energy',
              choiceId: 'creative_reset'
            }
          }
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify mood event was logged
      const moodEvents = await db
        .select()
        .from(schema.moodEvents)
        .where(eq(schema.moodEvents.gameId, gameId));

      expect(moodEvents).toHaveLength(1);

      const event = moodEvents[0];
      expect(event.artistId).toBe(artist1.id);
      expect(event.eventType).toBe('dialogue_choice');
      expect(event.moodChange).toBe(5);
      expect(event.moodBefore).toBe(50);
      expect(event.moodAfter).toBe(55);
      expect(event.weekOccurred).toBe(1);

      // Verify metadata includes sceneId and choiceId
      const metadata = event.metadata as Record<string, any>;
      expect(metadata.sceneId).toBe('dialogue_low_mood_middle_energy');
      expect(metadata.choiceId).toBe('creative_reset');
    });

    it('should log multiple dialogue mood events for different artists', async () => {
      const engine = createTestEngine();

      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: {
            mood: 5,
            eventSource: {
              type: 'dialogue_choice',
              sceneId: 'scene_1',
              choiceId: 'choice_a'
            }
          },
          [artist2.id]: {
            mood: -3,
            eventSource: {
              type: 'dialogue_choice',
              sceneId: 'scene_2',
              choiceId: 'choice_b'
            }
          }
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify both events logged
      const moodEvents = await db
        .select()
        .from(schema.moodEvents)
        .where(eq(schema.moodEvents.gameId, gameId));

      expect(moodEvents).toHaveLength(2);

      const artist1Event = moodEvents.find(e => e.artistId === artist1.id);
      const artist2Event = moodEvents.find(e => e.artistId === artist2.id);

      expect(artist1Event).toBeDefined();
      expect(artist1Event?.eventType).toBe('dialogue_choice');
      expect(artist1Event?.moodChange).toBe(5);

      expect(artist2Event).toBeDefined();
      expect(artist2Event?.eventType).toBe('dialogue_choice');
      expect(artist2Event?.moodChange).toBe(-3);
    });
  });

  describe('Mood Bounds (0-100)', () => {
    it('should not allow mood to go below 0', async () => {
      const engine = createTestEngine();

      // Artist2 has mood=10, try to decrease by -15
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist2.id]: {
            mood: -15,
            eventSource: {
              type: 'dialogue_choice',
              sceneId: 'dialogue_low_mood_low_energy',
              choiceId: 'push_through_burnout'
            }
          }
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify mood clamped to 0
      const updatedArtist = await storage.getArtist(artist2.id);
      expect(updatedArtist?.mood).toBe(0); // 10 - 15 = -5, clamped to 0
    });

    it('should not allow mood to go above 100', async () => {
      const engine = createTestEngine();

      // Create artist with high mood
      const highMoodArtist = await seedArtist(db, gameId, {
        name: 'Luna',
        archetype: 'Trendsetter',
        talent: 90,
        mood: 95,
        energy: 70,
        popularity: 80,
        signed: true,
      });

      // Try to increase mood by +10 (should cap at 100)
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [highMoodArtist.id]: {
            mood: 10,
            eventSource: {
              type: 'dialogue_choice',
              sceneId: 'dialogue_high_mood_high_energy',
              choiceId: 'celebrate_success'
            }
          }
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify mood clamped to 100
      const updatedArtist = await storage.getArtist(highMoodArtist.id);
      expect(updatedArtist?.mood).toBe(100); // 95 + 10 = 105, clamped to 100
    });

    it('should log correct moodAfter when clamped to bounds', async () => {
      const engine = createTestEngine();

      // Artist2 has mood=10, decrease by -15 (will be clamped to 0)
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist2.id]: {
            mood: -15,
            eventSource: {
              type: 'dialogue_choice',
              sceneId: 'test_scene',
              choiceId: 'test_choice'
            }
          }
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify mood event logged with clamped value
      const moodEvents = await db
        .select()
        .from(schema.moodEvents)
        .where(eq(schema.moodEvents.artistId, artist2.id));

      expect(moodEvents).toHaveLength(1);
      expect(moodEvents[0].moodBefore).toBe(10);
      expect(moodEvents[0].moodAfter).toBe(0); // Clamped to 0
      expect(moodEvents[0].moodChange).toBe(-15); // Original change preserved
    });
  });
});
