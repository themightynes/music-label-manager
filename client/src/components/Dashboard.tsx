import { MetricsDashboard } from './MetricsDashboard';
import { AccessTierBadges } from './AccessTierBadges';
import { ArtistRoster } from './ArtistRoster';
import { ActiveTours } from './ActiveTours';
import { ActiveReleases } from './ActiveReleases';
import { Top10ChartDisplay } from './Top10ChartDisplay';
import { SaveGameModal } from './SaveGameModal';
import { ToastNotification } from './ToastNotification';
import { WeekSummary } from './WeekSummary';
import { MusicCalendar } from './MusicCalendar';
import { InboxWidget } from './InboxWidget';
import { useGameStore } from '@/store/gameStore';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface DashboardProps {
  showSaveModal?: boolean;
  setShowSaveModal?: (show: boolean) => void;
}

export function Dashboard({
  showSaveModal = false,
  setShowSaveModal = () => {}
}: DashboardProps) {
  const { gameState, isAdvancingWeek, advanceWeek, weeklyOutcome, artists, projects, createProject } = useGameStore();
  const [, setLocation] = useLocation();
  const [showWeekSummary, setShowWeekSummary] = useState(false);
  const [lastProcessedWeek, setLastProcessedWeek] = useState<number | null>(null);

  useEffect(() => {
    // Only auto-show if this is a fresh weekly outcome (not from page refresh)
    if (weeklyOutcome && !isAdvancingWeek && gameState) {
      const isCurrentWeekResult = weeklyOutcome.week === (gameState.currentWeek ?? 1) - 1;
      const isNewResult = lastProcessedWeek !== weeklyOutcome.week;

      if (isCurrentWeekResult && isNewResult) {
        setShowWeekSummary(true);
        setLastProcessedWeek(weeklyOutcome.week);
      }
    }
  }, [weeklyOutcome, isAdvancingWeek, gameState, lastProcessedWeek]);

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


  const handleCloseSummary = () => {
    setShowWeekSummary(false);
  };



  return (
    <>
      {/* Floating Metrics Dashboard */}
      <MetricsDashboard />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 md:py-2">
        {/* Top Row - Inbox and Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 items-stretch">

          {/* Inbox */}
          <div className="lg:col-span-1">
            <InboxWidget />
          </div>

          {/* Music Calendar */}
          <div className="lg:col-span-1">
            <MusicCalendar />
          </div>
        </div>

        {/* Artist Roster Section - Full Width */}
        <div className="mb-6">
          <ArtistRoster />
        </div>

        {/* Tours Section - Full Width */}
        <div className="mb-6">
          <ActiveTours />
        </div>

        {/* Releases Section - Full Width */}
        <div className="mb-6">
          <ActiveReleases />
        </div>

        {/* Top 10 Chart Section - Full Width */}
        <div className="mb-6">
          <Top10ChartDisplay />
        </div>

        {/* Access Tiers - Full Width Horizontal */}
        <div className="mb-6">
          <AccessTierBadges gameState={gameState} />
        </div>
      </main>

      {/* Week Summary Modal */}
      {showWeekSummary && weeklyOutcome && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseSummary}
        >
          <div
            className="bg-brand-dark-card border border-brand-purple rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <WeekSummary
              weeklyStats={weeklyOutcome}
              onAdvanceWeek={handleCloseSummary}
              isAdvancing={false}
              isWeekResults={true}
              onClose={handleCloseSummary}
            />
          </div>
        </div>
      )}
      
      <SaveGameModal open={showSaveModal} onOpenChange={setShowSaveModal} />
      

      <ToastNotification />
    </>
  );
}
