import React, { useState, useEffect } from 'react';
import { useGameState, useAdvanceMonth } from '../features/game-state/hooks/useGameState';
import { GameHeader } from '../features/game-state/components/GameHeader';
import { GameDashboard } from '../features/game-state/components/GameDashboard';
import { MonthPlanner } from '../features/game-state/components/MonthPlanner';
import { MonthSummary } from '../features/game-state/components/MonthSummary';
import { CampaignResultsModal } from '../components/CampaignResultsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGameStore } from '../store/gameStore';
import { useQueryClient } from '@tanstack/react-query';
import { useGameContext } from '../contexts/GameContext';

export default function GamePage() {
  const [view, setView] = useState<'dashboard' | 'planner' | 'summary'>('dashboard');
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
    advanceMonth.mutate(selectedActions, {
      onSuccess: (data) => {
        if (data.campaignResults) {
          setShowCampaignResults(true);
        } else {
          // Show month summary with advancement results
          setView('summary');
        }
      }
    });
  };

  const handleNewGame = async () => {
    try {
      const newGameState = await createNewGame('standard');
      
      // Update the game context with the new game ID
      setGameId(newGameState.id);
      
      // Clear all React Query cache and set new game state
      queryClient.clear();
      queryClient.setQueryData(['gameState', newGameState.id], newGameState);
      
      setShowCampaignResults(false);
      setView('dashboard');
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

  if (view === 'summary' && advanceMonth.data) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-black text-white">
          <GameHeader gameState={gameState} />
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-2xl mx-auto">
              <MonthSummary 
                monthlyStats={advanceMonth.data.summary}
                onAdvanceMonth={() => setView('dashboard')}
                isAdvancing={false}
                isMonthResults={true}
              />
            </div>
          </div>
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