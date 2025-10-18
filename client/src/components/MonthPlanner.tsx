import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/store/gameStore';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';
import { useLocation } from 'wouter';
import { SelectionSummary } from './SelectionSummary';
import { ExecutiveMeetings } from './executive-meetings/ExecutiveMeetings';
import { useGameContext } from '@/contexts/GameContext';

interface WeekPlannerProps {
  onAdvanceWeek: () => Promise<void>;
  isAdvancing: boolean;
}

export function WeekPlanner({ onAdvanceWeek, isAdvancing }: WeekPlannerProps) {
  const { gameState, selectedActions, removeAction, reorderActions, selectAction, getAROfficeStatus } = useGameStore();
  const { gameId } = useGameContext();
  const [, setLocation] = useLocation();

  // Executive meetings removed - keep empty structure for SelectionSummary compatibility
  const loading = false;
  const error: string | null = null;

  // Executive loading is now handled by ExecutiveMeetings component

  if (!gameState || !gameId) return null;

  return (
    <Card className="shadow-lg">
      <CardContent className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-brand-burgundy to-brand-burgundy rounded-xl flex items-center justify-center shadow-lg">
            <i className="fas fa-calendar-alt text-white text-xl md:text-2xl"></i>
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-white">Week {gameState.currentWeek} Focus Strategy</h2>
            <p className="text-sm md:text-base text-white/70">
              Allocate {(gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)} of {gameState?.focusSlots || 3} focus slots to strategic actions
              {gameState?.focusSlots === 4 && <span className="text-green-600 font-semibold"> (4th slot unlocked!)</span>}
            </p>
          </div>
          <div className="hidden md:block" title="Focus Slots are your weekly action points. Each strategic action requires one focus slot.">
            <i className="fas fa-info-circle text-white/50 hover:text-white/70 cursor-help"></i>
          </div>
        </div>


        {/* Focus Action Selection - Split Panel Design */}
        <div className="bg-brand-dark-card/[0.66] rounded-[8px] border border-brand-purple-light shadow-sm mb-4 md:mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left Panel - Action Selection Pool */}
            <div className="lg:col-span-2">
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
                />
              )}
            </div>

            {/* Right Panel - Selection Summary */}
            <div className="lg:col-span-1">
              <SelectionSummary
                selectedActions={selectedActions}
                onRemoveAction={removeAction}
                onReorderActions={reorderActions}
                onAdvanceWeek={onAdvanceWeek}
                isAdvancing={isAdvancing}
                impactPreview={{
                  immediate: {},
                  delayed: {},
                  selectedChoices: []
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
