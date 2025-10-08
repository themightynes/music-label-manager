import { describe, it, expect, beforeEach } from 'vitest';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { GameEngine } from '@shared/engine/game-engine';
import { createTestDatabase, seedMinimalGame, clearDatabase } from '../helpers/test-db';
import { DatabaseStorage } from '../../server/storage';
import * as schema from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Minimal gameData mock that reads JSON files synchronously
 */
function createMockGameData() {
  const dataDir = path.join(process.cwd(), 'data');
  const balanceDir = path.join(dataDir, 'balance');

  const economy = JSON.parse(fs.readFileSync(path.join(balanceDir, 'economy.json'), 'utf-8'));
  const progression = JSON.parse(fs.readFileSync(path.join(balanceDir, 'progression.json'), 'utf-8'));
  const config = JSON.parse(fs.readFileSync(path.join(balanceDir, 'config.json'), 'utf-8'));
  const markets = JSON.parse(fs.readFileSync(path.join(balanceDir, 'markets.json'), 'utf-8'));

  // Add venue data from progression.json
  markets.venue_capacities = progression.access_tier_system.venue_access;

  // Merge into balance config structure
  const balance = {
    economy,
    time_progression: {
      campaign_length_weeks: 52,
      week_duration: 7,
    },
    ...config,
  };

  return {
    getBalanceConfigSync: () => balance,
    getBalanceConfig: async () => balance,
    getAllArtists: async () => [],
    getAllExecutives: async () => [],
    getAllRoles: async () => [],
    getAllEvents: async () => [],
    getTourConfigSync: () => ({
      // Required fields for validation
      sell_through_base: 0.7,
      reputation_modifier: 1.0,
      local_popularity_weight: 1.0,
      ticket_price_base: 20,
      ticket_price_per_capacity: 0.01,
      merch_percentage: 0.25,
      // Additional fields
      revenue_per_fan: 25,
      base_attendance: 100,
      sell_through_range: 0.3,
      costs: { small: 5000, medium: 15000, large: 40000 },
    }),
    getAccessTiersSync: () => progression.access_tier_system,
    getMarketConfigSync: () => markets,
    getReleasedSongs: async () => [],
    getActiveRecordingProjects: async () => [],
    getReleasesByGame: async () => [],
    getChartHistoryByGame: async () => [],
    getPlannedReleases: async () => [],
    getEventConfigSync: () => ({ weekly_chance: 0, event_types: [] }),
    getWeeklyBurnRangeSync: () => balance.economy?.weekly_burn_range || [1500, 2500],
    getProgressionThresholdsSync: () => progression,
    getProducerTierSystemSync: () => progression.producer_tiers || {},
    getAvailableProducerTiers: () => ['local'],
  };
}

