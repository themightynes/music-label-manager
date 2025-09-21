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

interface ExecutiveSuitePageProps {
  onAdvanceMonth?: () => Promise<void>;
  isAdvancing?: boolean;
}

interface MonthlyAction {
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

export default function ExecutiveSuitePage({ onAdvanceMonth, isAdvancing }: ExecutiveSuitePageProps) {
  const { gameState, selectedActions, removeAction, reorderActions, selectAction } = useGameStore();
  const { gameId } = useGameContext();
  const [, setLocation] = useLocation();
  const [impactPreview, setImpactPreview] = useState({
    immediate: {},
    delayed: {},
    selectedChoices: []
  });

  // Executive meetings removed - keep empty structure for SelectionSummary compatibility
  const monthlyActions: MonthlyAction[] = [];
  const loading = false;
  const error: string | null = null;

  // Fallback advance month function if not provided
  const handleAdvanceMonth = onAdvanceMonth || (async () => {
    console.warn('No advance month handler provided to ExecutiveSuitePage');
  });

  const handleIsAdvancing = isAdvancing || false;

  if (!gameState || !gameId) return null;

  return (
    <GameLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0 md:py-2">
        {/* Hero Section - Executive Suite */}
        <div className="mb-6 md:mb-8">
          <Card className="shadow-lg">
            <CardContent className="p-4 md:p-6 lg:p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-[#A75A5B] to-[#8B4A6C] rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-calendar-alt text-white text-xl md:text-2xl"></i>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-white">Month {gameState.currentMonth} Executive Meetings</h2>
                  <p className="text-sm md:text-base text-white/70">
                    Allocate {(gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)} of {gameState?.focusSlots || 3} focus slots to strategic actions
                    {gameState?.focusSlots === 4 && <span className="text-green-600 font-semibold"> (4th Slot Unlocked!)</span>}
                  </p>
                </div>
                <div className="hidden md:block" title="Focus Slots are your monthly action points. Each strategic action requires one focus slot.">
                  <i className="fas fa-info-circle text-white/50 hover:text-white/70 cursor-help"></i>
                </div>
              </div>

              {/* Focus Action Selection - Split Panel Design */}
              <div className="bg-[#3c252d]/[0.66] rounded-[8px] border border-[#65557c] shadow-sm mb-4 md:mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
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
                      actions={monthlyActions}
                      onRemoveAction={removeAction}
                      onReorderActions={reorderActions}
                      onAdvanceMonth={handleAdvanceMonth}
                      isAdvancing={handleIsAdvancing}
                      impactPreview={impactPreview}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </GameLayout>
  );
}