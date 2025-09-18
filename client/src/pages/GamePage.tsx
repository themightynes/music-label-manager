import React, { useState, useEffect } from 'react';
import { Dashboard } from '../components/Dashboard';
import { CampaignResultsModal } from '../components/CampaignResultsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import GameLayout from '@/layouts/GameLayout';
import { useGameStore } from '../store/gameStore';
import { useGameContext } from '../contexts/GameContext';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

export default function GamePage() {
  const [showCampaignResults, setShowCampaignResults] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showLivePerformanceModal, setShowLivePerformanceModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const { gameState, campaignResults, createNewGame, isAdvancingMonth, loadGame } = useGameStore();
  const { setGameId } = useGameContext();
  
  useEffect(() => {
    let isCancelled = false;

    const initializeGame = async () => {
      setIsInitializing(true);
      setInitializationError(null);

      try {
        const response = await apiRequest('GET', '/api/game-state');
        const serverGameState = await response.json();

        if (isCancelled) {
          return;
        }

        setGameId(serverGameState.id);
        await loadGame(serverGameState.id);
      } catch (error) {
        console.error('Failed to load existing game state from server:', error);

        if (isCancelled) {
          return;
        }

        try {
          const newGameState = await createNewGame('standard');

          if (isCancelled) {
            return;
          }

          setGameId(newGameState.id);
          await loadGame(newGameState.id);
        } catch (fallbackError) {
          console.error('Fallback game creation failed:', fallbackError);

          if (!isCancelled) {
            setInitializationError('Unable to load or create a game. Please try again.');
          }
        }
      } finally {
        if (!isCancelled) {
          setIsInitializing(false);
        }
      }
    };

    initializeGame();

    return () => {
      isCancelled = true;
    };
  }, [createNewGame, loadGame, setGameId]);
  
  // Check for campaign results from Zustand store
  useEffect(() => {
    if (campaignResults?.campaignCompleted) {
      setShowCampaignResults(true);
    }
  }, [campaignResults]);

  // Handle URL parameters to open modals
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get('open');
    if (open === 'recording') setShowProjectModal(true);
    if (open === 'tour') setShowLivePerformanceModal(true);
    if (open === 'save') setShowSaveModal(true);
  }, []);
  
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-primary text-xl mb-4">🎵 Music Label Manager</div>
          <div className="text-white/70">Initializing game...</div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    const handleCreateGameFromEmpty = async () => {
      try {
        setCreationError(null);
        setIsCreatingNewGame(true);
        const newGame = await createNewGame('standard');
        setGameId(newGame.id);
        await loadGame(newGame.id);
      } catch (error) {
        console.error('Failed to create new game:', error);
        setCreationError('Failed to create a new game. Please try again.');
      } finally {
        setIsCreatingNewGame(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-primary text-xl">🎵 Music Label Manager</div>
          <div className="text-white/70">Please create or load a game to continue.</div>
          <Button onClick={handleCreateGameFromEmpty} disabled={isCreatingNewGame}>
            {isCreatingNewGame ? 'Creating game…' : 'Create New Game'}
          </Button>
          {creationError && (
            <div className="text-sm text-red-400">
              {creationError}
            </div>
          )}
          {initializationError && !creationError && (
            <div className="text-sm text-red-400">
              {initializationError}
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleNewGame = async () => {
    try {
      setCreationError(null);
      setIsCreatingNewGame(true);
      const newGameState = await createNewGame('standard');
      setGameId(newGameState.id);
      setShowCampaignResults(false);
      await loadGame(newGameState.id);
    } catch (error) {
      console.error('Failed to create new game:', error);
      setCreationError('Failed to create a new game. Please try again.');
    } finally {
      setIsCreatingNewGame(false);
    }
  };

  return (
    <ErrorBoundary>
      <GameLayout
        onShowProjectModal={() => setShowProjectModal(true)}
        onShowLivePerformanceModal={() => setShowLivePerformanceModal(true)}
        onShowSaveModal={() => setShowSaveModal(true)}
      >
        <Dashboard
          showProjectModal={showProjectModal}
          setShowProjectModal={setShowProjectModal}
          showLivePerformanceModal={showLivePerformanceModal}
          setShowLivePerformanceModal={setShowLivePerformanceModal}
          showSaveModal={showSaveModal}
          setShowSaveModal={setShowSaveModal}
        />
      </GameLayout>

      {/* Campaign Results Modal - keep outside layout */}
      {showCampaignResults && campaignResults && (
        <CampaignResultsModal
          campaignResults={campaignResults}
          onClose={() => setShowCampaignResults(false)}
          onNewGame={handleNewGame}
        />
      )}
    </ErrorBoundary>
  );
}
