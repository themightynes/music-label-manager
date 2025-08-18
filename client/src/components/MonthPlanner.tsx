import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';
import { MONTHLY_ACTIONS } from '@/lib/gameData';
import { useState } from 'react';

interface MonthPlannerProps {
  onAdvanceMonth: () => Promise<void>;
  isAdvancing: boolean;
}

export function MonthPlanner({ onAdvanceMonth, isAdvancing }: MonthPlannerProps) {
  const { gameState, selectedActions, selectAction, removeAction, openDialogue } = useGameStore();
  const [showActionSelection, setShowActionSelection] = useState(false);

  if (!gameState) return null;

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

        {/* Selected Actions */}
        <div className="space-y-3 mb-4">
          {[1, 2, 3].map(slotNumber => (
            <div key={slotNumber}>
              {renderActionSlot(slotNumber)}
            </div>
          ))}
        </div>

        {/* Available Actions */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableActions.map(action => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="text-left p-3 justify-start hover:bg-slate-50"
                  onClick={() => {
                    handleActionClick(action.id);
                    setShowActionSelection(false);
                  }}
                  disabled={selectedActions.length >= 3}
                >
                  <div className="flex items-center space-x-2">
                    <i className={`${action.icon} text-slate-600`}></i>
                    <span className="text-sm font-medium">{action.name}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
