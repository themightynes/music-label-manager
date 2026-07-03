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
import { TextScramble } from './motion-primitives/text-scramble';
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
  const { gameState, isAdvancingWeek, advanceWeek, weeklyOutcome, createProject } = useGameStore();
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
      {/* Page frame header — eyebrow + display title + shimmer underline (v2 §4).
          On lg+ it rises onto the GameHeader vitals row (balance/week/Advance Week),
          matching the dashboard-dock.html single-row header; width is capped so the
          title never runs under (or blocks clicks to) the right-aligned vitals. */}
      <header className="pb-6 pt-2 lg:-mt-[60px] lg:w-[calc(100%-640px)]">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon-cyan">
            Studio Dashboard
          </span>
          <span
            aria-hidden="true"
            className="h-[5px] w-[5px] rounded-full bg-neon-green shadow-glow-green"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">
            sys · online
          </span>
        </div>
        <h1 className="font-display text-aberration text-4xl lowercase leading-[0.95] text-text-primary md:text-[46px]">
          <TextScramble
            as="span"
            duration={0.5}
            speed={0.05}
            trigger={true}
          >
            {(gameState as any)?.musicLabel?.name || 'Music Label'}
          </TextScramble>
        </h1>
        <div className="shimmer-bar mt-3.5 w-64 md:w-[360px]" aria-hidden="true" />
      </header>

      {/* Floating Metrics Dashboard */}
      <MetricsDashboard />

      <main className="py-0 md:py-2">
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
