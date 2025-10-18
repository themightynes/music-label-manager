import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { AlertCircle, Loader2 } from 'lucide-react';
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
            <h1 className="text-3xl font-heading font-bold text-white">Week {gameState.currentWeek} Executive Meetings</h1>
            <p className="mt-2 text-sm md:text-base text-white/70 flex items-center gap-2">
              Allocate {(gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)} of {gameState?.focusSlots || 3} focus slots to strategic actions
              {gameState?.focusSlots === 4 && <Badge variant="outline" className="text-green-400 border-green-400/30">4th Slot Unlocked</Badge>}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
            Executive Suite
          </div>
        </header>

        <section
          className="relative overflow-hidden rounded-3xl border border-brand-rose/30 bg-brand-dark/90 p-8 bg-contain bg-top bg-no-repeat min-h-[600px]"
          style={{ backgroundImage: "url('/executivesuite_background.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark-card/70 via-transparent to-brand-dark-card/80" aria-hidden />
          <div className="absolute -top-32 -right-16 h-72 w-72 rounded-full bg-brand-burgundy/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-40 -left-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />

          <div className="relative z-10">
            {/* Two Row Layout - Executive Meetings Top, Focus Slots Bottom */}
            <div className="space-y-6">
              {/* Top Row - Executive Meetings */}
              <div>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-brand-burgundy mx-auto mb-4 animate-spin" />
                    <p className="text-white/70">Loading available actions...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                    <p className="text-red-600 mb-4">Failed to load actions</p>
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
