import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GameState } from '@shared/types/gameTypes';
import { apiClient } from '@shared/api/client';
import { AdvanceMonthRequest, SelectActionsRequest } from '@shared/api/contracts';
import { useGameContext } from '../../../contexts/GameContext';

export function useGameState() {
  const { gameId } = useGameContext();
  
  return useQuery({
    queryKey: ['gameState', gameId],
    queryFn: async () => {
      if (!gameId) throw new Error('No game ID available');
      const response = await fetch('/api/game-state');
      if (!response.ok) throw new Error('Failed to fetch game state');
      return response.json() as Promise<GameState>;
    },
    enabled: !!gameId,
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAdvanceMonth() {
  const queryClient = useQueryClient();
  const { gameId } = useGameContext();
  
  return useMutation({
    mutationFn: async (selectedActions: any[]) => {
      if (!gameId) throw new Error('No game ID available');
      
      const request: AdvanceMonthRequest = {
        gameId,
        selectedActions: selectedActions.map(action => ({
          actionType: action.actionType || 'role_meeting',
          targetId: action.targetId || null,
          metadata: action.metadata
        }))
      };
      return apiClient.advanceMonth(request);
    },
    onSuccess: (data) => {
      // Update the game state cache with the new data
      queryClient.setQueryData(['gameState', gameId], data.gameState);
      queryClient.invalidateQueries({ queryKey: ['gameState', gameId] });
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