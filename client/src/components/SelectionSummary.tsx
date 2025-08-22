import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

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
  
  const selectedActionObjects = selectedActions.map(id => 
    actions.find(action => action.id === id)
  ).filter(Boolean) as MonthlyAction[];

  const progress = (selectedActions.length / 3) * 100;

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    
    if (startIndex !== endIndex) {
      onReorderActions(startIndex, endIndex);
    }
  };

  const getProgressColor = () => {
    if (selectedActions.length === 0) return 'bg-slate-200';
    if (selectedActions.length < 3) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  const getStatusMessage = () => {
    if (selectedActions.length === 0) return 'Select actions to begin planning';
    if (selectedActions.length < 3) return `Select ${3 - selectedActions.length} more action${3 - selectedActions.length !== 1 ? 's' : ''}`;
    return 'Ready to advance month!';
  };

  return (
    <Card className="h-full">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Selected Actions</h3>
          <Badge variant="secondary" className="text-sm">
            {selectedActions.length}/3
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Progress</span>
            <span className="font-medium">{selectedActions.length}/3</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-slate-500">{getStatusMessage()}</p>
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
                  snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                }`}
              >
                {selectedActionObjects.length > 0 ? (
                  selectedActionObjects.map((action, index) => (
                    <Draggable key={action.id} draggableId={action.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white border rounded-lg p-3 shadow-sm transition-all ${
                            snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div
                                {...provided.dragHandleProps}
                                className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
                              >
                                <span className="text-sm font-bold">{index + 1}</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <i className={`${action.icon} text-blue-600 text-sm`}></i>
                                  <h4 className="font-medium text-sm text-slate-900">{action.name}</h4>
                                </div>
                                <p className="text-xs text-slate-500 capitalize">{action.type.replace('_', ' ')}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveAction(action.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                              <i className="fas fa-times text-sm"></i>
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <i className="fas fa-hand-point-left text-2xl mb-2 block"></i>
                    <p className="text-sm">Select actions from the left panel</p>
                    <p className="text-xs">Actions will be executed in order</p>
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Advance Month Button */}
        <div className="space-y-3">
          {selectedActions.length < 3 && (
            <div className="text-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <i className="fas fa-info-circle text-amber-600 mr-2"></i>
              <span className="text-sm text-amber-700">
                Select {3 - selectedActions.length} more action{3 - selectedActions.length !== 1 ? 's' : ''} to continue
              </span>
            </div>
          )}
          
          <Button
            onClick={onAdvanceMonth}
            disabled={selectedActions.length === 0 || isAdvancing}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 py-3 font-medium shadow-lg"
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
          <div className="text-xs text-slate-500 space-y-1">
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