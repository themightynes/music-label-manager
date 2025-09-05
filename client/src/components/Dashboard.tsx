import { MetricsDashboard } from './MetricsDashboard';
import { AccessTierBadges } from './AccessTierBadges';
import { MonthPlanner } from './MonthPlanner';
import { ArtistRoster } from './ArtistRoster';
import { ActiveProjects } from './ActiveProjects';
import { ActiveReleases } from './ActiveReleases';
import { DialogueModal } from './DialogueModal';
import { SaveGameModal } from './SaveGameModal';
import { ToastNotification } from './ToastNotification';
import { MonthSummary } from './MonthSummary';
import { ProjectCreationModal } from './ProjectCreationModal';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export function Dashboard() {
  const { gameState, isAdvancingMonth, advanceMonth, currentDialogue, selectDialogueChoice, closeDialogue, monthlyOutcome, createNewGame, selectedActions, artists, createProject } = useGameStore();
  const [, setLocation] = useLocation();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Game Loaded</h2>
          <p className="text-white/70">Please create a new game or load an existing one.</p>
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
    <div className="min-h-screen font-sans">
      {/* Header - Responsive */}
      <header className="bg-[#2C222A] shadow-sm border-b border-[#4e324c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="flex items-center space-x-2">
                <img 
                  src="/logo4.png" 
                  alt="Music Label Manager" 
                  className="h-10 md:h-12 w-auto"
                />
              </div>
              <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm text-white/70">
                <span className="hidden md:inline">Month</span>
                <span className="md:hidden">M</span>
                <span className="font-mono font-semibold text-[#A75A5B]">{gameState.currentMonth || 1}</span>
                <span className="hidden md:inline">of 36</span>
                <span className="md:hidden">/36</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="flex items-center space-x-1 md:space-x-2 bg-[#23121c] border border-[#4e324c] px-2 md:px-3 py-1 rounded-[10px]">
                <i className="fas fa-dollar-sign text-green-400 text-sm"></i>
                <span className="font-mono font-semibold text-sm md:text-base text-white">${(gameState.money || 0).toLocaleString()}</span>
              </div>
              
              {/* Advance to Next Month Button */}
              <Button
                onClick={handleAdvanceMonth}
                disabled={selectedActions.length === 0 || isAdvancingMonth}
                className="bg-[#23121c] border border-[#4e324c] text-white hover:bg-[#D99696] px-3 md:px-4 py-2 text-sm font-medium rounded-[10px] hidden sm:flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdvancingMonth ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-sm"></i>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-forward text-sm"></i>
                    <span>Advance Month</span>
                  </>
                )}
              </Button>
              
              {/* Recording Session Button */}
              <Button
                onClick={() => setShowProjectModal(true)}
                className="bg-[#23121c] border border-[#4e324c] text-white hover:bg-[#D99696] px-3 md:px-4 py-2 text-sm font-medium rounded-[10px] hidden sm:flex items-center space-x-2"
              >
                <i className="fas fa-plus text-sm"></i>
                <span>Recording Session</span>
              </Button>
              
              {/* Plan Release Button */}
              <Button
                onClick={() => setLocation('/plan-release')}
                className="bg-[#23121c] border border-[#4e324c] text-white hover:bg-[#D99696] px-3 md:px-4 py-2 text-sm font-medium rounded-[10px] hidden sm:flex items-center space-x-2"
              >
                <i className="fas fa-rocket text-sm"></i>
                <span>Plan Release</span>
              </Button>
              
              {/* Quality Tester Button */}
              <Button
                onClick={() => setLocation('/quality-tester')}
                className="bg-[#23121c] border border-[#4e324c] text-white hover:bg-[#D99696] p-2 rounded-[10px]"
                size="sm"
                title="Quality Tester"
              >
                <i className="fas fa-flask text-sm"></i>
              </Button>
              
              <div className="flex items-center space-x-1">
                {/* Mobile Plan Release Button */}
                <Button
                  onClick={() => setLocation('/plan-release')}
                  className="bg-[#23121c] border border-[#4e324c] text-white hover:bg-[#2a1923] p-2 sm:hidden rounded-[10px]"
                  size="sm"
                  title="Plan Release"
                >
                  <i className="fas fa-rocket text-sm"></i>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewGame}
                  className="p-2 text-white hover:text-white hover:bg-white/10"
                  title="Start New Game"
                >
                  <i className="fas fa-plus text-sm"></i>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveModal(true)}
                  className="p-2 text-white hover:text-white hover:bg-white/10"
                  title="Save & Load Game"
                >
                  <i className="fas fa-save text-sm"></i>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Metrics Dashboard */}
      <MetricsDashboard />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 md:py-2">
        {/* Hero Section - Month Planner */}
        <div className="mb-6 md:mb-8">
          <MonthPlanner onAdvanceMonth={handleAdvanceMonth} isAdvancing={isAdvancingMonth} />
        </div>

        {/* Supporting Information Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          
          {/* Artist Management */}
          <div className="lg:col-span-1">
            <ArtistRoster />
          </div>

          {/* Recording Sessions */}
          <div className="lg:col-span-1">
            <ActiveProjects />
          </div>
        </div>

        {/* Releases Section - Full Width */}
        <div className="mb-6">
          <ActiveReleases />
        </div>

        {/* Access Tiers - Full Width Horizontal */}
        <div className="mb-6">
          <AccessTierBadges gameState={gameState} />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <MonthSummary 
            monthlyStats={monthlyOutcome} 
            onAdvanceMonth={handleCloseSummary}
            isAdvancing={false}
            isMonthResults={true}
          />
        </div>
      )}
      
      {/* New Game Confirmation Modal */}
      {showNewGameConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-white mb-2">Start New Game?</h3>
              <p className="text-sm text-white/70 mb-6">
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
      
      {/* Project Creation Modal */}
      {gameState && (
        <ProjectCreationModal
          gameState={gameState}
          artists={artists}
          onCreateProject={async (projectData) => {
            await createProject(projectData);
            setShowProjectModal(false);
          }}
          isCreating={false}
          open={showProjectModal}
          onOpenChange={setShowProjectModal}
        />
      )}
      
      <ToastNotification />
    </div>
  );
}
