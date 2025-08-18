import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GameState } from '@shared/schema';
import { apiClient } from '@shared/api/client';
import { AdvanceMonthRequest, SelectActionsRequest } from '@shared/api/contracts';
import { useGameContext } from '../../../contexts/GameContext';

export function useGameState() {
  const { gameId } = useGameContext();
  
  return useQuery({
    queryKey: ['gameState', gameId],
    queryFn: async () => {
      if (!gameId) {
        const response = await fetch('/api/game-state');
        if (!response.ok) throw new Error('Failed to fetch game state');
        return response.json() as Promise<GameState>;
      } else {
        const response = await fetch(`/api/game/${gameId}`);
        if (!response.ok) throw new Error('Failed to fetch game state');
        const data = await response.json();
        return data.gameState as GameState;
      }
    },
    enabled: true,
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAdvanceMonth() {
  const queryClient = useQueryClient();
  const { gameId } = useGameContext();
  
  return useMutation({
    mutationFn: async (selectedActions: string[]) => {
      // Get the current game state to get the actual game ID
      const gameState = queryClient.getQueryData(['gameState', gameId]) as GameState;
      if (!gameState) throw new Error('No game state available');
      
      const request: AdvanceMonthRequest = {
        gameId: gameState.id,
        selectedActions: selectedActions.map(actionId => ({
          actionType: 'role_meeting' as const,
          targetId: actionId,
          metadata: {}
        }))
      };
      return apiClient.advanceMonth(request);
    },
    onSuccess: (data) => {
      // Update the game state cache with the new data
      queryClient.setQueryData(['gameState', gameId], data.gameState);
      queryClient.invalidateQueries({ queryKey: ['gameState', gameId] });
    },
    onError: (error: any) => {
      console.error('Failed to advance month:', error);
      // Don't throw here, let the UI handle the error display
    }
  });
}

export function useSelectActions() {
  const queryClient = useQueryClient();
  const { gameId } = useGameContext();
  
  return useMutation({
    mutationFn: async (selectedActions: any[]) => {
      if (!gameId) throw new Error('No game ID available');
      
      const request: SelectActionsRequest = {
        gameId,
        selectedActions
      };
      return apiClient.selectActions(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameState', gameId] });
    }
  });
}