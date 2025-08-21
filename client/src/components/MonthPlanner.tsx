import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/store/gameStore';
import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

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
  const { gameState, selectedActions, selectAction, removeAction, openDialogue, projects, artists } = useGameStore();
  const [showActionSelection, setShowActionSelection] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  
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
    const activeProjects = projects.filter(p => p.stage !== 'released').length;
    const releasedProjects = projects.filter(p => p.stage === 'released').length;
    const artistCount = artists.length;
    const currentMoney = gameState.money || 0;
    const currentRep = gameState.reputation || 0;

    switch (actionId) {
      case 'meet_manager':
        return currentMoney < 20000 ? 'urgent' : activeProjects > 2 ? 'recommended' : 'good';
      case 'meet_ar':
        return artistCount === 0 ? 'urgent' : artistCount < 3 ? 'recommended' : 'good';
      case 'meet_producer':
        return activeProjects > 0 ? 'recommended' : 'situational';
      case 'meet_pr':
        return releasedProjects > 0 && currentRep < 50 ? 'recommended' : 'situational';
      case 'meet_digital':
        return releasedProjects > 0 ? 'recommended' : 'situational';
      case 'meet_streaming':
        return gameState.playlistAccess !== 'None' && releasedProjects > 0 ? 'recommended' : 'limited';
      case 'meet_booking':
        return gameState.venueAccess !== 'None' && artistCount > 0 ? 'recommended' : 'limited';
      case 'meet_operations':
        return currentMoney < 30000 || activeProjects > 1 ? 'recommended' : 'good';
      default:
        return 'good';
    }
  };

  const availableActions = monthlyActions.filter(action => !selectedActions.includes(action.id));

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

  const renderActionSlot = (slotNumber: number) => {
    const actionId = selectedActions[slotNumber - 1];
    const action = actionId ? monthlyActions.find(a => a.id === actionId) : null;

    if (action) {
      return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-lg">
                {slotNumber}
              </div>
              <div>
                <div className="text-base font-semibold text-slate-900">{action.name}</div>
                <div className="text-sm text-slate-600 capitalize">{action.type.replace('_', ' ')}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeAction(actionId)}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <i className="fas fa-times text-lg"></i>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="border-3 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-slate-300 text-white rounded-xl flex items-center justify-center text-lg font-bold">
              {slotNumber}
            </div>
            <div className="text-base text-slate-500">Choose Action #{slotNumber}</div>
          </div>
        </div>
        
        {/* Quick Action Grid for this slot */}
        {availableActions.length > 0 && (
          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
            {availableActions.slice(0, 3).map(action => {
              const recommendation = getActionRecommendation(action.id);
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    if (selectedActions.length < 3) {
                      handleActionClick(action.id);
                    }
                  }}
                  className="text-left p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-xs group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <i className={`${action.icon} text-sm ${
                        recommendation === 'urgent' ? 'text-red-600' :
                        recommendation === 'recommended' ? 'text-green-600' :
                        recommendation === 'limited' ? 'text-yellow-600' :
                        'text-slate-600'
                      }`}></i>
                      <span className="font-medium text-slate-700 group-hover:text-blue-700">{action.name}</span>
                    </div>
                    {recommendation === 'urgent' && <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-xs">Urgent</span>}
                    {recommendation === 'recommended' && <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-xs">Rec</span>}
                  </div>
                </button>
              );
            })}
            {availableActions.length > 3 && (
              <button
                onClick={() => setShowActionSelection(true)}
                className="text-center p-2 text-blue-600 hover:text-blue-700 text-xs font-medium"
              >
                +{availableActions.length - 3} more actions...
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-lg border-2 border-blue-200/50">
      <CardContent className="p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-4">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-calendar-alt text-white text-xl md:text-2xl"></i>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Month {gameState.currentMonth} Strategy</h2>
              <p className="text-sm md:text-base text-slate-600 hidden sm:block">Choose your 3 strategic actions for this month</p>
              <p className="text-sm text-slate-600 sm:hidden">Choose 3 actions</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 md:space-x-4 w-full sm:w-auto">
            <div className="text-center sm:text-right">
              <div className="text-xs md:text-sm text-slate-500">Actions Selected</div>
              <div className="text-xl md:text-2xl font-bold text-blue-600">{selectedActions.length}/3</div>
            </div>
            <Button
              onClick={onAdvanceMonth}
              disabled={selectedActions.length === 0 || isAdvancing}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-4 md:px-8 py-2 md:py-3 text-sm md:text-lg font-medium shadow-lg flex-1 sm:flex-initial"
            >
              {isAdvancing ? (
                <><i className="fas fa-spinner fa-spin mr-1 md:mr-2"></i>Processing...</>
              ) : (
                <><i className="fas fa-rocket mr-1 md:mr-2"></i>Advance Month</>
              )}
            </Button>
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
              {['planning', 'production', 'marketing', 'released'].map(stage => {
                const stageProjects = projects.filter(p => p.stage === stage);
                const stageIcon = {
                  planning: 'fas fa-lightbulb',
                  production: 'fas fa-cogs',
                  marketing: 'fas fa-bullhorn',
                  released: 'fas fa-check-circle'
                }[stage];
                
                const stageColor = {
                  planning: 'text-yellow-600',
                  production: 'text-blue-600',
                  marketing: 'text-purple-600',
                  released: 'text-green-600'
                }[stage];

                return (
                  <div key={stage} className="text-center">
                    <div className={`${stageColor} mb-1`}>
                      <i className={`${stageIcon} text-lg`}></i>
                    </div>
                    <div className="text-xs font-medium text-slate-700 capitalize">{stage}</div>
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
            {projects.filter(p => p.stage !== 'released').length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="text-xs font-medium text-slate-700 mb-2">Active Project Progress</div>
                {projects.filter(p => p.stage !== 'released').slice(0, 3).map(project => {
                  const stages = ['planning', 'production', 'marketing', 'released'];
                  const currentStageIndex = stages.indexOf(project.stage || 'planning');
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

        {/* Action Slots - Hero Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/50 shadow-sm mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-3 md:mb-4 flex items-center">
            <i className="fas fa-chess text-blue-600 mr-2"></i>
            <span className="hidden sm:inline">Strategic Action Selection</span>
            <span className="sm:hidden">Action Selection</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3].map(slotNumber => (
              <div key={slotNumber} className="col-span-1">
                {renderActionSlot(slotNumber)}
              </div>
            ))}
          </div>
        </div>

        {/* All Available Actions - Expanded View */}
        {showActionSelection && (
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-slate-900 flex items-center">
                <i className="fas fa-list text-blue-600 mr-2"></i>
                All Available Actions
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActionSelection(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-slate-600">Loading available actions...</p>
                </div>
              ) : error ? (
                <div className="col-span-full text-center py-8">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">Failed to load actions</p>
                  <Button onClick={fetchMonthlyActions} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              ) : availableActions.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <i className="fas fa-check-circle text-green-400 text-4xl mb-4"></i>
                  <p className="text-slate-600">All actions selected</p>
                </div>
              ) : (
                availableActions.map(action => {
                const actionDetails = getActionDetails(action.id);
                const recommendation = getActionRecommendation(action.id);
                
                return (
                  <div
                    key={action.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      recommendation === 'urgent' ? 'border-red-200 bg-red-50' :
                      recommendation === 'recommended' ? 'border-green-200 bg-green-50' :
                      recommendation === 'limited' ? 'border-yellow-200 bg-yellow-50' :
                      'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    } ${selectedActions.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (selectedActions.length < 3) {
                        handleActionClick(action.id);
                        setShowActionSelection(false);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <i className={`${action.icon} text-lg ${
                        recommendation === 'urgent' ? 'text-red-600' :
                        recommendation === 'recommended' ? 'text-green-600' :
                        recommendation === 'limited' ? 'text-yellow-600' :
                        'text-slate-600'
                      }`}></i>
                      <div className="flex-1">
                        <h5 className="font-medium text-slate-900 text-sm">{action.name}</h5>
                        <p className="text-xs text-slate-600">{actionDetails?.cost}</p>
                      </div>
                    </div>
                    
                    {recommendation !== 'good' && (
                      <div className="mt-2">
                        <Badge className={`text-xs ${
                          recommendation === 'urgent' ? 'bg-red-100 text-red-700' :
                          recommendation === 'recommended' ? 'bg-green-100 text-green-700' :
                          recommendation === 'limited' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {recommendation === 'urgent' ? 'Urgent' :
                           recommendation === 'recommended' ? 'Recommended' :
                           recommendation === 'limited' ? 'Limited Access' : 'Situational'}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              }))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
