import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadAllDialogues, selectRandomDialogue, submitArtistDialogueChoice } from '../artistDialogueService';
import type { DialogueScene } from '@shared/types/gameTypes';
import type { ArtistDialogueResponse } from '@shared/api/contracts';
import { createTestDialogueScene } from '../../../../tests/helpers/test-factories';

// Mock the apiRequest function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '@/lib/queryClient';

const createMockResponse = <T>(data: T): Response => {
  return {
    json: () => Promise.resolve(data),
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: function() { return this; },
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(''),
  } as Response;
};

describe('artistDialogueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadAllDialogues', () => {
    it('should successfully load all dialogue scenes', async () => {
      const mockScenes: DialogueScene[] = [
        createTestDialogueScene({
          id: 'dialogue_test_1',
          prompt: 'Test prompt 1',
          choices: [
            { id: 'choice_1', label: 'Choice 1', effects_immediate: {}, effects_delayed: {} },
            { id: 'choice_2', label: 'Choice 2', effects_immediate: {}, effects_delayed: {} },
            { id: 'choice_3', label: 'Choice 3', effects_immediate: {}, effects_delayed: {} },
          ],
        }),
        createTestDialogueScene({
          id: 'dialogue_test_2',
          prompt: 'Test prompt 2',
          choices: [
            { id: 'choice_1', label: 'Choice 1', effects_immediate: {}, effects_delayed: {} },
            { id: 'choice_2', label: 'Choice 2', effects_immediate: {}, effects_delayed: {} },
            { id: 'choice_3', label: 'Choice 3', effects_immediate: {}, effects_delayed: {} },
          ],
        }),
      ];

      const response = createMockResponse({
        version: '0.2.0',
        scenes: mockScenes,
      });
      vi.mocked(apiRequest).mockResolvedValueOnce(response);

      const result = await loadAllDialogues();

      expect(apiRequest).toHaveBeenCalledWith('GET', '/api/dialogue-scenes');
      expect(result).toEqual(mockScenes);
      expect(result).toHaveLength(2);
    });

    it('should return array with correct structure (id, prompt, choices)', async () => {
      const mockScenes: DialogueScene[] = [
        createTestDialogueScene({
          id: 'dialogue_test_1',
          prompt: 'Test prompt',
          choices: [
            { id: 'choice_1', label: 'Choice 1', effects_immediate: { artist_mood: 2 }, effects_delayed: {} },
            { id: 'choice_2', label: 'Choice 2', effects_immediate: { money: -1000 }, effects_delayed: {} },
            { id: 'choice_3', label: 'Choice 3', effects_immediate: {}, effects_delayed: { artist_energy: 3 } },
          ],
        }),
      ];

      const response = createMockResponse({
        version: '0.2.0',
        scenes: mockScenes,
      });
      vi.mocked(apiRequest).mockResolvedValueOnce(response);

      const result = await loadAllDialogues();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('prompt');
      expect(result[0]).toHaveProperty('choices');
      expect(result[0].choices).toHaveLength(3);
      expect(result[0].choices[0]).toHaveProperty('id');
      expect(result[0].choices[0]).toHaveProperty('label');
      expect(result[0].choices[0]).toHaveProperty('effects_immediate');
      expect(result[0].choices[0]).toHaveProperty('effects_delayed');
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce(new Error('Network error'));

      await expect(loadAllDialogues()).rejects.toThrow('Failed to load dialogue data');
    });

    it('should handle empty scenes array', async () => {
      const response = createMockResponse({
        version: '0.2.0',
        scenes: [],
      });
      vi.mocked(apiRequest).mockResolvedValueOnce(response);

      const result = await loadAllDialogues();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('selectRandomDialogue', () => {
    const mockScenes: DialogueScene[] = [
      createTestDialogueScene({
        id: 'dialogue_1',
        prompt: 'Prompt 1',
        choices: [
          { id: 'choice_1', label: 'Choice 1', effects_immediate: {}, effects_delayed: {} },
          { id: 'choice_2', label: 'Choice 2', effects_immediate: {}, effects_delayed: {} },
          { id: 'choice_3', label: 'Choice 3', effects_immediate: {}, effects_delayed: {} },
        ],
      }),
      createTestDialogueScene({
        id: 'dialogue_2',
        prompt: 'Prompt 2',
        choices: [
          { id: 'choice_1', label: 'Choice 1', effects_immediate: {}, effects_delayed: {} },
          { id: 'choice_2', label: 'Choice 2', effects_immediate: {}, effects_delayed: {} },
          { id: 'choice_3', label: 'Choice 3', effects_immediate: {}, effects_delayed: {} },
        ],
      }),
      createTestDialogueScene({
        id: 'dialogue_3',
        prompt: 'Prompt 3',
        choices: [
          { id: 'choice_1', label: 'Choice 1', effects_immediate: {}, effects_delayed: {} },
          { id: 'choice_2', label: 'Choice 2', effects_immediate: {}, effects_delayed: {} },
          { id: 'choice_3', label: 'Choice 3', effects_immediate: {}, effects_delayed: {} },
        ],
      }),
    ];

    it('should return one dialogue from the provided array', () => {
      const result = selectRandomDialogue(mockScenes);

      expect(result).toBeDefined();
      expect(mockScenes).toContainEqual(result);
    });

    it('should return different dialogues over multiple calls (randomness)', () => {
      // Test randomness by calling 50+ times and checking for variety
      const selections = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const selected = selectRandomDialogue(mockScenes);
        selections.add(selected.id);
      }

      // With 3 scenes and 100 selections, we should get at least 2 different scenes
      // (proving it's not always returning the same one)
      expect(selections.size).toBeGreaterThan(1);
      expect(selections.size).toBeLessThanOrEqual(mockScenes.length);
    });

    it('should return dialogue with valid structure (id, prompt, choices with 3 items)', () => {
      const result = selectRandomDialogue(mockScenes);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('choices');
      expect(result.choices).toHaveLength(3);
      expect(typeof result.id).toBe('string');
      expect(typeof result.prompt).toBe('string');
    });

    it('should work with minimum array (1 scene)', () => {
      const singleScene = [mockScenes[0]];
      const result = selectRandomDialogue(singleScene);

      expect(result).toEqual(mockScenes[0]);
    });

    it('should throw error when array is empty', () => {
      expect(() => selectRandomDialogue([])).toThrow('No dialogue scenes available');
    });

    it('should always select from provided scenes', () => {
      for (let i = 0; i < 20; i++) {
        const result = selectRandomDialogue(mockScenes);
        const sceneIds = mockScenes.map((s) => s.id);
        expect(sceneIds).toContain(result.id);
      }
    });
  });

  describe('submitArtistDialogueChoice', () => {
    const gameId = 'game_test_123';
    const mockRequest = {
      artistId: 'artist_test_456',
      sceneId: 'dialogue_test_1',
      choiceId: 'choice_1',
    };

    const mockResponse: ArtistDialogueResponse = {
      success: true,
      artistId: 'artist_test_456',
      artistName: 'Test Artist',
      sceneId: 'dialogue_test_1',
      choiceId: 'choice_1',
      effects: { artist_mood: 2, money: -2000 },
      delayedEffects: { artist_energy: 3 },
      message: 'Conversation completed successfully',
    };

    it('should make POST request with correct payload structure', async () => {
      const response = createMockResponse(mockResponse);
      vi.mocked(apiRequest).mockResolvedValueOnce(response);

      await submitArtistDialogueChoice(gameId, mockRequest);

      expect(apiRequest).toHaveBeenCalledWith(
        'POST',
        `/api/game/${gameId}/artist-dialogue`,
        mockRequest
      );
    });

    it('should return response with effects and artist info', async () => {
      const response = createMockResponse(mockResponse);
      vi.mocked(apiRequest).mockResolvedValueOnce(response);

      const result = await submitArtistDialogueChoice(gameId, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.artistId).toBe(mockRequest.artistId);
      expect(result.artistName).toBe('Test Artist');
      expect(result.effects).toHaveProperty('artist_mood');
      expect(result.effects).toHaveProperty('money');
      expect(result.delayedEffects).toHaveProperty('artist_energy');
    });

    it('should handle 400 validation errors', async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce({
        status: 400,
        message: 'Invalid request data',
      });

      await expect(submitArtistDialogueChoice(gameId, mockRequest)).rejects.toThrow(
        'Failed to submit dialogue choice'
      );
    });

    it('should handle 404 not found errors', async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce({
        status: 404,
        message: 'Artist not found',
      });

      await expect(submitArtistDialogueChoice(gameId, mockRequest)).rejects.toThrow(
        'Failed to submit dialogue choice'
      );
    });

    it('should handle 500 server errors', async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce({
        status: 500,
        message: 'Internal server error',
      });

      await expect(submitArtistDialogueChoice(gameId, mockRequest)).rejects.toThrow(
        'Failed to submit dialogue choice'
      );
    });

    it('should include gameId in URL path correctly', async () => {
      const response = createMockResponse(mockResponse);
      vi.mocked(apiRequest).mockResolvedValueOnce(response);

      const customGameId = 'custom_game_789';
      await submitArtistDialogueChoice(customGameId, mockRequest);

      expect(apiRequest).toHaveBeenCalledWith(
        'POST',
        `/api/game/${customGameId}/artist-dialogue`,
        mockRequest
      );
    });

    it('should handle network timeout errors', async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(submitArtistDialogueChoice(gameId, mockRequest)).rejects.toThrow(
        'Failed to submit dialogue choice'
      );
    });

    it('should validate response structure', async () => {
      const response = createMockResponse(mockResponse);
      vi.mocked(apiRequest).mockResolvedValueOnce(response);

      const result = await submitArtistDialogueChoice(gameId, mockRequest);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('artistId');
      expect(result).toHaveProperty('artistName');
      expect(result).toHaveProperty('sceneId');
      expect(result).toHaveProperty('choiceId');
      expect(result).toHaveProperty('effects');
      expect(result).toHaveProperty('delayedEffects');
      expect(result).toHaveProperty('message');
    });
  });
});
