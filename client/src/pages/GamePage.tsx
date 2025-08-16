import React, { useState } from 'react';
import { useGameState, useAdvanceMonth } from '../features/game-state/hooks/useGameState';
import { GameHeader } from '../features/game-state/components/GameHeader';
import { GameDashboard } from '../features/game-state/components/GameDashboard';
import { MonthPlanner } from '../features/game-state/components/MonthPlanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function GamePage() {
  const [view, setView] = useState<'dashboard' | 'planner'>('dashboard');
  
  const { data: gameState, isLoading, error } = useGameState('demo-game');
  const advanceMonth = useAdvanceMonth();
  
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
      </div>
    </ErrorBoundary>
  );
}