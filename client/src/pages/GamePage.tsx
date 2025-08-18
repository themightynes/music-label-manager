import React, { useState, useEffect } from 'react';
import { useGameState, useAdvanceMonth } from '../features/game-state/hooks/useGameState';
import { Dashboard } from '../components/Dashboard';
import { CampaignResultsModal } from '../components/CampaignResultsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGameStore } from '../store/gameStore';
import { useQueryClient } from '@tanstack/react-query';
import { useGameContext } from '../contexts/GameContext';

export default function GamePage() {
  const [showCampaignResults, setShowCampaignResults] = useState(false);
  
  const { data: gameState, isLoading, error } = useGameState();
  const advanceMonth = useAdvanceMonth();
  const { createNewGame } = useGameStore();
  const queryClient = useQueryClient();
  const { setGameId } = useGameContext();
  
  // Check for campaign results from advance month mutation
  useEffect(() => {
    if (advanceMonth.data?.campaignResults?.campaignCompleted) {
      setShowCampaignResults(true);
    }
  }, [advanceMonth.data]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-primary text-xl">🎵 Loading Music Label Manager...</div>
      </div>
    );
  }
  
  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-500 text-xl">Failed to load game state</div>
      </div>
    );
  }

  const handleNewGame = async () => {
    try {
      const newGameState = await createNewGame('standard');
      
      // Update the game context with the new game ID
      setGameId(newGameState.id);
      
      // Clear all React Query cache and set new game state
      queryClient.clear();
      queryClient.setQueryData(['gameState', newGameState.id], newGameState);
      
      setShowCampaignResults(false);
    } catch (error) {
      console.error('Failed to create new game:', error);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50">
        <Dashboard />
        
        {/* Campaign Results Modal */}
        {showCampaignResults && advanceMonth.data?.campaignResults && (
          <CampaignResultsModal
            campaignResults={advanceMonth.data.campaignResults}
            onClose={() => setShowCampaignResults(false)}
            onNewGame={handleNewGame}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}