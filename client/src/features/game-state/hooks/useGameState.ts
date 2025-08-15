import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GameState } from '@shared/types/gameTypes';

export function useGameState(gameId?: string) {
  return useQuery({
    queryKey: ['gameState', gameId],
    queryFn: async () => {
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
  
  return useMutation({
    mutationFn: async (selectedActions: any[]) => {
      const response = await fetch('/api/advance-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: 'demo-game', // Will be replaced with proper auth
          selectedActions 
        })
      });
      if (!response.ok) throw new Error('Failed to advance month');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameState'] });
    }
  });
}