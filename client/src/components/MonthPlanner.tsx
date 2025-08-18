import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/store/gameStore';
import { MONTHLY_ACTIONS } from '@/lib/gameData';
import { useState } from 'react';

interface MonthPlannerProps {
  onAdvanceMonth: () => Promise<void>;
  isAdvancing: boolean;
}

export function MonthPlanner({ onAdvanceMonth, isAdvancing }: MonthPlannerProps) {
  const { gameState, selectedActions, selectAction, removeAction, openDialogue, projects, artists } = useGameStore();
  const [showActionSelection, setShowActionSelection] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  if (!gameState) return null;

  // Enhanced action metadata with detailed context
  const getActionDetails = (actionId: string) => {
    const baseAction = MONTHLY_ACTIONS.find(a => a.id === actionId);
    if (!baseAction) return null;

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

  const availableActions = MONTHLY_ACTIONS.filter(action => !selectedActions.includes(action.id));

  const handleActionClick = async (actionId: string) => {
    const action = MONTHLY_ACTIONS.find(a => a.id === actionId);
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
    const action = actionId ? MONTHLY_ACTIONS.find(a => a.id === actionId) : null;

    if (action) {
      return (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
              {slotNumber}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">{action.name}</div>
              <div className="text-xs text-slate-600">{action.type.replace('_', ' ')}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeAction(actionId)}
            className="text-slate-400 hover:text-slate-600"
          >
            <i className="fas fa-times"></i>
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-3 border-2 border-dashed border-slate-300 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-slate-300 text-white rounded-full flex items-center justify-center text-xs font-medium">
            {slotNumber}
          </div>
          <div className="text-sm text-slate-500">Select an action...</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-indigo-700"
          disabled={availableActions.length === 0}
          onClick={() => setShowActionSelection(true)}
        >
          <i className="fas fa-plus"></i>
        </Button>
      </div>
    );
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center">
            <i className="fas fa-calendar-alt text-primary mr-2"></i>
            Month {gameState.currentMonth} Action Planner
          </h3>
          <Button
            onClick={onAdvanceMonth}
            disabled={selectedActions.length === 0 || isAdvancing}
            className="bg-primary text-white hover:bg-indigo-700"
          >
            {isAdvancing ? 'Processing...' : 'Advance Month'}
          </Button>
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

        {/* Selected Actions */}
        <div className="space-y-3 mb-4">
          {[1, 2, 3].map(slotNumber => (
            <div key={slotNumber}>
              {renderActionSlot(slotNumber)}
            </div>
          ))}
        </div>

        {/* Enhanced Available Actions */}
        {(availableActions.length > 0 && showActionSelection) && (
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">Available Actions</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActionSelection(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {availableActions.map(action => {
                const actionDetails = getActionDetails(action.id);
                const recommendation = getActionRecommendation(action.id);
                
                const getRecommendationBadge = (rec: string) => {
                  switch (rec) {
                    case 'urgent':
                      return <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>;
                    case 'recommended':
                      return <Badge className="bg-green-100 text-green-700 text-xs">Recommended</Badge>;
                    case 'limited':
                      return <Badge className="bg-yellow-100 text-yellow-700 text-xs">Limited Access</Badge>;
                    case 'situational':
                      return <Badge className="bg-blue-100 text-blue-700 text-xs">Situational</Badge>;
                    default:
                      return null;
                  }
                };

                return (
                  <div
                    key={action.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                      hoveredAction === action.id 
                        ? 'border-blue-300 bg-blue-50 shadow-md' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    } ${selectedActions.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onMouseEnter={() => setHoveredAction(action.id)}
                    onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => {
                      if (selectedActions.length < 3) {
                        handleActionClick(action.id);
                        setShowActionSelection(false);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <i className={`${action.icon} text-lg ${
                          recommendation === 'urgent' ? 'text-red-600' :
                          recommendation === 'recommended' ? 'text-green-600' :
                          recommendation === 'limited' ? 'text-yellow-600' :
                          'text-slate-600'
                        }`}></i>
                        <div>
                          <h5 className="font-medium text-slate-900">{action.name}</h5>
                          <p className="text-xs text-slate-600">{actionDetails?.description}</p>
                        </div>
                      </div>
                      {getRecommendationBadge(recommendation)}
                    </div>
                    
                    {hoveredAction === action.id && actionDetails && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="font-medium text-slate-700">Cost: </span>
                            <span className="text-slate-600">{actionDetails.cost}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Duration: </span>
                            <span className="text-slate-600">{actionDetails.duration}</span>
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-slate-700 text-xs">Expected Outcomes: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {actionDetails.outcomes?.map((outcome: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {outcome}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-slate-700 text-xs">Prerequisites: </span>
                          <span className="text-xs text-slate-600">{actionDetails.prerequisites}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
