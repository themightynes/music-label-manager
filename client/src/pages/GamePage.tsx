import React, { useState, useEffect } from 'react';
import { Dashboard } from '../components/Dashboard';
import { CampaignResultsModal } from '../components/CampaignResultsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import GameLayout from '@/layouts/GameLayout';
import { useGameStore } from '../store/gameStore';
import { useGameContext } from '../contexts/GameContext';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { LabelCreationModal } from '@/components/LabelCreationModal';
import type { LabelData } from '@shared/types/gameTypes';
import { useToast } from '@/hooks/use-toast';

export default function GamePage() {
  const [showCampaignResults, setShowCampaignResults] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [isCreatingGameWithLabel, setIsCreatingGameWithLabel] = useState(false);

  const { gameState, campaignResults, createNewGame, isAdvancingMonth, loadGame } = useGameStore();
  const { setGameId } = useGameContext();
  const { toast } = useToast();
  
  useEffect(() => {
    if (gameState) {
      setIsInitializing(false);
      return;
    }

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

        // Check if the game needs label creation after loading
        if (!serverGameState.musicLabel) {
          console.log('🎵 Game loaded without musicLabel, showing label creation modal');
          setShowLabelModal(true);
        }
      } catch (error) {
        console.error('Failed to load existing game state from server:', error);

        if (isCancelled) {
          return;
        }

        // Show label creation modal instead of immediately creating a new game
        if (!isCancelled) {
          setShowLabelModal(true);
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
  }, [gameState, createNewGame, loadGame, setGameId]);
  
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
    if (open === 'save') setShowSaveModal(true);
  }, []);

  // Check if loaded game has no music label and show creation modal (backup check)
  useEffect(() => {
    if (gameState && !gameState.musicLabel && !isInitializing && gameState.currentMonth === 1) {
      console.log('🎵 Backup check: Game state loaded without musicLabel, showing label creation modal');
      setShowLabelModal(true);
    }
  }, [gameState, isInitializing]);

  
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

  const handleCreateLabelFromEmpty = async (labelData: LabelData) => {
    try {
      setIsCreatingGameWithLabel(true);

      if (gameState?.id) {
        // Attach label to existing game
        await apiRequest('POST', `/api/game/${gameState.id}/label`, labelData);
        await loadGame(gameState.id);
      } else {
        // No existing game, create new one with label
        const newGame = await createNewGame('standard', labelData);
        setGameId(newGame.id);
        await loadGame(newGame.id);
      }

      setShowLabelModal(false);
    } catch (error) {
      console.error('Failed to create label for game:', error);
      setCreationError('Failed to create a music label. Please try again.');
    } finally {
      setIsCreatingGameWithLabel(false);
    }
  };

  const createDefaultLabelForGame = async (gameId: string) => {
    try {
      // Attach default label to existing game
      const defaultLabelData: LabelData = {
        name: 'New Music Label'
      };

      await apiRequest('POST', `/api/game/${gameId}/label`, defaultLabelData);
      await loadGame(gameId);
    } catch (error) {
      console.error('Failed to create default label for game:', error);
      setCreationError('Failed to create a music label. Please try again.');
    }
  };

  const handleLabelModalOpenChange = async (open: boolean) => {
    // If modal is closing (open becomes false) and we have a game but no label, create default label (only for new games)
    if (!open && gameState && !gameState.musicLabel && gameState.currentMonth === 1) {
      await createDefaultLabelForGame(gameState.id);
    }
    setShowLabelModal(open);
  };

  if (!gameState) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-primary text-xl">🎵 Music Label Manager</div>
          <div className="text-white/70">Please create your music label to start playing.</div>
          <Button onClick={() => setShowLabelModal(true)} disabled={isCreatingGameWithLabel}>
            {isCreatingGameWithLabel ? 'Creating game…' : 'Create Your Label'}
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
        onShowSaveModal={() => setShowSaveModal(true)}
      >
        <Dashboard
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

      <LabelCreationModal
        open={showLabelModal}
        onOpenChange={handleLabelModalOpenChange}
        onCreateLabel={handleCreateLabelFromEmpty}
        isCreating={isCreatingGameWithLabel}
      />
    </ErrorBoundary>
  );
}
