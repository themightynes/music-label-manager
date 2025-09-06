import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/store/gameStore';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';
import { useLocation } from 'wouter';
import { ExecutiveTeam } from './ExecutiveTeam';
import { SelectionSummary } from './SelectionSummary';

interface MonthPlannerProps {
  onAdvanceMonth: () => Promise<void>;
  isAdvancing: boolean;
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

export function MonthPlanner({ onAdvanceMonth, isAdvancing }: MonthPlannerProps) {
  const { gameState, selectedActions, removeAction, reorderActions, openDialogue } = useGameStore();
  const [, setLocation] = useLocation();
  
  // Keep empty monthlyActions array for SelectionSummary compatibility
  const monthlyActions: MonthlyAction[] = [];
  const loading = false;
  const error: string | null = null;

  // No longer need to fetch actions - executives are defined in ExecutiveTeam component

  if (!gameState) return null;

  // Use action data from API with details
  const getActionDetails = (actionId: string) => {
    const action = monthlyActions.find(a => a.id === actionId);
    if (!action) {
      // Fallback for unknown actions
      return { 
        id: actionId, 
        name: actionId.replace(/_/g, ' '), 
        type: 'unknown', 
        icon: 'fas fa-question',
        description: 'Action details not available',
        category: 'unknown'
      };
    }
    
    // Build ActionDetails from MonthlyAction
    const actionDetails = {
      id: action.id,
      name: action.name,
      type: action.type,
      icon: action.icon,
      description: action.description || 'No description available',
      category: action.category,
      outcomes: action.details?.outcomes,
      cost: action.details?.cost,
      duration: action.details?.duration,
      prerequisites: action.details?.prerequisites,
      benefits: action.details?.benefits
    };
    
    // Add runtime data for specific actions
    if (action.id === 'meet_streaming') {
      actionDetails.prerequisites = `${gameState.playlistAccess || 'None'} playlist access`;
    }
    if (action.id === 'meet_booking') {
      actionDetails.prerequisites = `${gameState.venueAccess || 'None'} venue access`;
    }
    
    return actionDetails;
  };

  // Use recommendation data from actions.json
  const getActionRecommendation = (actionId: string) => {
    const action = monthlyActions.find(a => a.id === actionId);
    if (!action?.recommendations) {
      return { isUrgent: false, isRecommended: false, reason: '' };
    }
    
    const activeProjects = projects.filter(p => p.stage !== 'released' && p.stage !== 'recorded').length;
    const releasedProjects = projects.filter(p => p.stage === 'released' || p.stage === 'recorded').length;
    const artistCount = artists.length;
    const currentMoney = gameState.money || 0;
    const currentRep = gameState.reputation || 0;
    
    const { recommendations } = action;
    let isUrgent = false;
    let isRecommended = false;
    let reason = '';
    
    // Check urgent conditions
    if (recommendations.urgent_when) {
      if (recommendations.urgent_when.money_below && currentMoney < recommendations.urgent_when.money_below) {
        isUrgent = true;
        reason = recommendations.reasons?.low_money || 'Low budget needs attention';
      }
      if (recommendations.urgent_when.artists_equal !== undefined && artistCount === recommendations.urgent_when.artists_equal) {
        isUrgent = true;
        reason = recommendations.reasons?.no_artists || 'No artists signed';
      }
    }
    
    // Check recommended conditions
    if (recommendations.recommended_when && !isUrgent) {
      if (recommendations.recommended_when.active_projects_above !== undefined && activeProjects > recommendations.recommended_when.active_projects_above) {
        isRecommended = true;
        reason = recommendations.reasons?.many_projects || recommendations.reasons?.has_projects || 'Projects need attention';
      }
      if (recommendations.recommended_when.artists_below !== undefined && artistCount < recommendations.recommended_when.artists_below) {
        isRecommended = true;
        reason = recommendations.reasons?.few_artists || 'Need more talent';
      }
      if (recommendations.recommended_when.artists_above !== undefined && artistCount > recommendations.recommended_when.artists_above) {
        isRecommended = true;
        reason = recommendations.reasons?.book_shows || 'Artists available';
      }
      if (recommendations.recommended_when.released_projects_above !== undefined && releasedProjects > recommendations.recommended_when.released_projects_above) {
        if (recommendations.recommended_when.reputation_below) {
          isRecommended = currentRep < recommendations.recommended_when.reputation_below;
          reason = isRecommended ? (recommendations.reasons?.build_reputation || 'Build reputation') : '';
        } else {
          isRecommended = true;
          reason = recommendations.reasons?.has_releases || 'Releases available';
        }
      }
      if (recommendations.recommended_when.playlist_access_not && gameState.playlistAccess !== recommendations.recommended_when.playlist_access_not) {
        isRecommended = isRecommended && releasedProjects > 0;
        reason = isRecommended ? (recommendations.reasons?.leverage_access || 'Leverage access') : '';
      }
      if (recommendations.recommended_when.venue_access_not && gameState.venueAccess !== recommendations.recommended_when.venue_access_not) {
        isRecommended = isRecommended && artistCount > 0;
        reason = isRecommended ? (recommendations.reasons?.book_shows || 'Book shows') : '';
      }
    }
    
    return { isUrgent, isRecommended, reason };
  };


  const handleAutoRecommend = () => {
    const totalSlots = gameState?.focusSlots || 3;
    const usedSlots = gameState?.usedFocusSlots || 0;
    const availableSlots = totalSlots - usedSlots;
    
    const recommendedActions = monthlyActions
      .filter(action => {
        const recommendation = getActionRecommendation(action.id);
        return (recommendation.isRecommended || recommendation.isUrgent) && !selectedActions.includes(action.id);
      })
      .slice(0, availableSlots)
      .map(action => action.id);
    
    recommendedActions.forEach(actionId => selectAction(actionId));
  };

  const handleActionClick = async (actionId: string) => {
    const action = monthlyActions.find(a => a.id === actionId);
    if (!action) return;

    selectAction(actionId);
    
    // Use enriched data from API for role meetings
    if (action.type === 'role_meeting' && action.role_id && action.firstMeetingId) {
      await openDialogue(action.role_id, action.firstMeetingId);
    }
  };


  return (
    <Card className="shadow-lg">
      <CardContent className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-[#A75A5B] to-[#8B4A6C] rounded-xl flex items-center justify-center shadow-lg">
            <i className="fas fa-calendar-alt text-white text-xl md:text-2xl"></i>
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-white">Month {gameState.currentMonth} Focus Strategy</h2>
            <p className="text-sm md:text-base text-white/70">
              Allocate {(gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)} of {gameState?.focusSlots || 3} focus slots to strategic actions
              {gameState?.focusSlots === 4 && <span className="text-green-600 font-semibold"> (4th slot unlocked!)</span>}
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
                <ExecutiveTeam
                  selectedActions={selectedActions}
                  maxSlots={gameState?.focusSlots || 3}
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
                onAdvanceMonth={onAdvanceMonth}
                isAdvancing={isAdvancing}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
