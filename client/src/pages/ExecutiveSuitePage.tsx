import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/store/gameStore';
import { AlertCircle, Loader2, Rocket, Users2, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { SelectionSummary } from '../components/SelectionSummary';
import { ExecutiveMeetings } from '../components/executive-meetings/ExecutiveMeetings';
import { useGameContext } from '@/contexts/GameContext';
import GameLayout from '@/layouts/GameLayout';
import { useState } from 'react';

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
}

interface WeeklyAction {
  id: string;
  name: string;
  type: string;
  icon: string;
  description?: string;
  role_id?: string;
  category: string;
  project_type?: string;
  campaign_type?: string;
  details?: {
    cost: string;
    duration: string;
    prerequisites: string;
    outcomes: string[];
    benefits: string[];
  };
  recommendations?: {
    urgent_when?: Record<string, any>;
    recommended_when?: Record<string, any>;
    reasons?: Record<string, string>;
  };
  firstMeetingId?: string;
  availableMeetings?: number;
}

export default function ExecutiveSuitePage(props: any = {}) {
  const { onAdvanceWeek, isAdvancing } = props as ExecutiveSuitePageProps;
  const { gameState, selectedActions, removeAction, reorderActions, selectAction } = useGameStore();
  const { gameId } = useGameContext();
  const [, setLocation] = useLocation();
  const [impactPreview, setImpactPreview] = useState<ImpactPreview>({
    immediate: {},
    delayed: {},
    selectedChoices: []
  });

  // Executive meetings removed - keep empty structure for SelectionSummary compatibility
  const weeklyActions: WeeklyAction[] = [];
  const loading = false;
  const error: string | null = null;

  // Fallback advance week function if not provided
  const handleAdvanceWeek = onAdvanceWeek || (async () => {
    console.warn('No advance week handler provided to ExecutiveSuitePage');
  });

  const handleIsAdvancing = isAdvancing || false;

  if (!gameState || !gameId) return null;

  return (
    <GameLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section - Executive Suite */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-white">Week {gameState.currentWeek} Executive Meetings</h2>
              <p className="text-sm md:text-base text-white/70">
                Allocate {(gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)} of {gameState?.focusSlots || 3} focus slots to strategic actions
                {gameState?.focusSlots === 4 && <span className="text-green-600 font-semibold"> (4th Slot Unlocked!)</span>}
              </p>
            </div>
            <div className="hidden md:block" title="Focus Slots are your weekly action points. Each strategic action requires one focus slot.">
              <i className="fas fa-info-circle text-white/50 hover:text-white/70 cursor-help"></i>
            </div>
          </div>

          {/* Focus Action Selection - Split Panel Design */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Action Selection Pool */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-[#A75A5B] mx-auto mb-4 animate-spin" />
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
                  onActionSelected={selectAction}
                  focusSlots={{
                    total: gameState.focusSlots || 3,
                    used: gameState.usedFocusSlots || 0,
                  }}
                  onImpactPreviewUpdate={setImpactPreview}
                />
              )}
            </div>

            {/* Right Panel - Selection Summary */}
            <div className="lg:col-span-1">
              <SelectionSummary
                selectedActions={selectedActions}
                actions={weeklyActions}
                onRemoveAction={removeAction}
                onReorderActions={reorderActions}
                onAdvanceWeek={handleAdvanceWeek}
                isAdvancing={handleIsAdvancing}
                impactPreview={impactPreview}
              />
            </div>
          </div>
        </div>
      </main>
    </GameLayout>
  );
}