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
  const [showDialogue, setShowDialogue] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState<{ roleId: string; meetingId: string } | null>(null);
  
  const { selectDialogueChoice } = useGameStore();

  const handleActionToggle = (actionId: string) => {
    // Check if this is a role meeting action
    const role = industryRoles.find(r => r.id === actionId);
    if (role) {
      // Open dialogue modal for role meeting
      setCurrentDialogue({ roleId: actionId, meetingId: 'monthly_check_in' });
      setShowDialogue(true);
      return;
    }
    
    // Handle regular action selection for non-role actions
    setSelectedActions(prev => {
      if (prev.includes(actionId)) {
        return prev.filter(id => id !== actionId);
      } else if (prev.length < 3) {
        return [...prev, actionId];
      }
      return prev;
    });
  };

  const handleAdvanceMonth = () => {
    onAdvanceMonth(selectedActions);
    setSelectedActions([]);
  };

  const handleDialogueChoice = async (choiceId: string, effects: any) => {
    try {
      await selectDialogueChoice(choiceId, effects);
      
      // Add the role meeting to selected actions after dialogue completes
      if (currentDialogue) {
        setSelectedActions(prev => {
          if (!prev.includes(currentDialogue.roleId) && prev.length < 3) {
            return [...prev, currentDialogue.roleId];
          }
          return prev;
        });
      }
      
      setShowDialogue(false);
      setCurrentDialogue(null);
    } catch (error) {
      console.error('Failed to handle dialogue choice:', error);
    }
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
                    isSelected={selectedActions.includes(role.id)}
                    onToggle={handleActionToggle}
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
                    onToggle={handleActionToggle}
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
        {showDialogue && currentDialogue && (
          <DialogueModal
            roleId={currentDialogue.roleId}
            meetingId={currentDialogue.meetingId}
            gameId={gameState.id}
            onClose={() => {
              setShowDialogue(false);
              setCurrentDialogue(null);
            }}
            onChoiceSelect={handleDialogueChoice}
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
}

function ActionCard({ id, name, description, isSelected, onToggle }: ActionCardProps) {
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
          {isSelected ? 'Selected' : 'Available'}
        </Badge>
      </div>
    </div>
  );
}