/**
 * Integration Tests for Artist Stat Persistence
 *
 * These tests verify that artist stat changes (mood, energy, popularity) from
 * executive meetings and game events actually persist to the PostgreSQL database.
 *
 * Unlike unit tests that mock storage, these tests:
 * - Use real database connections via createTestDatabase()
 * - Verify data is written to PostgreSQL tables
 * - Verify mood_events table is populated correctly
 * - Test the complete pipeline: accumulation → persistence → retrieval
 *
 * Purpose: Catch bugs that mocked tests miss (like the bugs from 0002-debt)
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

describe('Mood Persistence Integration Tests', () => {
  let db: NodePgDatabase<typeof schema> & { $client: Pool };
  let storage: DatabaseStorage;
  let gameId: string;
  let artist1: Artist;
  let artist2: Artist;
  let artist3: Artist;

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

    // Create three test artists with known initial stats
    artist1 = await seedArtist(db, gameId, {
      name: 'Artist Nova',
      archetype: 'Visionary',
      talent: 85,
      mood: 70,
      energy: 75,
      popularity: 60,
      signed: true,
    });

    artist2 = await seedArtist(db, gameId, {
      name: 'Artist Diego',
      archetype: 'Workhorse',
      talent: 75,
      mood: 65,
      energy: 80,
      popularity: 55,
      signed: true,
    });

    artist3 = await seedArtist(db, gameId, {
      name: 'Artist Luna',
      archetype: 'Trendsetter',
      talent: 90,
      mood: 60,
      energy: 70,
      popularity: 80,
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

    // Mock gameData with required configuration for FinancialSystem validation
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

  describe('Mood Persistence', () => {
    it('should persist global mood effect to all artists in database', async () => {
      const engine = createTestEngine();

      // Create a week summary with global mood change
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: 5 },
          [artist2.id]: { mood: 5 },
          [artist3.id]: { mood: 5 },
        },
      };

      // Apply changes to database (this is what processWeek does)
      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify mood changes persisted to database
      const updatedArtist1 = await storage.getArtist(artist1.id);
      const updatedArtist2 = await storage.getArtist(artist2.id);
      const updatedArtist3 = await storage.getArtist(artist3.id);

      expect(updatedArtist1?.mood).toBe(75); // 70 + 5
      expect(updatedArtist2?.mood).toBe(70); // 65 + 5
      expect(updatedArtist3?.mood).toBe(65); // 60 + 5
    });

    it('should persist targeted mood effect to specific artist only', async () => {
      const engine = createTestEngine();

      // Targeted mood change (only artist1)
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: 10 },
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify only artist1's mood changed
      const updatedArtist1 = await storage.getArtist(artist1.id);
      const updatedArtist2 = await storage.getArtist(artist2.id);
      const updatedArtist3 = await storage.getArtist(artist3.id);

      expect(updatedArtist1?.mood).toBe(80); // 70 + 10
      expect(updatedArtist2?.mood).toBe(65); // unchanged
      expect(updatedArtist3?.mood).toBe(60); // unchanged
    });

    it('should log mood events to database with correct artist_id', async () => {
      const engine = createTestEngine();

      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: 8 },
          [artist2.id]: { mood: -3 },
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Verify mood events were logged
      const moodEvents = await db
        .select()
        .from(schema.moodEvents)
        .where(eq(schema.moodEvents.gameId, gameId));

      expect(moodEvents).toHaveLength(2);

      // Find events by artist
      const artist1Event = moodEvents.find(e => e.artistId === artist1.id);
      const artist2Event = moodEvents.find(e => e.artistId === artist2.id);

      expect(artist1Event).toBeDefined();
      expect(artist1Event?.moodChange).toBe(8);
      expect(artist1Event?.moodBefore).toBe(70);
      expect(artist1Event?.moodAfter).toBe(78);

      expect(artist2Event).toBeDefined();
      expect(artist2Event?.moodChange).toBe(-3);
      expect(artist2Event?.moodBefore).toBe(65);
      expect(artist2Event?.moodAfter).toBe(62);
    });

    it('should accumulate multiple mood changes before persisting', async () => {
      const engine = createTestEngine();

      // Multiple mood changes in same week
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: 5 }, // Will be accumulated
        },
      };

      // Simulate multiple effects adding to same artist
      summary.artistChanges![artist1.id].mood = (summary.artistChanges![artist1.id].mood || 0) + 3; // +3 more

      await (engine as any).applyArtistChangesToDatabase(summary);

      const updatedArtist = await storage.getArtist(artist1.id);
      expect(updatedArtist?.mood).toBe(78); // 70 + 5 + 3
    });
  });

  describe('Energy Persistence (Unified Format)', () => {
    it('should persist global energy effect to all artists', async () => {
      const engine = createTestEngine();

      // Global energy change (unified format)
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { energy: 5 },
          [artist2.id]: { energy: 5 },
          [artist3.id]: { energy: 5 },
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      const updatedArtist1 = await storage.getArtist(artist1.id);
      const updatedArtist2 = await storage.getArtist(artist2.id);
      const updatedArtist3 = await storage.getArtist(artist3.id);

      expect(updatedArtist1?.energy).toBe(80); // 75 + 5
      expect(updatedArtist2?.energy).toBe(85); // 80 + 5
      expect(updatedArtist3?.energy).toBe(75); // 70 + 5
    });

    it('should accumulate energy changes correctly with mood changes', async () => {
      const engine = createTestEngine();

      // Both mood and energy in same object (unified format)
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: 5, energy: 3 },
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      const updatedArtist = await storage.getArtist(artist1.id);
      expect(updatedArtist?.mood).toBe(75); // 70 + 5
      expect(updatedArtist?.energy).toBe(78); // 75 + 3
    });
  });

  describe('Popularity Persistence (Unified Format)', () => {
    it('should persist tour popularity to specific artist', async () => {
      const engine = createTestEngine();

      // Tour popularity boost (unified format)
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: 8, popularity: 5 },
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summary);

      // Apply popularity changes (normally done by processWeeklyPopularityChanges)
      await (engine as any).processWeeklyPopularityChanges(summary);

      const updatedArtist = await storage.getArtist(artist1.id);
      expect(updatedArtist?.popularity).toBe(65); // 60 + 5
    });

    it('should persist global popularity effect to all artists', async () => {
      const engine = createTestEngine();

      // Global popularity boost
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { popularity: 2 },
          [artist2.id]: { popularity: 2 },
          [artist3.id]: { popularity: 2 },
        },
      };

      await (engine as any).processWeeklyPopularityChanges(summary);

      const updatedArtist1 = await storage.getArtist(artist1.id);
      const updatedArtist2 = await storage.getArtist(artist2.id);
      const updatedArtist3 = await storage.getArtist(artist3.id);

      expect(updatedArtist1?.popularity).toBe(62); // 60 + 2
      expect(updatedArtist2?.popularity).toBe(57); // 55 + 2
      expect(updatedArtist3?.popularity).toBe(82); // 80 + 2
    });

    it('should accumulate popularity from multiple sources', async () => {
      const engine = createTestEngine();

      // Popularity from tour + meeting
      const summary: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { popularity: 5 }, // From tour
        },
      };

      // Add more popularity (simulating global effect)
      summary.artistChanges![artist1.id].popularity =
        (summary.artistChanges![artist1.id].popularity || 0) + 2; // +2 from meeting

      await (engine as any).processWeeklyPopularityChanges(summary);

      const updatedArtist = await storage.getArtist(artist1.id);
      expect(updatedArtist?.popularity).toBe(67); // 60 + 5 + 2
    });
  });

  describe('Cross-Week Persistence', () => {
    it('should persist mood changes across week boundaries', async () => {
      const engine = createTestEngine();

      // Week 1: Apply mood change
      const summaryWeek1: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: 10 },
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summaryWeek1);

      // Verify mood persisted
      let updatedArtist = await storage.getArtist(artist1.id);
      expect(updatedArtist?.mood).toBe(80); // 70 + 10

      // Week 2: Apply another mood change
      const summaryWeek2: WeekSummary = {
        week: 2,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: -5 },
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summaryWeek2);

      // Verify cumulative mood (starts from 80, not 70)
      updatedArtist = await storage.getArtist(artist1.id);
      expect(updatedArtist?.mood).toBe(75); // 80 - 5 (not 70 + 10 - 5)
    });

    it('should maintain separate stat tracking across multiple weeks', async () => {
      const engine = createTestEngine();

      // Week 1: Mood and energy changes
      const summaryWeek1: WeekSummary = {
        week: 1,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: 5, energy: 3 },
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summaryWeek1);

      // Week 2: Different stat changes
      const summaryWeek2: WeekSummary = {
        week: 2,
        changes: [],
        revenue: 0,
        expenses: 0,
        reputationChanges: {},
        events: [],
        artistChanges: {
          [artist1.id]: { mood: -2, energy: 5, popularity: 3 },
        },
      };

      await (engine as any).applyArtistChangesToDatabase(summaryWeek2);
      await (engine as any).processWeeklyPopularityChanges(summaryWeek2);

      // Verify all stats tracked correctly
      const updatedArtist = await storage.getArtist(artist1.id);
      expect(updatedArtist?.mood).toBe(73); // 70 + 5 - 2
      expect(updatedArtist?.energy).toBe(83); // 75 + 3 + 5
      expect(updatedArtist?.popularity).toBe(63); // 60 + 3
    });
  });
});
