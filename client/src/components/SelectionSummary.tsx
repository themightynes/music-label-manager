import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useGameStore } from '@/store/gameStore';

interface ExecutiveAction {
  id: string;
  executiveId: string;
  executiveName: string;
  meetingId: string;
  meetingName: string;
  choiceId: string;
  icon: string;
  color: string;
}

interface SelectionSummaryProps {
  selectedActions: string[];
  actions: any[]; // Keep for now, will be removed later
  onRemoveAction: (actionId: string) => void;
  onReorderActions: (startIndex: number, endIndex: number) => void;
  onAdvanceMonth: () => void;
  isAdvancing: boolean;
}

export function SelectionSummary({
  selectedActions,
  actions,
  onRemoveAction,
  onReorderActions,
  onAdvanceMonth,
  isAdvancing
}: SelectionSummaryProps) {
  const { gameState } = useGameStore();
  const totalSlots = gameState?.focusSlots || 3;
  const usedSlots = gameState?.usedFocusSlots || 0;
  const availableSlots = totalSlots - usedSlots;
  
  console.log('SelectionSummary - selectedActions:', selectedActions);
  console.log('SelectionSummary - usedSlots:', usedSlots);
  
  // Parse executive actions from composite IDs
  const selectedActionObjects = selectedActions.map(id => {
    // Executive action format: executiveId_meetingId_choiceId
    const parts = id.split('_');
    
    // Map executive data - handle both old and new ID formats
    const executives: Record<string, { name: string; icon: string; color: string }> = {
      'ceo': { name: 'CEO', icon: 'fas fa-crown', color: '#FFD700' },
      'head': { name: 'Head of A&R', icon: 'fas fa-music', color: '#A75A5B' },
      'head_ar': { name: 'Head of A&R', icon: 'fas fa-music', color: '#A75A5B' },
      'cmo': { name: 'CMO', icon: 'fas fa-bullhorn', color: '#5AA75A' },
      'cco': { name: 'CCO', icon: 'fas fa-palette', color: '#5A75A7' },
      'head_distribution': { name: 'Head of Distribution', icon: 'fas fa-truck', color: '#A75A85' },
      'distribution': { name: 'Head of Distribution', icon: 'fas fa-truck', color: '#A75A85' }
    };
    
    // Map meeting names based on meeting IDs
    const meetingNames: Record<string, string> = {
      // CEO meetings
      'ceo_vision': 'Strategic Vision',
      'ceo_crisis': 'Crisis Management',
      'ceo_investor': 'Investor Relations',
      
      // Head of A&R meetings
      'ar_single_choice': 'Single Strategy',
      'ar_discovery': 'New Talent Discovery',
      'ar_genre_shift': 'Genre Strategy',
      
      // CMO meetings
      'cmo_campaign': 'Marketing Campaign',
      'cmo_pr_crisis': 'PR Crisis',
      'cmo_brand': 'Brand Partnership',
      
      // CCO meetings
      'cco_timeline': 'Production Timeline',
      'cco_creative': 'Creative Direction',
      'cco_budget': 'Budget Management',
      
      // Head of Distribution meetings
      'distribution_strategy': 'Release Strategy',
      'distribution_playlist': 'Playlist Pitch',
      'distribution_tour': 'Tour Planning'
    };
    
    // Get the executive based on the first part of the ID
    const executiveKey = parts[0] + (parts[0] === 'head' && parts[1] === 'ar' ? '_ar' : 
                                     parts[0] === 'head' && parts[1] === 'distribution' ? '_distribution' : '');
    const executive = executives[executiveKey] || executives[parts[0]] || executives['ceo'];
    
    // Build meeting ID from parts (e.g., ar_discovery from head_ar_ar_discovery_accept_terms)
    let meetingId = '';
    if (parts[0] === 'head' && parts[1] === 'ar') {
      meetingId = parts.slice(2, -1).join('_'); // Skip head_ar and choice at end
    } else {
      meetingId = parts.slice(1, -1).join('_'); // Skip executive and choice at end
    }
    
    const meetingName = meetingNames[meetingId] || meetingId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return {
      id,
      executiveId: parts[0],
      executiveName: executive.name,
      meetingId: meetingId,
      meetingName: meetingName,
      choiceId: parts[parts.length - 1],
      icon: executive.icon,
      color: executive.color
    } as ExecutiveAction;
  });

  const progress = (usedSlots / totalSlots) * 100;

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    
    if (startIndex !== endIndex) {
      onReorderActions(startIndex, endIndex);
    }
  };

  const getProgressColor = () => {
    if (usedSlots === 0) return 'bg-[#65557c]/30';
    if (usedSlots < totalSlots) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  const getStatusMessage = () => {
    if (usedSlots === 0) return 'Allocate focus slots to begin planning';
    if (usedSlots < totalSlots) return `${availableSlots} focus slot${availableSlots !== 1 ? 's' : ''} remaining`;
    return 'All focus slots allocated - Ready!';
  };

  return (
    <Card className="h-full">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Focus Slots</h3>
          <Badge variant="secondary" className="text-sm bg-[#A75A5B] text-white">
            {usedSlots}/{totalSlots} Used
          </Badge>
        </div>
        
        {/* Visual Focus Slots */}
        <div className="flex gap-2 mt-3 mb-2">
          {Array.from({ length: totalSlots }).map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-2 rounded-full transition-all ${
                index < usedSlots
                  ? 'bg-gradient-to-r from-[#A75A5B] to-[#8B4A6C]'
                  : 'bg-[#65557c]/30'
              }`}
              title={`Slot ${index + 1}`}
            />
          ))}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Slots Allocated</span>
            <span className="font-medium">{usedSlots} of {totalSlots}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-white/50">{getStatusMessage()}</p>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        {/* Selected Actions List */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="selected-actions">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-3 min-h-[200px] p-3 rounded-lg border-2 border-dashed transition-colors ${
                  snapshot.isDraggingOver ? 'border-[#A75A5B]/40 bg-[#A75A5B]/10' : 'border-[#4e324c]'
                }`}
              >
                {selectedActionObjects.length > 0 ? (
                  selectedActionObjects.map((action, index) => (
                    <Draggable key={action.id} draggableId={action.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-[#3c252d]/66 border border-[#65557c] rounded-lg p-3 shadow-sm transition-all ${
                            snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div
                                {...provided.dragHandleProps}
                                className="w-8 h-8 bg-gradient-to-br from-[#A75A5B] to-[#8B4A6C] text-white rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
                              >
                                <span className="text-sm font-bold">{index + 1}</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <i className={`${action.icon} text-sm`} style={{ color: action.color }}></i>
                                  <h4 className="font-medium text-sm text-white">{action.executiveName}</h4>
                                </div>
                                <p className="text-xs text-white/50">{action.meetingName}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveAction(action.id)}
                              className="text-white/50 hover:text-red-500 transition-colors p-1"
                            >
                              <i className="fas fa-times text-sm"></i>
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/50">
                    <i className="fas fa-users text-2xl mb-2 block"></i>
                    <p className="text-sm">Select executives to meet with</p>
                    <p className="text-xs">Each executive meeting uses one focus slot</p>
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Advance Month Button */}
        <div className="space-y-3">
          {usedSlots < totalSlots && (
            <div className="text-center p-3 bg-[#8B4A6C]/10 border border-[#8B4A6C]/30 rounded-lg">
              <i className="fas fa-info-circle text-[#D4A373] mr-2"></i>
              <span className="text-sm text-[#D4A373]">
                Allocate {availableSlots} more focus slot{availableSlots !== 1 ? 's' : ''} to continue
              </span>
            </div>
          )}
          
          <Button
            onClick={onAdvanceMonth}
            disabled={selectedActions.length === 0 || isAdvancing}
            className="w-full bg-gradient-to-r from-[#A75A5B] to-[#8B4A6C] text-white hover:from-[#A75A5B]/80 hover:to-[#7A3F5E] py-3 font-medium shadow-lg"
            size="lg"
          >
            {isAdvancing ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Processing Month...
              </>
            ) : (
              <>
                <i className="fas fa-rocket mr-2"></i>
                Advance to Next Month
              </>
            )}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}