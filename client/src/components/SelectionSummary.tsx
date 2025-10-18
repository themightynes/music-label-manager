import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useGameStore } from '@/store/gameStore';
import { TrendingUp, TrendingDown, Clock, Zap, BarChart3, X } from 'lucide-react';
import logger from '@/lib/logger';

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
  onRemoveAction: (actionId: string) => void;
  onReorderActions: (startIndex: number, endIndex: number) => void;
  onAdvanceWeek: () => void;
  isAdvancing: boolean;
  impactPreview?: {
    immediate: Record<string, number>;
    delayed: Record<string, number>;
    selectedChoices: Array<{
      executiveName: string;
      meetingName: string;
      choiceLabel: string;
      effects_immediate: Record<string, number>;
      effects_delayed: Record<string, number>;
    }>;
  };
}

// Helper function to parse selected actions (both JSON and legacy formats)
function parseSelectedAction(id: string):
  | { format: 'json'; roleId: string; actionId: string; choiceId: string; executiveId?: string }
  | { format: 'legacy'; parts: string[] } {
  try {
    const parsed = JSON.parse(id);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.roleId === 'string' &&
      typeof parsed.actionId === 'string' &&
      typeof parsed.choiceId === 'string'
    ) {
      return {
        format: 'json',
        roleId: parsed.roleId,
        actionId: parsed.actionId,
        choiceId: parsed.choiceId,
        executiveId: typeof parsed.executiveId === 'string' ? parsed.executiveId : undefined
      };
    }
  } catch {
    // Not valid JSON, fall through to legacy format
  }

  return {
    format: 'legacy',
    parts: id.split('_')
  };
}

