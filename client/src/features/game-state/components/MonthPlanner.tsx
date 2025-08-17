import React, { useState } from 'react';
import { GameState } from '@shared/types/gameTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DialogueModal } from '@/components/DialogueModal';
import { useGameStore } from '@/store/gameStore';

interface MonthPlannerProps {
  gameState: GameState & { artists?: any[]; projects?: any[] };
  onAdvanceMonth: (selectedActions: string[]) => void;
  onBackToDashboard: () => void;
  isAdvancing: boolean;
}

export function MonthPlanner({ 
  gameState, 
  onAdvanceMonth, 
  onBackToDashboard, 
  isAdvancing 
}: MonthPlannerProps) {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [dialogueState, setDialogueState] = useState<{
    isOpen: boolean;
    roleId: string | null;
    meetingId: string | null;
  }>({ isOpen: false, roleId: null, meetingId: null });

  const handleActionToggle = (actionId: string, actionType: 'role' | 'project' = 'project') => {
    if (actionType === 'role') {
      // Open dialogue for role meetings instead of just selecting
      const roleId = actionId;
      // Map role IDs to their default meeting IDs based on roles.json structure
      const meetingMap: Record<string, string> = {
        'manager': 'mgr_priorities',
        'anr': 'anr_single_choice',
        'producer': 'producer_expertise',
        'pr': 'pr_angle',
        'digital': 'digital_viral_moment',
        'streaming': 'streaming_playlist_politics',
        'booking': 'booking_venue_politics',
        'ops': 'release_ops'
      };
      
      const meetingId = meetingMap[roleId] || `${roleId}_priorities`;
      setDialogueState({
        isOpen: true,
        roleId,
        meetingId
      });
    } else {
      // Handle project actions normally
      setSelectedActions(prev => {
        if (prev.includes(actionId)) {
          return prev.filter(id => id !== actionId);
        } else if (prev.length < 3) {
          return [...prev, actionId];
        }
        return prev;
      });
    }
  };

  const handleAdvanceMonth = () => {
    onAdvanceMonth(selectedActions);
    setSelectedActions([]);
  };

  const handleDialogueClose = () => {
    setDialogueState({ isOpen: false, roleId: null, meetingId: null });
  };

  const handleChoiceSelect = async (choiceId: string, effects: any) => {
    // Add the role meeting action to selected actions
    const roleActionId = `${dialogueState.roleId}_meeting`;
    setSelectedActions(prev => {
      if (!prev.includes(roleActionId) && prev.length < 3) {
        return [...prev, roleActionId];
      }
      return prev;
    });
    
    // Close dialogue
    setDialogueState({ isOpen: false, roleId: null, meetingId: null });
    
    // Here you could also show immediate effects as toast notifications
    console.log('Dialogue choice selected:', { choiceId, effects });
  };

  const industryRoles = [
    { id: 'manager', name: 'Manager', relationship: 75 },
    { id: 'anr', name: 'A&R Rep', relationship: 65 },
    { id: 'producer', name: 'Producer', relationship: 55 },
    { id: 'pr', name: 'PR Specialist', relationship: 60 },
    { id: 'digital', name: 'Digital Marketing', relationship: 50 },
    { id: 'streaming', name: 'Streaming Curator', relationship: 45 },
    { id: 'booking', name: 'Booking Agent', relationship: 40 },
    { id: 'ops', name: 'Operations Manager', relationship: 55 }
  ];

  const projectTypes = [
    { id: 'record-single', name: 'Record Single', cost: '$3k-12k' },
    { id: 'plan-ep', name: 'Plan EP', cost: '$15k-35k' },
    { id: 'plan-tour', name: 'Plan Mini-Tour', cost: '$5k-15k' }
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-yellow-500">
              📅 Month Planner - Select up to 3 Focus Actions
            </h1>
            <Button variant="outline" onClick={onBackToDashboard}>
              ← Back to Dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Industry Meetings</h2>
              <div className="grid grid-cols-1 gap-3">
                {industryRoles.map(role => (
                  <ActionCard
                    key={role.id}
                    id={role.id}
                    name={role.name}
                    description={`Relationship: ${role.relationship}%`}
                    isSelected={selectedActions.includes(`${role.id}_meeting`)}
                    onToggle={(id) => handleActionToggle(id, 'role')}
                    actionType="role"
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Projects</h2>
              <div className="grid grid-cols-1 gap-3 mb-8">
                {projectTypes.map(project => (
                  <ActionCard
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    description={project.cost}
                    isSelected={selectedActions.includes(project.id)}
                    onToggle={(id) => handleActionToggle(id, 'project')}
                    actionType="project"
                  />
                ))}
              </div>

              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  Selected: {selectedActions.length}/3 actions
                </p>
                <Button
                  onClick={handleAdvanceMonth}
                  disabled={selectedActions.length === 0 || isAdvancing}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-12 py-4 text-xl"
                >
                  🚀 ADVANCE MONTH
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Dialogue Modal */}
        {dialogueState.isOpen && dialogueState.roleId && dialogueState.meetingId && (
          <DialogueModal
            roleId={dialogueState.roleId}
            meetingId={dialogueState.meetingId}
            gameId={gameState.id}
            onClose={handleDialogueClose}
            onChoiceSelect={handleChoiceSelect}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

interface ActionCardProps {
  id: string;
  name: string;
  description: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
  actionType?: 'role' | 'project';
}

function ActionCard({ id, name, description, isSelected, onToggle, actionType = 'project' }: ActionCardProps) {
  return (
    <div
      onClick={() => onToggle(id)}
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-yellow-500 bg-yellow-500/10'
          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
      }`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <Badge variant={isSelected ? 'default' : 'secondary'}>
          {actionType === 'role' ? (isSelected ? 'Meeting Planned' : 'Meet') : (isSelected ? 'Selected' : 'Available')}
        </Badge>
      </div>
    </div>
  );
}