import { MetricsDashboard } from './MetricsDashboard';
import { AccessTierBadges } from './AccessTierBadges';
import { ArtistRoster } from './ArtistRoster';
import { ActiveRecordingSessions } from './ActiveRecordingSessions';
import { ActiveTours } from './ActiveTours';
import { ActiveReleases } from './ActiveReleases';
import { Top10ChartDisplay } from './Top10ChartDisplay';
import { SaveGameModal } from './SaveGameModal';
import { ToastNotification } from './ToastNotification';
import { MonthSummary } from './MonthSummary';
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
  const { gameState, isAdvancingMonth, advanceMonth, monthlyOutcome, artists, projects, createProject } = useGameStore();
  const [, setLocation] = useLocation();
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const [lastProcessedMonth, setLastProcessedMonth] = useState<number | null>(null);

  useEffect(() => {
    // Only auto-show if this is a fresh monthly outcome (not from page refresh)
    if (monthlyOutcome && !isAdvancingMonth && gameState) {
      const isCurrentMonthResult = monthlyOutcome.month === gameState.currentMonth - 1;
      const isNewResult = lastProcessedMonth !== monthlyOutcome.month;

      if (isCurrentMonthResult && isNewResult) {
        setShowMonthSummary(true);
        setLastProcessedMonth(monthlyOutcome.month);
      }
    }
  }, [monthlyOutcome, isAdvancingMonth, gameState, lastProcessedMonth]);

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
    setShowMonthSummary(false);
  };



  return (
    <>
      {/* Floating Metrics Dashboard */}
      <MetricsDashboard />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 md:py-2">
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

        {/* Top 10 Chart Section - Full Width */}
        <div className="mb-6">
          <Top10ChartDisplay />
        </div>

        {/* Access Tiers - Full Width Horizontal */}
        <div className="mb-6">
          <AccessTierBadges gameState={gameState} />
        </div>
      </main>

      {/* Month Summary Modal */}
      {showMonthSummary && monthlyOutcome && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseSummary}
        >
          <div
            className="bg-[#2C222A] border border-[#4e324c] rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <MonthSummary
              monthlyStats={monthlyOutcome}
              onAdvanceMonth={handleCloseSummary}
              isAdvancing={false}
              isMonthResults={true}
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