export function SelectionSummary({
  selectedActions,
  onRemoveAction,
  onReorderActions,
  onAdvanceWeek,
  isAdvancing,
  impactPreview
}: SelectionSummaryProps) {
  const { gameState, cancelAROfficeOperation } = useGameStore();
  const totalSlots = gameState?.focusSlots || 3;
  const usedSlots = gameState?.usedFocusSlots || 0;
  const availableSlots = totalSlots - usedSlots;

  logger.debug('SelectionSummary - selectedActions:', selectedActions);
  logger.debug('SelectionSummary - usedSlots:', usedSlots);

  const arOfficeActive = !!gameState?.arOfficeSlotUsed;
  const arOfficeSourcingType = (gameState?.arOfficeSourcingType as string | null) || null;

  // Unit tests via console.assert for both formats (dev only)
  if (logger.isDev()) {
    console.assert(
      parseSelectedAction('{"roleId":"ceo","actionId":"mgr_priorities","choiceId":"studio_first"}').format === 'json',
      'JSON format should be detected correctly'
    );
    console.assert(
      parseSelectedAction('ceo_mgr_priorities_studio_first').format === 'legacy',
      'Legacy format should be detected correctly'
    );
    console.assert(
      (() => {
        const parsed = parseSelectedAction('{"roleId":"head_ar","actionId":"ar_single_choice","choiceId":"accept_terms"}');
        return parsed.format === 'json' && parsed.roleId === 'head_ar';
      })(),
      'JSON format should parse roleId correctly'
    );
  }
  
  // Parse executive actions from composite IDs
  const selectedActionObjects = selectedActions.map(id => {
    const parsed = parseSelectedAction(id);

    // Map executive data for both formats
    const executives: Record<string, { name: string; icon: string; color: string }> = {
      'ceo': { name: 'CEO', icon: 'fas fa-crown', color: 'yellow-400' },
      'head': { name: 'Head of A&R', icon: 'fas fa-music', color: '#A75A5B' },
      'head_ar': { name: 'Head of A&R', icon: 'fas fa-music', color: '#A75A5B' },
      'cmo': { name: 'CMO', icon: 'fas fa-bullhorn', color: 'green-500' },
      'cco': { name: 'CCO', icon: 'fas fa-palette', color: 'blue-500' },
      'head_distribution': { name: 'Head of Distribution', icon: 'fas fa-truck', color: '#A75A5B' },
      'distribution': { name: 'Head of Distribution', icon: 'fas fa-truck', color: '#A75A5B' }
    };

    if (parsed.format === 'json') {
      // Handle new JSON format: { roleId, actionId, choiceId }
      const { roleId, actionId, choiceId, executiveId } = parsed;
      const executive = executives[roleId] || executives['ceo'];

      // Convert actionId to readable meeting name
      const meetingName = actionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      return {
        id,
        executiveId: executiveId || roleId,
        executiveName: executive.name,
        meetingId: actionId,
        meetingName: meetingName,
        choiceId: choiceId,
        icon: executive.icon,
        color: executive.color
      } as ExecutiveAction;
    } else {
      // Handle legacy underscore format for backward compatibility
      const parts = parsed.parts;

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
    }
  });

  const filledSlotsCount = selectedActionObjects.length + (arOfficeActive ? 1 : 0);
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
    if (usedSlots === 0) return 'bg-brand-purple-light/30';
    if (usedSlots < totalSlots) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  const getStatusMessage = () => {
    if (usedSlots === 0) return 'Allocate focus slots to begin planning';
    if (usedSlots < totalSlots) return `${availableSlots} focus slot${availableSlots !== 1 ? 's' : ''} remaining`;
    return 'All focus slots allocated - Ready!';
  };

  return (
    <Card className="h-full bg-brand-dark-card/50 backdrop-blur-sm border-white/10">
      {/* Horizontal Focus Slots at Top */}
      <CardHeader className="p-4 border-b border-white/10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Focus Slots</h3>
            <Badge variant="secondary" className="text-sm bg-brand-burgundy text-white">
              {usedSlots}/{totalSlots} Used
            </Badge>
          </div>

          {/* Horizontal Focus Slot Boxes with Meeting Info - Draggable */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="horizontal-focus-slots" direction="horizontal">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`flex gap-3 p-3 rounded-lg border-2 border-dashed transition-colors ${
                    snapshot.isDraggingOver ? 'border-brand-burgundy/40 bg-brand-burgundy/10' : 'border-brand-purple'
                  }`}
                >
                  {selectedActionObjects.map((action, index) => (
                    <Draggable key={action.id} draggableId={action.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex-1 bg-brand-dark-card/66 border border-brand-purple-light rounded-lg p-3 shadow-sm transition-all ${
                            snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              {...provided.dragHandleProps}
                              className="w-8 h-8 bg-gradient-to-br from-brand-burgundy to-brand-burgundy text-white rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
                            >
                              <span className="text-sm font-bold">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <i className={`${action.icon} text-sm`} style={{ color: action.color }}></i>
                                <h4 className="font-medium text-sm text-white truncate">{action.executiveName}</h4>
                              </div>
                              <p className="text-xs text-white/50 truncate">{action.meetingName}</p>
                            </div>
                            <button
                              onClick={() => onRemoveAction(action.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {arOfficeActive && (
                    <div
                      className="flex-1 bg-brand-dark-card/66 border border-brand-purple-light rounded-lg p-3 shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-brand-purple-light to-brand-burgundy text-white rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold">{selectedActionObjects.length + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <i className="fas fa-search text-sm text-brand-gold" />
                            <h4 className="font-medium text-sm text-white truncate">A&amp;R Scouting</h4>
                          </div>
                          <p className="text-xs text-white/50 truncate">
                            {arOfficeSourcingType ? arOfficeSourcingType.replace(/_/g, ' ') : 'Operation active'}
                          </p>
                        </div>
                        <button
                          onClick={() => cancelAROfficeOperation()}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, totalSlots - filledSlotsCount) }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="flex-1 bg-brand-dark-card/66 border border-brand-purple-light rounded-lg p-3 shadow-sm opacity-50"
                    >
                      <div className="flex items-center justify-center h-8">
                        <span className="text-xs text-white/40">Slot {filledSlotsCount + index + 1}</span>
                      </div>
                    </div>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4 mt-4">
        {/* Impact Preview - Horizontal Layout like Dashboard */}
        <div className="bg-brand-dark-card/[0.66] rounded-lg p-4 border border-brand-purple-light">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center">
            <BarChart3 className="h-3.5 w-3.5 mr-2 text-brand-gold" />
            Impact Preview
          </h3>

          {selectedActions.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {/* This Week */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-orange-300" />
                  <span className="text-xs font-medium text-white/70">This Week</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(impactPreview?.immediate || {}).map(([effect, value]) => (
                    <Badge key={effect} variant="outline" className={`text-xs ${value > 0 ? 'text-green-400 border-green-400/30' : 'text-red-400 border-red-400/30'}`}>
                      {value > 0 ? '+' : ''}{value} {effect.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {Object.keys(impactPreview?.immediate || {}).length === 0 && (
                    <span className="text-xs text-white/40">No immediate effects</span>
                  )}
                </div>
              </div>

              {/* Delayed Effects */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-blue-300" />
                  <span className="text-xs font-medium text-white/70">Delayed Effects</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(impactPreview?.delayed || {}).map(([effect, value]) => (
                    <Badge key={effect} variant="outline" className="text-xs border-blue-400/30 bg-blue-400/10 text-blue-300">
                      {value > 0 ? '+' : ''}{value} {effect.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {Object.keys(impactPreview?.delayed || {}).length === 0 && (
                    <span className="text-xs text-white/40">No delayed effects</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-white/40">
              <p className="text-xs">No executive meeting choices made</p>
            </div>
          )}
        </div>

        {/* Advance Week Button */}
        <div className="space-y-3">
          <Button
            onClick={onAdvanceWeek}
            disabled={(selectedActions.length === 0 && !arOfficeActive) || isAdvancing}
            className="w-full bg-gradient-to-r from-brand-burgundy to-brand-burgundy text-white hover:from-brand-burgundy/80 hover:to-brand-purple-light py-3 font-medium shadow-lg"
            size="lg"
          >
            {isAdvancing ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Processing Week...
              </>
            ) : (
              <>
                <i className="fas fa-rocket mr-2"></i>
                Advance to Next Week
              </>
            )}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
