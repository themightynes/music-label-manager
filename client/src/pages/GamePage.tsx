import React, { useState, useEffect } from 'react';
import { Dashboard } from '../components/Dashboard';
import { CampaignResultsModal } from '../components/CampaignResultsModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGameStore } from '../store/gameStore';

export default function GamePage() {
  const [showCampaignResults, setShowCampaignResults] = useState(false);
  
  const { gameState, campaignResults, createNewGame, isAdvancingMonth } = useGameStore();
  
  // Check for campaign results from Zustand store
  useEffect(() => {
    if (campaignResults?.campaignCompleted) {
      setShowCampaignResults(true);
    }
  }, [campaignResults]);
  
  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-primary text-xl mb-4">🎵 Music Label Manager</div>
          <div className="text-slate-600">Please create or load a game to continue</div>
        </div>
      </div>
    );
  }

  const handleNewGame = async () => {
    try {
      await createNewGame('standard');
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