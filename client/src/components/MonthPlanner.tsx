import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/store/gameStore';
import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';
import { useLocation } from 'wouter';
import { ActionSelectionPool } from './ActionSelectionPool';
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
}

export function MonthPlanner({ onAdvanceMonth, isAdvancing }: MonthPlannerProps) {
  const { gameState, selectedActions, selectAction, removeAction, reorderActions, clearActions, openDialogue, projects, artists } = useGameStore();
  const [, setLocation] = useLocation();
  
  // API state for monthly actions
  const [monthlyActions, setMonthlyActions] = useState<MonthlyAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch monthly actions from API
  const fetchMonthlyActions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/actions/monthly');
      if (!response.ok) {
        throw new Error(`Failed to fetch actions: ${response.status}`);
      }
      const data = await response.json();
      setMonthlyActions(data.actions || []);
    } catch (err) {
      console.error('Failed to fetch monthly actions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load actions');
      // Fallback to empty array - component will show error state
      setMonthlyActions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyActions();
  }, []);

  if (!gameState) return null;

  // Enhanced action metadata with detailed context
  const getActionDetails = (actionId: string) => {
    const baseAction = monthlyActions.find(a => a.id === actionId);
    if (!baseAction) {
      // Fallback for unknown actions
      return { 
        id: actionId, 
        name: actionId.replace('_', ' '), 
        type: 'unknown', 
        icon: 'fas fa-question',
        description: 'Action details not available',
        category: 'unknown'
      };
    }

    const actionDetails: Record<string, any> = {
      'meet_manager': {
        ...baseAction,
        description: 'Strategic planning and resource allocation',
        outcomes: ['Budget decisions', 'Strategic direction', 'Resource optimization'],
        cost: 'Free',
        duration: '1 week',
        prerequisites: 'None',
        benefits: ['Unlock budget decisions', 'Strategic insights', 'Team coordination']
      },
      'meet_ar': {
        ...baseAction,
        description: 'Talent scouting and artist development strategy',
        outcomes: ['Artist discovery', 'Development planning', 'Market positioning'],
        cost: '$2,000 - $5,000',
        duration: '1-2 weeks',
        prerequisites: 'None',
        benefits: ['Access to new talent', 'Artist development insights', 'Market analysis']
      },
      'meet_producer': {
        ...baseAction,
        description: 'Music production planning and quality control',
        outcomes: ['Production timeline', 'Quality improvements', 'Technical direction'],
        cost: '$1,000 - $3,000',
        duration: '1 week',
        prerequisites: 'Active project recommended',
        benefits: ['Enhanced project quality', 'Production efficiency', 'Technical expertise']
      },
      'meet_pr': {
        ...baseAction,
        description: 'Media strategy and publicity planning',
        outcomes: ['Press coverage', 'Media relationships', 'Brand positioning'],
        cost: '$2,000 - $6,000',
        duration: '2-3 weeks',
        prerequisites: 'Project in marketing stage',
        benefits: ['Increased visibility', 'Media connections', 'Brand awareness']
      },
      'meet_digital': {
        ...baseAction,
        description: 'Digital marketing and social media strategy',
        outcomes: ['Online campaigns', 'Social media growth', 'Digital presence'],
        cost: '$1,000 - $8,000',
        duration: '1-4 weeks',
        prerequisites: 'Released content recommended',
        benefits: ['Digital reach', 'Fan engagement', 'Online visibility']
      },
      'meet_streaming': {
        ...baseAction,
        description: 'Playlist placement and streaming optimization',
        outcomes: ['Playlist submissions', 'Streaming strategy', 'Platform relationships'],
        cost: '$500 - $2,000',
        duration: '1-2 weeks',
        prerequisites: `${gameState.playlistAccess || 'None'} playlist access`,
        benefits: ['Playlist placements', 'Streaming growth', 'Platform visibility']
      },
      'meet_booking': {
        ...baseAction,
        description: 'Live performance and tour planning',
        outcomes: ['Venue bookings', 'Tour planning', 'Live opportunities'],
        cost: '$1,000 - $5,000',
        duration: '2-4 weeks',
        prerequisites: `${gameState.venueAccess || 'None'} venue access`,
        benefits: ['Live revenue', 'Fan engagement', 'Market expansion']
      },
      'meet_operations': {
        ...baseAction,
        description: 'Business operations and efficiency optimization',
        outcomes: ['Cost reduction', 'Process improvement', 'Team efficiency'],
        cost: '$500 - $2,000',
        duration: '1 week',
        prerequisites: 'None',
        benefits: ['Operational efficiency', 'Cost savings', 'Team productivity']
      }
    };

    return actionDetails[actionId] || baseAction;
  };

  // Check if an action is optimal based on current game state
  const getActionRecommendation = (actionId: string) => {
    const activeProjects = projects.filter(p => p.stage !== 'released' && p.stage !== 'recorded').length;
    const releasedProjects = projects.filter(p => p.stage === 'released' || p.stage === 'recorded').length;
    const artistCount = artists.length;
    const currentMoney = gameState.money || 0;
    const currentRep = gameState.reputation || 0;

    switch (actionId) {
      case 'meet_manager':
        return {
          isUrgent: currentMoney < 20000,
          isRecommended: activeProjects > 2,
          reason: currentMoney < 20000 ? 'Low budget needs attention' : activeProjects > 2 ? 'Multiple projects need management' : ''
        };
      case 'meet_ar':
        return {
          isUrgent: artistCount === 0,
          isRecommended: artistCount < 3,
          reason: artistCount === 0 ? 'No artists signed' : artistCount < 3 ? 'Need more talent' : ''
        };
      case 'meet_producer':
        return {
          isUrgent: false,
          isRecommended: activeProjects > 0,
          reason: activeProjects > 0 ? 'Active projects need production' : ''
        };
      case 'meet_pr':
        return {
          isUrgent: false,
          isRecommended: releasedProjects > 0 && currentRep < 50,
          reason: releasedProjects > 0 && currentRep < 50 ? 'Build reputation from releases' : ''
        };
      case 'meet_digital':
        return {
          isUrgent: false,
          isRecommended: releasedProjects > 0,
          reason: releasedProjects > 0 ? 'Promote released music digitally' : ''
        };
      case 'meet_streaming':
        return {
          isUrgent: false,
          isRecommended: gameState.playlistAccess !== 'None' && releasedProjects > 0,
          reason: gameState.playlistAccess !== 'None' && releasedProjects > 0 ? 'Leverage playlist access' : ''
        };
      case 'meet_booking':
        return {
          isUrgent: false,
          isRecommended: gameState.venueAccess !== 'None' && artistCount > 0,
          reason: gameState.venueAccess !== 'None' && artistCount > 0 ? 'Book shows for artists' : ''
        };
      case 'meet_operations':
        return {
          isUrgent: currentMoney < 30000,
          isRecommended: activeProjects > 1,
          reason: currentMoney < 30000 ? 'Financial operations urgent' : activeProjects > 1 ? 'Manage multiple projects' : ''
        };
      default:
        return { isUrgent: false, isRecommended: false, reason: '' };
    }
  };


  const handleAutoRecommend = () => {
    const recommendedActions = monthlyActions
      .filter(action => {
        const recommendation = getActionRecommendation(action.id);
        return (recommendation.isRecommended || recommendation.isUrgent) && !selectedActions.includes(action.id);
      })
      .slice(0, 3 - selectedActions.length)
      .map(action => action.id);
    
    recommendedActions.forEach(actionId => selectAction(actionId));
  };

  const handleActionClick = async (actionId: string) => {
    const action = monthlyActions.find(a => a.id === actionId);
    if (!action) return;

    if (action.type === 'role_meeting') {
      // Map action IDs to actual role IDs in roles.json
      const roleMapping: Record<string, string> = {
        'meet_manager': 'manager',
        'meet_ar': 'anr',              // Fix: ar -> anr
        'meet_producer': 'producer',
        'meet_pr': 'pr',
        'meet_digital': 'digital',
        'meet_streaming': 'streaming',
        'meet_booking': 'booking',
        'meet_operations': 'ops'       // Fix: operations -> ops
      };
      
      // Map roles to their first available meeting
      const defaultMeetings: Record<string, string> = {
        'manager': 'mgr_priorities',
        'anr': 'anr_single_choice',
        'producer': 'prod_timeline', 
        'pr': 'pr_angle',
        'digital': 'ads_split',
        'streaming': 'pitch_strategy',
        'booking': 'tour_scale',
        'ops': 'release_ops'
      };
      
      const roleId = roleMapping[action.id] || 'manager';
      const meetingId = defaultMeetings[roleId] || 'mgr_priorities';
      
      // CRITICAL FIX: Add action to slot AND open dialogue
      selectAction(actionId);
      await openDialogue(roleId, meetingId);
    } else {
      selectAction(actionId);
    }
  };


  return (
    <Card className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-lg border-2 border-blue-200/50">
      <CardContent className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <i className="fas fa-calendar-alt text-white text-xl md:text-2xl"></i>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">Month {gameState.currentMonth} Strategy</h2>
            <p className="text-sm md:text-base text-slate-600">Choose your 3 strategic actions for this month</p>
          </div>
        </div>

        {/* Project Status Overview */}
        {projects.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
              <i className="fas fa-project-diagram text-blue-600 mr-2"></i>
              Project Pipeline Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {['planning', 'writing', 'recording', 'recorded'].map(stage => {
                // Include legacy stages for backward compatibility
                const stageProjects = projects.filter(p => 
                  p.stage === stage || 
                  (stage === 'writing' && p.stage === 'production') ||
                  (stage === 'recording' && p.stage === 'marketing') ||
                  (stage === 'recorded' && p.stage === 'released')
                );
                const stageIcon = {
                  planning: 'fas fa-lightbulb',
                  writing: 'fas fa-pen',
                  recording: 'fas fa-microphone',
                  recorded: 'fas fa-check-circle'
                }[stage];
                
                const stageColor = {
                  planning: 'text-yellow-600',
                  writing: 'text-blue-600',
                  recording: 'text-purple-600',
                  recorded: 'text-green-600'
                }[stage];

                const stageDisplayName = {
                  planning: 'Planning',
                  writing: 'Writing',
                  recording: 'Recording',
                  recorded: 'Complete'
                }[stage];

                return (
                  <div key={stage} className="text-center">
                    <div className={`${stageColor} mb-1`}>
                      <i className={`${stageIcon} text-lg`}></i>
                    </div>
                    <div className="text-xs font-medium text-slate-700">{stageDisplayName}</div>
                    <div className="text-lg font-bold text-slate-900">{stageProjects.length}</div>
                    {stageProjects.length > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        {stageProjects.slice(0, 2).map(p => p.title).join(', ')}
                        {stageProjects.length > 2 && ` +${stageProjects.length - 2} more`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Progress indicators for active projects */}
            {projects.filter(p => p.stage !== 'recorded' && p.stage !== 'released').length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-xs font-medium text-slate-700 mb-2">Active Project Progress</div>
                {projects.filter(p => p.stage !== 'recorded' && p.stage !== 'released').slice(0, 3).map(project => {
                  // Map legacy stages to new stages for progress calculation
                  const currentStage = project.stage || 'planning';
                  const normalizedStage = currentStage === 'production' ? 'writing' : 
                                        currentStage === 'marketing' ? 'recording' : currentStage;
                  const stages = ['planning', 'writing', 'recording'];
                  const currentStageIndex = stages.indexOf(normalizedStage);
                  const progress = ((currentStageIndex + 1) / stages.length) * 100;
                  
                  return (
                    <div key={project.id} className="flex items-center space-x-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700">{project.title}</span>
                          <span className="text-slate-500">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Strategic Action Selection - Split Panel Design */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm mb-4 md:mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left Panel - Action Selection Pool */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-slate-600">Loading available actions...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">Failed to load actions</p>
                  <Button onClick={fetchMonthlyActions} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              ) : (
                <ActionSelectionPool
                  actions={monthlyActions}
                  getActionDetails={getActionDetails}
                  getActionRecommendation={getActionRecommendation}
                  selectedActions={selectedActions}
                  onSelectAction={selectAction}
                  onClearAll={clearActions}
                  onAutoRecommend={handleAutoRecommend}
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
