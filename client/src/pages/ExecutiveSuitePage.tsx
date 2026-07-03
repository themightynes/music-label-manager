import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { AlertCircle, Loader2, Briefcase } from 'lucide-react';
import { SelectionSummary } from '../components/SelectionSummary';
import { ExecutiveMeetings } from '../components/executive-meetings/ExecutiveMeetings';
import { useGameContext } from '@/contexts/GameContext';
import GameLayout from '@/layouts/GameLayout';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';

interface SelectedChoice {
  executiveName: string;
  meetingName: string;
  choiceLabel: string;
  effects_immediate: Record<string, number>;
  effects_delayed: Record<string, number>;
}

interface ImpactPreview {
  immediate: Record<string, number>;
  delayed: Record<string, number>;
  selectedChoices: SelectedChoice[];
}

interface ExecutiveSuitePageProps {
  onAdvanceWeek?: () => Promise<void>;
  isAdvancing?: boolean;
  params?: Record<string, string | undefined>;
  location?: string;
  navigate?: (to: string) => void;
}

export default function ExecutiveSuitePage({
  onAdvanceWeek,
  isAdvancing,
}: ExecutiveSuitePageProps = {}) {
  const { gameState, selectedActions, removeAction, reorderActions, selectAction, getAROfficeStatus, advanceWeek, isAdvancingWeek } = useGameStore();
  const { gameId } = useGameContext();
  const [impactPreview, setImpactPreview] = useState<ImpactPreview>({
    immediate: {},
    delayed: {},
    selectedChoices: []
  });

  const loading = false;
  const error: string | null = null;

  // Fallback advance week function if not provided
  const handleAdvanceWeek = onAdvanceWeek || (async () => {
    try {
      await advanceWeek();
    } catch (error) {
      logger.error('Advance week failed from ExecutiveSuitePage:', error);
      toast({
        title: "Failed to advance week",
        description: error instanceof Error ? error.message : "An error occurred while advancing the week. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  const handleIsAdvancing = (typeof isAdvancing === 'boolean') ? isAdvancing : !!isAdvancingWeek;

  if (!gameState || !gameId) return null;

  return (
    <GameLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10 flex items-start justify-between">
          <div>
            <div className="text-label text-[10px] uppercase tracking-[0.24em] text-neon-lilac/60 mb-1 flex items-center gap-2">
              <Briefcase className="w-3 h-3" />
              Week {gameState.currentWeek}
            </div>
            <h1 className="font-display text-2xl md:text-[28px] text-text-primary text-aberration">Executive Meetings</h1>
            <div className="shimmer-bar w-40 mt-2" />
            <p className="mt-3 text-sm md:text-base text-text-body flex items-center gap-2">
              Allocate {(gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)} of {gameState?.focusSlots || 3} focus slots to strategic actions
              {gameState?.focusSlots === 4 && (
                <span className="inline-flex items-center gap-1 rounded-pill bg-positive/10 border border-positive/40 text-positive px-3 py-0.5 font-mono text-[11px]">
                  4th Slot Unlocked
                </span>
              )}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-pill border border-white/10 bg-white/5 px-4 py-2 text-label text-[10px] font-semibold uppercase tracking-[0.4em] text-text-muted">
            Executive Suite
          </div>
        </header>

        <section
          className="glass-panel chromatic-hairline hud-ticks relative overflow-hidden p-8 bg-contain bg-top bg-no-repeat min-h-[600px]"
          style={{ backgroundImage: "url('/executivesuite_background.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-surface-panel/70 via-transparent to-surface-panel-alt/80" aria-hidden />
          <div className="absolute -top-32 -right-16 h-72 w-72 rounded-full bg-neon-purple/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-40 -left-10 h-80 w-80 rounded-full bg-neon-amber/10 blur-3xl" aria-hidden />

          <div className="relative z-10">
            {/* Two Row Layout - Executive Meetings Top, Focus Slots Bottom */}
            <div className="space-y-6">
              {/* Top Row - Executive Meetings */}
              <div>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-neon-purple mx-auto mb-4 animate-spin" />
                    <p className="text-text-body">Loading available actions...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-negative mx-auto mb-4" />
                    <p className="text-negative mb-4">Failed to load actions</p>
                    <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <ExecutiveMeetings
                    gameId={gameId}
                    currentWeek={gameState.currentWeek}
                    onActionSelected={selectAction}
                    focusSlots={{
                      total: gameState.focusSlots || 3,
                      used: gameState.usedFocusSlots || 0,
                    }}
                    arOfficeStatus={getAROfficeStatus()}
                    onImpactPreviewUpdate={setImpactPreview}
                  />
                )}
              </div>

              {/* Bottom Row - Focus Slots / Selection Summary */}
              <div>
                <SelectionSummary
                  selectedActions={selectedActions}
                  onRemoveAction={removeAction}
                  onReorderActions={reorderActions}
                  onAdvanceWeek={handleAdvanceWeek}
                  isAdvancing={handleIsAdvancing}
                  impactPreview={impactPreview}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </GameLayout>
  );
}
