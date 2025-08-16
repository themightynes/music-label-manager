import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GameState } from '@shared/types/gameTypes';
import { apiClient } from '@shared/api/client';
import { AdvanceMonthRequest, SelectActionsRequest } from '@shared/api/contracts';

export function useGameState(gameId?: string) {
  return useQuery({
    queryKey: ['gameState', gameId],
    queryFn: async () => {
      const response = await fetch('/api/game-state');
      if (!response.ok) throw new Error('Failed to fetch game state');
      return response.json() as Promise<GameState>;
    },
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAdvanceMonth() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (selectedActions: string[]) => {
      const request: AdvanceMonthRequest = {
        gameId: 'a823d418-b21c-408b-9624-2a81121eedca', // Demo game ID 
        selectedActions: selectedActions.map(actionId => ({
          actionType: 'meeting',
          targetId: actionId
        }))
      };
      return apiClient.advanceMonth(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameState'] });
    }
  });
}

export function useSelectActions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (selectedActions: string[]) => {
      const request: SelectActionsRequest = {
        gameId: 'a823d418-b21c-408b-9624-2a81121eedca', // Demo game ID
        selectedActions
      };
      return apiClient.selectActions(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameState'] });
    }
  });
}