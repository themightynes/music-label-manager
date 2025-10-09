import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ServerGameData } from '../../server/data/gameData';
import type { RoleMeeting } from '@shared/types/gameTypes';

describe('Action Data Validation', () => {
  let gameData: ServerGameData;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    gameData = ServerGameData.getInstance();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateActionData', () => {
    it('should pass validation for all valid target_scope values', async () => {
      const mockActions: RoleMeeting[] = [
        {
          id: 'global_action',
          prompt: 'Global prompt',
          choices: [],
          target_scope: 'global',
        },
        {
          id: 'predetermined_action',
          prompt: 'Predetermined prompt',
          choices: [],
          target_scope: 'predetermined',
        },
        {
          id: 'user_selected_action',
          prompt: 'User selected with {artistName}',
          prompt_before_selection: 'Which artist?',
          choices: [],
          target_scope: 'user_selected',
        },
      ];

      vi.spyOn(gameData, 'getWeeklyActions').mockResolvedValueOnce(mockActions as any);

      const validateActionData = (gameData as any).validateActionData.bind(gameData);
      await validateActionData();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DATA VALIDATION] All 3 actions validated successfully'
      );
    });

    it('should throw error for missing target_scope field', async () => {
      const mockActions = [
        {
          id: 'test_action',
          prompt: 'Test prompt',
          choices: [],
          // Missing target_scope field
        },
      ];

      vi.spyOn(gameData, 'getWeeklyActions').mockResolvedValueOnce(mockActions as any);
      const validateActionData = (gameData as any).validateActionData.bind(gameData);

      await expect(validateActionData()).rejects.toThrow(
        '[DATA VALIDATION] Action "test_action" is missing required field: target_scope'
      );
    });

    it('should throw error for invalid target_scope value', async () => {
      const mockActions = [
        {
          id: 'test_action',
          prompt: 'Test prompt',
          choices: [],
          target_scope: 'invalid_scope', // Invalid value
        },
      ];

      vi.spyOn(gameData, 'getWeeklyActions').mockResolvedValueOnce(mockActions as any);
      const validateActionData = (gameData as any).validateActionData.bind(gameData);

      await expect(validateActionData()).rejects.toThrow(
        '[DATA VALIDATION] Action "test_action" has invalid target_scope: "invalid_scope". Must be one of: global, predetermined, user_selected'
      );
    });

    it('should warn if user_selected meeting missing {artistName} placeholder', async () => {
      const mockActions = [
        {
          id: 'test_action',
          prompt: 'Test prompt without placeholder', // Missing {artistName}
          prompt_before_selection: 'Which artist?',
          choices: [],
          target_scope: 'user_selected',
        },
      ];

      vi.spyOn(gameData, 'getWeeklyActions').mockResolvedValueOnce(mockActions as any);
      const validateActionData = (gameData as any).validateActionData.bind(gameData);

      await validateActionData();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DATA VALIDATION] Action "test_action" is user_selected but prompt does not contain {artistName} placeholder. Player selection may not display correctly.'
      );
    });

    it('should log info if user_selected meeting missing prompt_before_selection', async () => {
      const mockActions = [
        {
          id: 'test_action',
          prompt: 'Test prompt with {artistName}',
          // Missing prompt_before_selection
          choices: [],
          target_scope: 'user_selected',
        },
      ];

      vi.spyOn(gameData, 'getWeeklyActions').mockResolvedValueOnce(mockActions as any);
      const validateActionData = (gameData as any).validateActionData.bind(gameData);

      await validateActionData();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[DATA VALIDATION] Action "test_action" is user_selected but missing prompt_before_selection field. Consider adding contextual text for better UX.'
      );
    });

    it('should handle validation errors gracefully', async () => {
      const mockActions = [
        {
          id: 'error_action',
          prompt: 'Test prompt',
          choices: [],
          target_scope: 'invalid',
        },
      ];

      vi.spyOn(gameData, 'getWeeklyActions').mockResolvedValueOnce(mockActions as any);
      const validateActionData = (gameData as any).validateActionData.bind(gameData);

      await expect(validateActionData()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DATA VALIDATION] Action validation failed:',
        expect.any(Error)
      );
    });
  });
});
