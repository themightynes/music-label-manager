import React, { useState, useEffect } from 'react';
import { useGameState, useAdvanceMonth } from '../features/game-state/hooks/useGameState';
import { GameHeader } from '../features/game-state/components/GameHeader';
import { GameDashboard } from '../features/game-state/components/GameDashboard';
import { MonthPlanner } from '../features/game-state/components/MonthPlanner';
import { CampaignResultsModal } from '../components/CampaignResultsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGameStore } from '../store/gameStore';
import { useQueryClient } from '@tanstack/react-query';
import { useGameContext } from '../contexts/GameContext';

export default function GamePage() {
  const [view, setView] = useState<'dashboard' | 'planner'>('dashboard');
  const [showCampaignResults, setShowCampaignResults] = useState(false);
  
  const { data: gameState, isLoading, error, refetch } = useGameState();
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-500 text-xl">🎵 Loading Music Label Manager...</div>
      </div>
    );
  }
  
  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">Failed to load game state</div>
      </div>
    );
  }

  const handleAdvanceMonth = (selectedActions: string[]) => {
    advanceMonth.mutate(selectedActions);
    setView('dashboard');
  };

  const handleNewGame = async () => {
    try {
      const newGameState = await createNewGame('standard');
      
      // Update React Query cache with the new game state immediately
      queryClient.setQueryData(['gameState', null], newGameState);
      queryClient.invalidateQueries({ queryKey: ['gameState'] });
      
      setShowCampaignResults(false);
      setView('dashboard');
      
      // Force a page refresh to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Failed to create new game:', error);
    }
  };

  if (view === 'planner') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-black text-white">
          <GameHeader gameState={gameState} />
          <MonthPlanner
            gameState={gameState}
            onAdvanceMonth={handleAdvanceMonth}
            onBackToDashboard={() => setView('dashboard')}
            isAdvancing={advanceMonth.isPending}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white">
        <GameHeader gameState={gameState} />
        <GameDashboard
          gameState={gameState}
          onPlanMonth={() => setView('planner')}
          isAdvancing={advanceMonth.isPending}
        />
        
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