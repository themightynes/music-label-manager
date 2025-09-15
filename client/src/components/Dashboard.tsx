import { MetricsDashboard } from './MetricsDashboard';
import { AccessTierBadges } from './AccessTierBadges';
import { MonthPlanner } from './MonthPlanner';
import { ArtistRoster } from './ArtistRoster';
import { ActiveRecordingSessions } from './ActiveRecordingSessions';
import { ActiveTours } from './ActiveTours';
import { ActiveReleases } from './ActiveReleases';
import { DialogueModal } from './DialogueModal';
import { SaveGameModal } from './SaveGameModal';
import { ToastNotification } from './ToastNotification';
import { MonthSummary } from './MonthSummary';
import { ProjectCreationModal } from './ProjectCreationModal';
import { LivePerformanceModal, type TourCreationData } from './LivePerformanceModal';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface DashboardProps {
  showProjectModal?: boolean;
  setShowProjectModal?: (show: boolean) => void;
  showLivePerformanceModal?: boolean;
  setShowLivePerformanceModal?: (show: boolean) => void;
  showSaveModal?: boolean;
  setShowSaveModal?: (show: boolean) => void;
}

export function Dashboard({
  showProjectModal = false,
  setShowProjectModal = () => {},
  showLivePerformanceModal = false,
  setShowLivePerformanceModal = () => {},
  showSaveModal = false,
  setShowSaveModal = () => {}
}: DashboardProps) {
  const { gameState, isAdvancingMonth, advanceMonth, currentDialogue, selectDialogueChoice, closeDialogue, backToMeetingSelection, monthlyOutcome, selectedActions, artists, projects, createProject } = useGameStore();
  const [, setLocation] = useLocation();
  const [showMonthSummary, setShowMonthSummary] = useState(false);

  useEffect(() => {
    if (monthlyOutcome && !isAdvancingMonth) {
      setShowMonthSummary(true);
    }
  }, [monthlyOutcome, isAdvancingMonth]);

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


  // Live performance creation - uses existing project creation flow
  const handleCreateTour = async (tourData: TourCreationData) => {
    try {
      // Map TourCreationData to ProjectCreationData format
      // Tours are stored as projects with type 'Mini-Tour'
      const projectData = {
        title: tourData.title,
        type: 'Mini-Tour' as const, // Always use Mini-Tour type for live performances
        artistId: tourData.artistId,
        totalCost: Math.round(tourData.budget), // Map budget to totalCost (rounded to integer)
        budgetPerSong: 0, // Not applicable for tours
        songCount: 0, // Tours don't have songs
        producerTier: 'local' as const, // Default for tours
        timeInvestment: 'standard' as const, // Default for tours
        metadata: {
          performanceType: 'mini_tour', // Always store as mini_tour (single shows are just 1-city tours)
          cities: tourData.cities, // 1 for single shows, 3+ for multi-city tours
          venueAccess: tourData.venueAccess || 'none', // Store venue access at time of booking
          venueCapacity: tourData.venueCapacity, // Store selected venue capacity
          createdFrom: 'LivePerformanceModal' // Track source for debugging
        }
      };

      // Use existing createProject method from gameStore
      await createProject(projectData);
      setShowLivePerformanceModal(false);
      
      // Show success notification
      console.log(`✅ Tour "${tourData.title}" created successfully`);
    } catch (error) {
      console.error('Failed to create tour:', error);
      // TODO: Show error notification to user
    }
  };

  return (
    <>
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
            <ActiveRecordingSessions />
          </div>
        </div>

        {/* Tours Section - Full Width */}
        <div className="mb-6">
          <ActiveTours />
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
          onBack={backToMeetingSelection}
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
      
      {/* Live Performance Modal */}
      {gameState && (
        <LivePerformanceModal
          gameState={gameState}
          artists={artists}
          projects={projects}
          onCreateTour={handleCreateTour}
          isCreating={false}
          open={showLivePerformanceModal}
          onOpenChange={setShowLivePerformanceModal}
        />
      )}

      <ToastNotification />
    </>
  );
}
