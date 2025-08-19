import { KPICards } from './KPICards';
import { AccessTierBadges } from './AccessTierBadges';
import { MonthPlanner } from './MonthPlanner';
import { ArtistRoster } from './ArtistRoster';
import { ActiveProjects } from './ActiveProjects';
import { QuickStats } from './QuickStats';
import { DialogueModal } from './DialogueModal';
import { SaveGameModal } from './SaveGameModal';
import { ToastNotification } from './ToastNotification';
import { MonthSummary } from './MonthSummary';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function Dashboard() {
  const { gameState, isAdvancingMonth, advanceMonth, currentDialogue, selectDialogueChoice, closeDialogue, monthlyOutcome, createNewGame } = useGameStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">No Game Loaded</h2>
          <p className="text-slate-600">Please create a new game or load an existing one.</p>
        </div>
      </div>
    );
  }

  const handleAdvanceMonth = async () => {
    try {
      await advanceMonth();
      // Show month summary after advancing
      setShowMonthSummary(true);
    } catch (error) {
      console.error('Failed to advance month:', error);
    }
  };

  const handleCloseSummary = () => {
    setShowMonthSummary(false);
  };

  const handleNewGame = async () => {
    if (gameState.currentMonth && gameState.currentMonth > 1) {
      setShowNewGameConfirm(true);
    } else {
      await confirmNewGame();
    }
  };

  const confirmNewGame = async () => {
    try {
      await createNewGame('standard');
      setShowNewGameConfirm(false);
    } catch (error) {
      console.error('Failed to create new game:', error);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-music text-primary text-2xl"></i>
                <h1 className="text-xl font-bold text-slate-900">Music Label Manager</h1>
              </div>
              <div className="hidden md:flex items-center space-x-2 text-sm text-slate-600">
                <span>Month</span>
                <span className="font-mono font-semibold text-primary">{gameState.currentMonth || 1}</span>
                <span>of 12</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-lg">
                <i className="fas fa-dollar-sign text-success"></i>
                <span className="font-mono font-semibold">${(gameState.money || 0).toLocaleString()}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewGame}
                className="p-2 text-slate-600 hover:text-slate-900"
                title="Start New Game"
              >
                <i className="fas fa-plus"></i>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveModal(true)}
                className="p-2 text-slate-600 hover:text-slate-900"
                title="Save & Load Game"
              >
                <i className="fas fa-save"></i>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-8">
            <KPICards />
            <AccessTierBadges gameState={gameState} />
            <MonthPlanner onAdvanceMonth={handleAdvanceMonth} isAdvancing={isAdvancingMonth} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <ArtistRoster />
            <ActiveProjects />
            <QuickStats />
          </div>
        </div>
      </main>

      {/* Modals */}
      {currentDialogue && (
        <DialogueModal
          roleId={currentDialogue.roleType}
          meetingId={currentDialogue.sceneId || 'monthly_check_in'}
          gameId={gameState.id}
          onClose={closeDialogue}
          onChoiceSelect={async (choiceId: string, effects: any) => {
            await selectDialogueChoice(choiceId, effects);
          }}
        />
      )}
      
      {/* Month Summary Modal */}
      {showMonthSummary && monthlyOutcome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <MonthSummary 
              monthlyStats={monthlyOutcome} 
              onAdvanceMonth={handleCloseSummary}
              isAdvancing={false}
              isMonthResults={true}
            />
          </div>
        </div>
      )}
      
      {/* New Game Confirmation Modal */}
      {showNewGameConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Start New Game?</h3>
              <p className="text-sm text-slate-600 mb-6">
                This will permanently delete your current progress (Month {gameState.currentMonth}). Are you sure you want to continue?
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowNewGameConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmNewGame}
                  className="flex-1"
                >
                  Start New Game
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <SaveGameModal open={showSaveModal} onOpenChange={setShowSaveModal} />
      <ToastNotification />
    </div>
  );
}
