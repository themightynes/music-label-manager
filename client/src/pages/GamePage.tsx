import React, { useState, useEffect } from 'react';
import { Dashboard } from '../components/Dashboard';
import { CampaignResultsModal } from '../components/CampaignResultsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import GameLayout from '@/layouts/GameLayout';
import { useGameStore } from '../store/gameStore';
import { useGameContext } from '../contexts/GameContext';

export default function GamePage() {
  const [showCampaignResults, setShowCampaignResults] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showLivePerformanceModal, setShowLivePerformanceModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

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

  // Handle URL parameters to open modals
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get('open');
    if (open === 'recording') setShowProjectModal(true);
    if (open === 'tour') setShowLivePerformanceModal(true);
    if (open === 'save') setShowSaveModal(true);
  }, []);
  
  if (isInitializing || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-primary text-xl mb-4">🎵 Music Label Manager</div>
          <div className="text-white/70">
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