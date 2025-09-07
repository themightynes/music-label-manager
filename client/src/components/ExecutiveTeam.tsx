import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';

interface Executive {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  salary: number;
  color: string;
}

interface Meeting {
  id: string;
  name: string;
  meeting_id: string;
  prompt: string;
  category: string;
}

const EXECUTIVES: Executive[] = [
  {
    id: 'ceo',
    name: 'CEO',
    title: 'Chief Executive Officer',
    description: 'Strategic leadership and business direction',
    icon: 'fas fa-crown',
    salary: 0,
    color: '#FFD700'
  },
  {
    id: 'head_ar',
    name: 'Head of A&R',
    title: 'Artists & Repertoire',
    description: 'Talent scouting and artist development',
    icon: 'fas fa-music',
    salary: 5000,
    color: '#A75A5B'
  },
  {
    id: 'cmo',
    name: 'CMO',
    title: 'Chief Marketing Officer',
    description: 'Marketing, PR, and brand management',
    icon: 'fas fa-bullhorn',
    salary: 4000,
    color: '#5AA75A'
  },
  {
    id: 'cco',
    name: 'CCO', 
    title: 'Chief Creative Officer',
    description: 'Production quality and creative direction',
    icon: 'fas fa-palette',
    salary: 4500,
    color: '#5A75A7'
  },
  {
    id: 'head_distribution',
    name: 'Head of Distribution',
    title: 'Distribution & Operations',
    description: 'Streaming, touring, and logistics',
    icon: 'fas fa-truck',
    salary: 3500,
    color: '#A75A85'
  }
];

interface ExecutiveTeamProps {
  selectedActions: string[];
  maxSlots: number;
}

