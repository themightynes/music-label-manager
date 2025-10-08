import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { GameEngine } from '../../shared/engine/game-engine';
import { createTestStorage } from '../helpers/test-storage';
import { createTestGameData } from '../helpers/test-game-data';
import type { GameState } from '../../shared/types/gameTypes';

/**
 * Comprehensive integration test for the artist scouting system
 * Tests the complete end-to-end flow from UI to database
 */
describe('Artist Scouting Integration', () => {
  let app: express.Application;
  let testStorage: any;
  let testGameData: any;
  let gameId: string;
  let gameState: GameState;

  beforeEach(async () => {
    // Initialize test dependencies
    testStorage = createTestStorage();
    testGameData = createTestGameData();

    // Create test Express app with minimal routes
    app = express();
    app.use(express.json());

    // Create a test game with initial state
    gameState = {
      id: 'test-game-123',
      musicLabel: { name: 'Test Label', reputation: 50 },
      currentWeek: 1,
      money: 100000,
      arOfficeSlotUsed: false,
      arOfficeSourcingType: null,
      flags: {}
    } as GameState;

    gameId = gameState.id;
    await testStorage.saveGameState(gameId, gameState);

    // Add test routes
    app.post('/api/game/:gameId/ar-office/start', async (req, res) => {
      try {
        const { sourcingType } = req.body;
        if (!['active', 'passive', 'specialized'].includes(sourcingType)) {
          return res.status(400).json({ message: 'Invalid sourcing type' });
        }

        const updatedState = {
          ...gameState,
          arOfficeSlotUsed: true,
          arOfficeSourcingType: sourcingType
        };
        await testStorage.saveGameState(gameId, updatedState);
        gameState = updatedState;

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Failed to start A&R operation' });
      }
    });

    app.post('/api/advance-week', async (req, res) => {
      try {
        const engine = new GameEngine(gameState, testGameData, testStorage);
        const result = await engine.advanceWeek();

        // Update our local gameState reference
        gameState = result.gameState;
        await testStorage.saveGameState(gameId, gameState);

        res.json(result);
      } catch (error) {
        res.status(500).json({ message: 'Failed to advance week' });
      }
    });

    app.get('/api/game/:gameId/ar-office/artists', async (req, res) => {
      try {
        const currentState = await testStorage.getGameState(gameId);
        if (!currentState) {
          return res.status(404).json({ message: 'Game not found' });
        }

        // If operation is active, no artists yet
        if (currentState.arOfficeSlotUsed) {
          return res.json({
            artists: [],
            metadata: { operationActive: true }
          });
        }

        // Check for discovered artists in flags
        const flags = (currentState.flags || {}) as any;
        const persistedId = flags.ar_office_discovered_artist_id;

        if (persistedId) {
          const allArtists = await testGameData.getAllArtists();
          const artist = allArtists.find((a: any) => a.id === persistedId);

          if (artist) {
            return res.json({
              artists: [artist],
              metadata: {
                discoveryTime: flags.ar_office_discovery_time,
                sourcingType: flags.ar_office_sourcing_type
              }
            });
          }
        }

        res.json({
          artists: [],
          metadata: { noPersistedResult: true }
        });
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch discovered artists' });
      }
    });
  });

  afterEach(async () => {
    // Cleanup test data
    if (testStorage.cleanup) {
      await testStorage.cleanup();
    }
  });

  describe('Complete A&R Operation Flow', () => {
    it('should complete full active sourcing workflow', async () => {
      // Step 1: Start an A&R operation
      const startResponse = await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'active' })
        .expect(200);

      expect(startResponse.body.success).toBe(true);

      // Step 2: Verify operation is active
      const statusResponse = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      expect(statusResponse.body.artists).toHaveLength(0);
      expect(statusResponse.body.metadata.operationActive).toBe(true);

      // Step 3: Advance the week
      const advanceResponse = await request(app)
        .post('/api/advance-week')
        .expect(200);

      expect(advanceResponse.body.summary).toBeDefined();
      expect(advanceResponse.body.summary.arOffice).toBeDefined();
      expect(advanceResponse.body.summary.arOffice.completed).toBe(true);
      expect(advanceResponse.body.summary.arOffice.sourcingType).toBe('active');

      // Step 4: Verify operation completed and artist discovered
      const completedResponse = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      expect(completedResponse.body.artists).toHaveLength(1);

      const discoveredArtist = completedResponse.body.artists[0];
      expect(discoveredArtist).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        archetype: expect.any(String),
        talent: expect.any(Number),
        popularity: expect.any(Number)
      });

      expect(completedResponse.body.metadata.sourcingType).toBe('active');
      expect(completedResponse.body.metadata.discoveryTime).toBeDefined();
    }, 10000);

    it('should complete full passive sourcing workflow', async () => {
      // Test passive sourcing type
      await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'passive' })
        .expect(200);

      await request(app)
        .post('/api/advance-week')
        .expect(200);

      const response = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      expect(response.body.artists).toHaveLength(1);
      expect(response.body.metadata.sourcingType).toBe('passive');
    });

    it('should complete full specialized sourcing workflow', async () => {
      // Test specialized sourcing type
      await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'specialized' })
        .expect(200);

      await request(app)
        .post('/api/advance-week')
        .expect(200);

      const response = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      expect(response.body.artists).toHaveLength(1);
      expect(response.body.metadata.sourcingType).toBe('specialized');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid sourcing types', async () => {
      const response = await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'invalid' })
        .expect(400);

      expect(response.body.message).toContain('Invalid sourcing type');
    });

    it('should handle game not found scenarios', async () => {
      const response = await request(app)
        .get('/api/game/nonexistent/ar-office/artists')
        .expect(404);

      expect(response.body.message).toBe('Game not found');
    });

    it('should handle no available artists scenario', async () => {
      // Mock game data with no artists
      testGameData.getAllArtists = async () => [];

      await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'active' })
        .expect(200);

      const advanceResponse = await request(app)
        .post('/api/advance-week')
        .expect(200);

      expect(advanceResponse.body.summary.arOffice.discoveredArtistId).toBeNull();

      const artistsResponse = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      expect(artistsResponse.body.artists).toHaveLength(0);
    });
  });

  describe('Artist Selection Logic', () => {
    it('should select high-talent artists for active sourcing', async () => {
      // Mock artists with different talent levels
      const mockArtists = [
        { id: 'low-talent', name: 'Low Talent', talent: 10, popularity: 10, archetype: 'Indie' },
        { id: 'high-talent', name: 'High Talent', talent: 90, popularity: 80, archetype: 'Pop' },
        { id: 'medium-talent', name: 'Medium Talent', talent: 50, popularity: 40, archetype: 'Rock' }
      ];
      testGameData.getAllArtists = async () => mockArtists;

      await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'active' })
        .expect(200);

      await request(app)
        .post('/api/advance-week')
        .expect(200);

      const response = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      expect(response.body.artists[0].id).toBe('high-talent');
    });

    it('should handle artists with missing fields gracefully', async () => {
      // Mock artist with missing fields
      const mockArtists = [
        { id: 'incomplete', name: null, talent: null, popularity: null, archetype: null }
      ];
      testGameData.getAllArtists = async () => mockArtists;

      await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'active' })
        .expect(200);

      await request(app)
        .post('/api/advance-week')
        .expect(200);

      const response = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      const artist = response.body.artists[0];
      expect(artist.name).toMatch(/Artist incomplete/);
      expect(artist.archetype).toBe('Unknown');
      expect(artist.talent).toBe(50);
      expect(artist.popularity).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    it('should complete discovery process within reasonable time', async () => {
      const startTime = Date.now();

      await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'active' })
        .expect(200);

      await request(app)
        .post('/api/advance-week')
        .expect(200);

      await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle multiple concurrent requests gracefully', async () => {
      // Start multiple operations concurrently
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .get(`/api/game/${gameId}/ar-office/artists`)
          .expect(200)
      );

      const responses = await Promise.all(promises);

      // All should return the same result
      responses.forEach(response => {
        expect(response.body).toBeDefined();
        expect(response.body.artists).toBeInstanceOf(Array);
      });
    });
  });

  describe('Data Persistence', () => {
    it('should persist discovered artist across multiple requests', async () => {
      // Complete an A&R operation
      await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'active' })
        .expect(200);

      await request(app)
        .post('/api/advance-week')
        .expect(200);

      // First request
      const firstResponse = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      // Second request should return the same artist
      const secondResponse = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);

      expect(firstResponse.body.artists).toEqual(secondResponse.body.artists);
      expect(firstResponse.body.metadata.discoveryTime).toBe(secondResponse.body.metadata.discoveryTime);
    });

    it('should clear operation state after week advancement', async () => {
      // Start operation
      await request(app)
        .post(`/api/game/${gameId}/ar-office/start`)
        .send({ sourcingType: 'active' })
        .expect(200);

      // Verify operation is active
      const activeResponse = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);
      expect(activeResponse.body.metadata.operationActive).toBe(true);

      // Advance week
      await request(app)
        .post('/api/advance-week')
        .expect(200);

      // Verify operation is no longer active
      const completedResponse = await request(app)
        .get(`/api/game/${gameId}/ar-office/artists`)
        .expect(200);
      expect(completedResponse.body.metadata.operationActive).toBeFalsy();
    });
  });
});