describe('GameEngine.advanceWeek() - Integration Tests', () => {
  let db: NodePgDatabase<typeof schema>;
  let gameData: any;
  let storage: DatabaseStorage;
  let gameEngine: GameEngine;
  let gameState: any; // Simplified game state object

  beforeEach(async () => {
    // Get database connection (already set up by tests/setup.ts)
    db = createTestDatabase();

    // Clear all data before each test
    await clearDatabase(db);

    // Create mock game data
    gameData = createMockGameData();

    // Use the REAL production storage class with test database - true integration testing!
    storage = new DatabaseStorage(db);

    // Seed minimal game state
    const seededState = await seedMinimalGame(db, {
      currentWeek: 1,
      money: 100000,
      reputation: 0,
    });

    // Create a gameState object that GameEngine can work with
    // GameEngine mutates this object, so we need a mutable reference
    gameState = {
      id: seededState.id,
      currentWeek: seededState.currentWeek,
      money: seededState.money,
      reputation: seededState.reputation,
      campaignCompleted: false, // GameEngine checks this field
    };

    // Create game engine
    gameEngine = new GameEngine(gameState, gameData, storage);
  });

  describe('Basic Week Advancement', () => {
    it('should increment the current week by 1', async () => {
      const { summary } = await gameEngine.advanceWeek([]);

      expect(gameState.currentWeek).toBe(2);
      expect(summary.week).toBe(2);
    });

    it('should deduct weekly operational costs', async () => {
      const startingMoney = gameState.money;
      const { summary } = await gameEngine.advanceWeek([]);

      // Money should decrease due to weekly burn
      expect(gameState.money).toBeLessThan(startingMoney);

      // Weekly operational costs should be in the summary
      expect(summary.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'expense',
            description: expect.stringContaining('operational'),
          })
        ])
      );
    });

    it('should return a valid week summary', async () => {
      const { summary } = await gameEngine.advanceWeek([]);

      expect(summary).toMatchObject({
        week: expect.any(Number),
        revenue: expect.any(Number),
        expenses: expect.any(Number),
        changes: expect.any(Array),
        expenseBreakdown: expect.objectContaining({
          weeklyOperations: expect.any(Number),
          artistSalaries: expect.any(Number),
          executiveSalaries: expect.any(Number),
          marketingCosts: expect.any(Number),
        }),
      });
    });

    it('should throw error if campaign already completed', async () => {
      gameState.campaignCompleted = true;

      await expect(gameEngine.advanceWeek([])).rejects.toThrow(
        'Campaign has already been completed'
      );
    });
  });

  describe('Financial Calculations', () => {
    it('should calculate money correctly: start + revenue - expenses', async () => {
      const startingMoney = gameState.money;
      const { summary } = await gameEngine.advanceWeek([]);

      const expectedMoney = startingMoney + summary.revenue - summary.expenses;
      expect(gameState.money).toBe(expectedMoney);
    });

    it('should track revenue and expenses separately in summary', async () => {
      const { summary } = await gameEngine.advanceWeek([]);

      expect(summary.revenue).toBeGreaterThanOrEqual(0);
      expect(summary.expenses).toBeGreaterThan(0); // Always has weekly burn
      expect(typeof summary.revenue).toBe('number');
      expect(typeof summary.expenses).toBe('number');
    });

    it('should include weekly operational costs in changes', async () => {
      const { summary } = await gameEngine.advanceWeek([]);

      const burnChange = summary.changes.find((c: any) =>
        c.type?.toLowerCase().includes('burn') ||
        c.description?.toLowerCase().includes('operational')
      );

      expect(burnChange).toBeDefined();
      expect(burnChange?.amount).toBeLessThan(0); // Negative = expense
    });
  });

  describe('Week Summary Structure', () => {
    it('should include all required summary fields', async () => {
      const { summary } = await gameEngine.advanceWeek([]);

      expect(summary).toHaveProperty('week');
      expect(summary).toHaveProperty('revenue');
      expect(summary).toHaveProperty('expenses');
      expect(summary).toHaveProperty('changes');
      expect(summary).toHaveProperty('expenseBreakdown');
    });

    it('should track changes in an array', async () => {
      const { summary } = await gameEngine.advanceWeek([]);

      expect(Array.isArray(summary.changes)).toBe(true);
      expect(summary.changes.length).toBeGreaterThan(0); // At least weekly burn
    });

    it('should initialize expense breakdown with all categories', async () => {
      const { summary } = await gameEngine.advanceWeek([]);

      expect(summary.expenseBreakdown).toHaveProperty('weeklyOperations');
      expect(summary.expenseBreakdown).toHaveProperty('artistSalaries');
      expect(summary.expenseBreakdown).toHaveProperty('executiveSalaries');
      expect(summary.expenseBreakdown).toHaveProperty('marketingCosts');
      expect(summary.expenseBreakdown).toHaveProperty('projectCosts');
    });
  });

  describe('State Persistence', () => {
    it('should update game state object in place', async () => {
      const originalRef = gameState;
      await gameEngine.advanceWeek([]);

      // Should be same object reference, just mutated
      expect(gameState).toBe(originalRef);
      expect(gameState.currentWeek).toBe(2);
    });
  });

  describe('Multiple Week Progression', () => {
    it('should advance through multiple weeks correctly', async () => {
      await gameEngine.advanceWeek([]);
      expect(gameState.currentWeek).toBe(2);

      await gameEngine.advanceWeek([]);
      expect(gameState.currentWeek).toBe(3);

      await gameEngine.advanceWeek([]);
      expect(gameState.currentWeek).toBe(4);
    });

    it('should accumulate money changes across weeks', async () => {
      await gameEngine.advanceWeek([]);
      const moneyAfterWeek1 = gameState.money;

      await gameEngine.advanceWeek([]);
      const moneyAfterWeek2 = gameState.money;

      // Money should continue changing (decreasing due to burn)
      expect(moneyAfterWeek2).not.toBe(moneyAfterWeek1);
      expect(moneyAfterWeek2).toBeLessThan(moneyAfterWeek1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle advancing from week 0', async () => {
      gameState.currentWeek = 0;
      const { summary } = await gameEngine.advanceWeek([]);

      expect(gameState.currentWeek).toBe(1);
      expect(summary.week).toBe(1);
    });

    it('should handle zero starting money', async () => {
      gameState.money = 0;
      await gameEngine.advanceWeek([]);

      // Should still process, money will go negative due to burn
      expect(gameState.money).toBeLessThan(0);
    });

    it('should handle negative starting money', async () => {
      const startMoney = -5000;
      gameState.money = startMoney;
      await gameEngine.advanceWeek([]);

      // Money should become more negative due to expenses
      expect(gameState.money).toBeLessThan(startMoney);
    });
  });

  describe('Action Processing', () => {
    it('should advance week with no actions provided', async () => {
      const { summary } = await gameEngine.advanceWeek([]);

      expect(summary).toBeDefined();
      expect(gameState.currentWeek).toBe(2);
    });

    it('should handle empty actions array', async () => {
      const { summary } = await gameEngine.advanceWeek([]);

      expect(summary).toBeDefined();
      expect(gameState.currentWeek).toBe(2);
    });
  });
});