export function ExecutiveTeam({ selectedActions, maxSlots }: ExecutiveTeamProps) {
  const { openDialogue, gameState } = useGameStore();
  const [hoveredExec, setHoveredExec] = useState<string | null>(null);
  const [selectedExecutive, setSelectedExecutive] = useState<Executive | null>(null);
  const [availableMeetings, setAvailableMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  
  const slotsUsed = selectedActions.length;
  const slotsAvailable = maxSlots - slotsUsed;
  
  const handleExecutiveClick = async (executive: Executive) => {
    if (slotsUsed >= maxSlots) {
      return; // No more slots available
    }
    
    // Fetch available meetings for this executive
    setLoadingMeetings(true);
    setSelectedExecutive(executive); // Set executive first to show modal
    
    try {
      const response = await apiRequest('GET', `/api/roles/${executive.id}`);
      
      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to load role');
      }
      
      const data = await response.json();
      console.log('Full API response for', executive.id, ':', data);
      console.log('Meetings array:', data.meetings);
      setAvailableMeetings(data.meetings || []);
    } catch (error) {
      console.error('Failed to load meetings for', executive.id, ':', error);
      setAvailableMeetings([]); // Set empty array on error
      // Could also show an error message here
    } finally {
      setLoadingMeetings(false);
    }
  };
  
  const handleMeetingSelect = async (meeting: Meeting) => {
    if (!selectedExecutive) return;
    
    // Close the meeting selection modal
    setSelectedExecutive(null);
    setAvailableMeetings([]);
    
    // Open dialogue modal for this specific meeting
    await openDialogue(selectedExecutive.id, meeting.id);
  };
  
  const isDisabled = (executive: Executive) => {
    // Check if all slots are used
    if (slotsUsed >= maxSlots) return true;
    
    // Check if this executive was already selected this turn
    const alreadySelected = selectedActions.some(actionId => 
      actionId.includes(executive.id)
    );
    if (alreadySelected) return true;
    
    // Check if player has enough money for salary
    if (gameState && gameState.money !== null && gameState.money < executive.salary) return true;
    
    return false;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Executive Team</h3>
        <Badge variant="outline" className="text-white/70">
          {slotsAvailable} Focus {slotsAvailable === 1 ? 'Slot' : 'Slots'} Available
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXECUTIVES.map((executive) => {
          const disabled = isDisabled(executive);
          
          return (
            <div
              key={executive.id}
              className={`
                relative p-6 rounded-lg border transition-all cursor-pointer
                ${disabled 
                  ? 'bg-[#3c252d]/20 border-[#65557c]/30 opacity-30 cursor-not-allowed' 
                  : 'bg-[#3c252d]/[0.66] border-[#65557c] hover:border-[#A75A5B] hover:bg-[#3c252d]/[0.8]'
                }
              `}
              onClick={() => !disabled && handleExecutiveClick(executive)}
              onMouseEnter={() => setHoveredExec(executive.id)}
              onMouseLeave={() => setHoveredExec(null)}
            >
              <div className="flex items-start space-x-4">
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: executive.color + '20', borderColor: executive.color, borderWidth: '2px', borderStyle: 'solid' }}
                >
                  <i className={`${executive.icon} text-2xl`} style={{ color: executive.color }}></i>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-lg">{executive.name}</h4>
                  <p className="text-white/90 text-sm font-medium">{executive.title}</p>
                  <p className="text-white/60 text-xs mt-1">{executive.description}</p>
                  
                  <div className="flex items-center gap-3 mt-3">
                    {executive.salary > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <i className="fas fa-dollar-sign mr-1"></i>
                        {executive.salary.toLocaleString()} salary
                      </Badge>
                    )}
                    {executive.salary === 0 && (
                      <Badge variant="outline" className="text-xs text-[#FFD700]">
                        <i className="fas fa-star mr-1"></i>
                        No salary cost
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Hover state showing action hint */}
              {hoveredExec === executive.id && !disabled && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#A75A5B]/20 to-transparent rounded-lg pointer-events-none flex items-end justify-center pb-4">
                  <span className="text-white/90 text-sm font-medium">
                    <i className="fas fa-mouse-pointer mr-2"></i>
                    Click to open meeting
                  </span>
                </div>
              )}
              
              {/* Disabled state overlay with stronger fade */}
              {disabled && (
                <div className="absolute inset-0 bg-black/75 flex items-center justify-center rounded-lg">
                  <div className="bg-black/80 px-3 py-1 rounded-full border border-gray-700/50">
                    <span className="text-white/60 text-xs font-medium">
                      {slotsUsed >= maxSlots ? 'No slots available' : 
                       selectedActions.some(a => a.includes(executive.id)) ? 'Already selected' :
                       'Insufficient funds'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Info box */}
      <div className="bg-[#3c252d]/40 rounded-lg p-4 border border-[#65557c]/50">
        <div className="flex items-start space-x-2">
          <i className="fas fa-info-circle text-[#A75A5B] mt-0.5"></i>
          <div className="text-sm text-white/70">
            <p>Select an executive to open a strategic meeting. Each meeting uses one focus slot.</p>
            <p className="mt-1">Executives provide unique strategic options based on their expertise.</p>
          </div>
        </div>
      </div>
      
      {/* Meeting Selection Modal */}
      <Dialog open={!!selectedExecutive} onOpenChange={() => setSelectedExecutive(null)}>
        <DialogContent className="bg-[#2c2c2c] border-[#65557c] text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {selectedExecutive && (
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: selectedExecutive.color + '20', borderColor: selectedExecutive.color, borderWidth: '2px', borderStyle: 'solid' }}
                  >
                    <i className={`${selectedExecutive.icon} text-lg`} style={{ color: selectedExecutive.color }}></i>
                  </div>
                  <div>
                    <p>{selectedExecutive.name} - Strategic Meetings</p>
                    <p className="text-sm text-white/70 font-normal">{selectedExecutive.title}</p>
                  </div>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {loadingMeetings ? (
              <div className="text-center py-4">
                <i className="fas fa-spinner fa-spin text-2xl text-[#A75A5B]"></i>
                <p className="text-white/70 mt-2">Loading meetings...</p>
              </div>
            ) : availableMeetings.length > 0 ? (
              availableMeetings.map((meeting) => (
                <Button
                  key={meeting.id}
                  variant="outline"
                  className="w-full text-left p-4 hover:bg-[#A75A5B]/10 hover:border-[#A75A5B] h-auto block"
                  onClick={() => handleMeetingSelect(meeting)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <i className={`${meeting.category === 'business' ? 'fas fa-briefcase' : 
                                  meeting.category === 'talent' ? 'fas fa-star' :
                                  meeting.category === 'production' ? 'fas fa-microphone' :
                                  meeting.category === 'marketing' ? 'fas fa-bullhorn' :
                                  meeting.category === 'distribution' ? 'fas fa-truck' :
                                  'fas fa-comments'} text-[#A75A5B] mt-1 flex-shrink-0`}></i>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-white text-left break-words">{meeting.name}</p>
                      <p className="text-sm text-white/70 mt-1 text-left break-words whitespace-normal">{meeting.prompt || meeting.description}</p>
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-white/70">No meetings available for this executive.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}