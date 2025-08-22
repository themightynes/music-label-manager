import React, { useState, useEffect } from 'react';
import { Dashboard } from '../components/Dashboard';
import { CampaignResultsModal } from '../components/CampaignResultsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGameStore } from '../store/gameStore';
import { useGameContext } from '../contexts/GameContext';

export default function GamePage() {
  const [showCampaignResults, setShowCampaignResults] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { gameState, campaignResults, createNewGame, isAdvancingMonth, loadGame } = useGameStore();
  const { gameId, setGameId } = useGameContext();
  
  // Initialize game on startup
  useEffect(() => {
    const initializeGame = async () => {
      setIsInitializing(true);
      
      try {
        // If we have a gameId and matching gameState, we're good
        if (gameId && gameState?.id === gameId) {
          setIsInitializing(false);
          return;
        }
        
        // If we have a gameId but no matching gameState, try to load it
        if (gameId) {
          try {
            await loadGame(gameId);
            setIsInitializing(false);
            return;
          } catch (error) {
            console.warn('Failed to load specified game:', gameId, error);
            // Continue to create new game
          }
        }
        
        // No valid game found, create a new one
        console.log('No valid game found, creating new game...');
        const newGameState = await createNewGame('standard');
        setGameId(newGameState.id);
        
      } catch (error) {
        console.error('Failed to initialize game:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeGame();
  }, [gameId, gameState, loadGame, createNewGame, setGameId]);
  
  // Check for campaign results from Zustand store
  useEffect(() => {
    if (campaignResults?.campaignCompleted) {
      setShowCampaignResults(true);
    }
  }, [campaignResults]);
  
  if (isInitializing || !gameState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-primary text-xl mb-4">🎵 Music Label Manager</div>
          <div className="text-slate-600">
            {isInitializing ? 'Initializing game...' : 'Please create or load a game to continue'}
          </div>
        </div>
      </div>
    );
  }

  const handleNewGame = async () => {
    try {
      const newGameState = await createNewGame('standard');
      setGameId(newGameState.id);
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
        {showCampaignResults && campaignResults && (
          <CampaignResultsModal
            campaignResults={campaignResults}
            onClose={() => setShowCampaignResults(false)}
            onNewGame={handleNewGame}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}