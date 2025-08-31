import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useGameStore } from '@/store/gameStore';

interface MonthlyAction {
  id: string;
  name: string;
  type: string;
  icon: string;
  description?: string;
  category: string;
}

interface SelectionSummaryProps {
  selectedActions: string[];
  actions: MonthlyAction[];
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
  
  const selectedActionObjects = selectedActions.map(id => 
    actions.find(action => action.id === id)
  ).filter(Boolean) as MonthlyAction[];

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
                                  <i className={`${action.icon} text-[#A75A5B] text-sm`}></i>
                                  <h4 className="font-medium text-sm text-white">{action.name}</h4>
                                </div>
                                <p className="text-xs text-white/50 capitalize">{action.type.replace('_', ' ')}</p>
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
                    <i className="fas fa-hand-point-left text-2xl mb-2 block"></i>
                    <p className="text-sm">Choose focus actions from the pool</p>
                    <p className="text-xs">Each action uses one focus slot</p>
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

        {/* Action Summary */}
        {selectedActions.length > 0 && (
          <div className="text-xs text-white/50 space-y-1">
            <p className="font-medium">Execution Order:</p>
            {selectedActionObjects.map((action, index) => (
              <p key={action.id}>
                {index + 1}. {action.name}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}