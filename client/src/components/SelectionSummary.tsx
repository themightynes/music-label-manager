import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useGameStore } from '@/store/gameStore';
import { useGameState } from '@/hooks/useGameState';
import { TrendingUp, TrendingDown, Clock, Zap, BarChart3, X, Rocket, Loader2, Search, Crown, Music, Megaphone, Palette, Truck, type LucideIcon } from 'lucide-react';
import logger from '@/lib/logger';
import { LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';

// Badge honesty (exec-meetings-revival PR-2): same whitelist as DialogueInterface —
// only render a badge for a key the engine actually implements, or 'executive_mood'
// (wired outside applyEffects's switch). See DialogueInterface.tsx for the twin.
function isRenderableEffectKey(key: string): boolean {
  return LIVE_EFFECT_KEYS.has(key) || key === 'executive_mood';
}

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

// Maps the legacy FontAwesome icon class (data-only field, see `icon` above) to a lucide-react
// component for rendering — no Font Awesome markup renders in the DOM.
const FA_ICON_MAP: Record<string, LucideIcon> = {
  'fas fa-crown': Crown,
  'fas fa-music': Music,
  'fas fa-bullhorn': Megaphone,
  'fas fa-palette': Palette,
  'fas fa-truck': Truck,
};

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
  const { cancelAROfficeOperation } = useGameStore();
  const gameState = useGameState();
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
    <Card className="h-full glass-panel chromatic-hairline border-0">
      {/* Horizontal Focus Slots at Top */}
      <CardHeader className="p-4 border-b border-white/[0.07]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display text-text-primary">Focus Slots</h3>
            <Badge variant="secondary" className="text-sm font-mono rounded-pill bg-neon-lilac/10 text-neon-lilac border border-neon-lilac/40">
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
                  className={`flex gap-3 p-3 rounded-card border-2 border-dashed transition-colors ${
                    snapshot.isDraggingOver ? 'border-neon-lilac/40 bg-neon-lilac/10' : 'border-white/15'
                  }`}
                >
                  {selectedActionObjects.map((action, index) => (
                    <Draggable key={action.id} draggableId={action.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex-1 bg-surface-inner/60 border border-white/10 rounded-card p-3 transition-all ${
                            snapshot.isDragging ? 'shadow-glow-lilac rotate-2' : 'hover:bg-surface-inner/80'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              {...provided.dragHandleProps}
                              className="w-8 h-8 bg-gradient-to-br from-action-pink to-action-purple text-white rounded-button flex items-center justify-center cursor-grab active:cursor-grabbing"
                            >
                              <span className="text-sm font-bold font-mono">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                {(() => {
                                  const ActionIcon = FA_ICON_MAP[action.icon] || Music;
                                  return <ActionIcon className="h-3.5 w-3.5 text-neon-lilac" />;
                                })()}
                                <h4 className="font-medium text-sm text-text-primary truncate">{action.executiveName}</h4>
                              </div>
                              <p className="text-xs text-text-muted truncate">{action.meetingName}</p>
                            </div>
                            <button
                              onClick={() => onRemoveAction(action.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-negative/20 border border-negative/40 text-negative hover:bg-negative/30 transition-all"
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
                      className="flex-1 bg-surface-inner/60 border border-white/10 rounded-card p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-neon-purple to-action-pink text-white rounded-button flex items-center justify-center">
                          <span className="text-sm font-bold font-mono">{selectedActionObjects.length + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Search className="h-3.5 w-3.5 text-money" />
                            <h4 className="font-medium text-sm text-text-primary truncate">A&amp;R Scouting</h4>
                          </div>
                          <p className="text-xs text-text-muted truncate">
                            {arOfficeSourcingType ? arOfficeSourcingType.replace(/_/g, ' ') : 'Operation active'}
                          </p>
                        </div>
                        <button
                          onClick={() => cancelAROfficeOperation()}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-negative/20 border border-negative/40 text-negative hover:bg-negative/30 transition-all"
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
                      className="flex-1 bg-surface-inner/40 border border-white/10 rounded-card p-3 opacity-50"
                    >
                      <div className="flex items-center justify-center h-8">
                        <span className="text-xs font-mono text-text-muted">Slot {filledSlotsCount + index + 1}</span>
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
        <div className="bg-surface-inner/40 rounded-card p-4 border border-white/10">
          <h3 className="text-xs font-mono font-semibold text-text-label uppercase tracking-wider mb-3 flex items-center">
            <BarChart3 className="h-3.5 w-3.5 mr-2 text-money" />
            Impact Preview
          </h3>

          {selectedActions.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {/* This Week */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-neon-amber" />
                  <span className="text-xs font-medium text-text-body">This Week</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(impactPreview?.immediate || {})
                    .filter(([effect]) => isRenderableEffectKey(effect))
                    .map(([effect, value]) => (
                      <Badge key={effect} variant="outline" className={`text-xs font-mono rounded-pill ${value > 0 ? 'text-positive border-positive/40 bg-positive/10' : 'text-negative border-negative/40 bg-negative/10'}`}>
                        {value > 0 ? '+' : ''}{value} {effect.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  {Object.keys(impactPreview?.immediate || {}).filter(isRenderableEffectKey).length === 0 && (
                    <span className="text-xs text-text-muted">No immediate effects</span>
                  )}
                </div>
              </div>

              {/* Delayed Effects */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-neon-cyan" />
                  <span className="text-xs font-medium text-text-body">Delayed Effects</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(impactPreview?.delayed || {})
                    .filter(([effect]) => isRenderableEffectKey(effect))
                    .map(([effect, value]) => (
                      <Badge key={effect} variant="outline" className="text-xs font-mono rounded-pill border-neon-lilac/40 bg-neon-lilac/10 text-neon-lilac">
                        {value > 0 ? '+' : ''}{value} {effect.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  {Object.keys(impactPreview?.delayed || {}).filter(isRenderableEffectKey).length === 0 && (
                    <span className="text-xs text-text-muted">No delayed effects</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-text-muted">
              <p className="text-xs">No executive meeting choices made</p>
            </div>
          )}
        </div>

        {/* Advance Week Button */}
        <div className="space-y-3">
          <Button
            onClick={onAdvanceWeek}
            disabled={(selectedActions.length === 0 && !arOfficeActive) || isAdvancing}
            className="relative overflow-hidden w-full rounded-button bg-gradient-to-br from-action-pink to-action-purple text-white hover:opacity-90 py-3 font-semibold shadow-action"
            size="lg"
          >
            <span className="pointer-events-none absolute top-0 left-3.5 right-3.5 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" aria-hidden />
            {isAdvancing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing Week...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Advance to Next Week
              </>
            )}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
