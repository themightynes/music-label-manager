import { createMachine, assign, fromPromise } from 'xstate';
import type { GameRole, RoleMeeting, DialogueChoice, Executive } from '../../../shared/types/gameTypes';
import { fetchExecutives, fetchRoleMeetings, fetchMeetingDialogue } from '../services/executiveService';

export interface ExecutiveMeetingContext {
  executives: Executive[];
  selectedExecutive: Executive | null;
  availableMeetings: RoleMeeting[];
  selectedMeeting: RoleMeeting | null;
  currentDialogue: {
    prompt: string;
    choices: DialogueChoice[];
  } | null;
  focusSlotsUsed: number;
  focusSlotsTotal: number;
  error: string | null;
  gameId: string;
  autoOptions: Array<{
    executive: Executive;
    meeting: RoleMeeting;
    choice: DialogueChoice;
    score: number;
    actionData: object;
  }>;
  impactPreview: {
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

export type ExecutiveMeetingEvent =
  | { type: 'SELECT_EXECUTIVE'; executive: Executive }
  | { type: 'SELECT_MEETING'; meeting: RoleMeeting }
  | { type: 'SELECT_CHOICE'; choice: DialogueChoice }
  | { type: 'BACK_TO_EXECUTIVES' }
  | { type: 'BACK_TO_MEETINGS' }
  | { type: 'RESET' }
  | { type: 'SYNC_SLOTS'; used: number; total: number }
  | { type: 'AUTO_SELECT' }
  | { type: 'CALCULATE_IMPACT_PREVIEW'; selectedActions: string[] };

export const executiveMeetingMachine = createMachine({
  types: {} as {
    context: ExecutiveMeetingContext & { onActionSelected: (action: string) => void };
    events: ExecutiveMeetingEvent;
    input: { gameId: string; focusSlotsTotal: number; onActionSelected: (action: string) => void };
  },
  id: 'executiveMeeting',
  initial: 'idle',
  context: ({ input }) => ({
    executives: [],
    selectedExecutive: null,
    availableMeetings: [],
    selectedMeeting: null,
    currentDialogue: null,
    focusSlotsUsed: 0,
    focusSlotsTotal: input.focusSlotsTotal,
    error: null,
    gameId: input.gameId,
    onActionSelected: input.onActionSelected,
    autoOptions: [],
    impactPreview: {
      immediate: {},
      delayed: {},
      selectedChoices: []
    },
  }),
  on: {
    RESET: {
      target: '.idle',
      actions: 'clearSelection'
    },
    BACK_TO_EXECUTIVES: {
      target: '.idle',
      actions: 'clearSelection'
    },
    BACK_TO_MEETINGS: [
      {
        guard: ({ context }) => !!context.selectedExecutive,
        target: '.selectingMeeting',
        actions: assign({ selectedMeeting: null, currentDialogue: null })
      }
    ],
    SYNC_SLOTS: {
      actions: assign({
        focusSlotsUsed: ({ event }) => event.used,
        focusSlotsTotal: ({ event }) => event.total
      })
    },
    CALCULATE_IMPACT_PREVIEW: {
      target: '.fetchingImpactPreview'
    }
  },
  states: {
    idle: {
      on: {
        SELECT_EXECUTIVE: {
          target: 'loadingMeetings',
          actions: assign({
            selectedExecutive: ({ event }) => event.executive,
            error: null,
          }),
          guard: 'hasFocusSlots',
        },
        AUTO_SELECT: {
          target: 'autoSelecting',
          guard: 'hasFocusSlots',
        },
      },
    },
    loadingMeetings: {
      invoke: {
        src: fromPromise(async ({ input }: { input: ExecutiveMeetingContext }) => {
          if (!input.selectedExecutive) {
            throw new Error('No executive selected');
          }
          return await fetchRoleMeetings(input.selectedExecutive.role);
        }),
        input: ({ context }) => context,
        onDone: {
          target: 'selectingMeeting',
          actions: assign({
            availableMeetings: ({ event }) => event.output,
          }),
        },
        onError: {
          target: 'idle',
          actions: assign({
            error: ({ event }) => event.error?.message || 'Failed to load meetings',
            selectedExecutive: null,
          }),
        },
      },
    },
    selectingMeeting: {
      on: {
        SELECT_MEETING: {
          target: 'loadingDialogue',
          actions: assign({
            selectedMeeting: ({ event }) => event.meeting,
            error: null,
          }),
          guard: 'hasValidMeeting',
        },
        BACK_TO_EXECUTIVES: {
          target: 'idle',
          actions: assign({
            selectedExecutive: null,
            availableMeetings: [],
            selectedMeeting: null,
          }),
        },
      },
    },
    loadingDialogue: {
      invoke: {
        src: fromPromise(async ({ input }: { input: ExecutiveMeetingContext }) => {
          if (!input.selectedExecutive || !input.selectedMeeting) {
            throw new Error('No executive or meeting selected');
          }
          return await fetchMeetingDialogue(input.selectedExecutive.role, input.selectedMeeting.id);
        }),
        input: ({ context }) => context,
        onDone: {
          target: 'inDialogue',
          actions: assign({
            currentDialogue: ({ event }) => event.output,
          }),
        },
        onError: {
          target: 'selectingMeeting',
          actions: assign({
            error: ({ event }) => event.error?.message || 'Failed to load dialogue',
            selectedMeeting: null,
          }),
        },
      },
    },
    inDialogue: {
      on: {
        SELECT_CHOICE: {
          target: 'processingChoice',
          actions: 'processChoice',
        },
        BACK_TO_MEETINGS: {
          target: 'selectingMeeting',
          actions: assign({
            selectedMeeting: null,
            currentDialogue: null,
          }),
        },
      },
    },
    processingChoice: {
      after: {
        500: {
          target: 'complete',
        },
      },
    },
    complete: {
      after: {
        1000: {
          target: 'idle',
          actions: 'clearSelection',
        },
      },
    },
    autoSelecting: {
      initial: 'loadingData',
      states: {
        loadingData: {
          invoke: {
            src: fromPromise(async ({ input }) => {
              console.log('[AUTO] fetchAllExecutiveData actor called with input:', input);
              const executives = await fetchExecutives(input.gameId);
              const roles = ['ceo', 'head_ar', 'cmo', 'cco', 'head_distribution'];
              const allMeetings = {};

              for (const role of roles) {
                try {
                  allMeetings[role] = await fetchRoleMeetings(role);
                  console.log(`[AUTO] Fetched ${allMeetings[role].length} meetings for role: ${role}`);
                } catch (error) {
                  console.log(`[AUTO] Error fetching meetings for role ${role}:`, error);
                  allMeetings[role] = [];
                }
              }

              console.log('[AUTO] fetchAllExecutiveData completed:', {
                executivesCount: executives.length,
                meetingsKeys: Object.keys(allMeetings)
              });
              return { executives, allMeetings };
            }),
            input: ({ context }) => context,
            onDone: {
              target: 'selecting',
              actions: 'calculateAutoOptions'
            },
            onError: {
              target: '#executiveMeeting.idle'
            }
          }
        },
        selecting: {
          entry: 'makeAutoSelections',
          after: {
            1000: '#executiveMeeting.idle'
          }
        }
      }
    },
    fetchingImpactPreview: {
      invoke: {
        src: fromPromise(async ({ input }) => {
          console.log('[IMPACT PREVIEW] Fetching effects for actions:', input.selectedActions);
          const immediate: Record<string, number> = {};
          const delayed: Record<string, number> = {};
          const selectedChoices = [];

          // Fetch dialogue data for each selected action
          for (const actionString of input.selectedActions) {
            try {
              const actionData = JSON.parse(actionString);
              const { roleId, actionId, choiceId } = actionData;

              // Fetch the meeting dialogue to get choice effects
              const dialogue = await fetchMeetingDialogue(roleId, actionId);
              const choice = dialogue.choices.find(c => c.id === choiceId);

              if (choice) {
                console.log(`[IMPACT PREVIEW] Found choice for ${roleId}/${actionId}/${choiceId}:`, choice);

                selectedChoices.push({
                  executiveName: roleId.toUpperCase(),
                  meetingName: actionId.replace(/_/g, ' '),
                  choiceLabel: choice.label,
                  effects_immediate: choice.effects_immediate,
                  effects_delayed: choice.effects_delayed
                });

                // Accumulate immediate effects
                Object.entries(choice.effects_immediate).forEach(([effect, value]) => {
                  if (value !== undefined) {
                    immediate[effect] = (immediate[effect] || 0) + value;
                  }
                });

                // Accumulate delayed effects
                Object.entries(choice.effects_delayed).forEach(([effect, value]) => {
                  if (value !== undefined) {
                    delayed[effect] = (delayed[effect] || 0) + value;
                  }
                });
              } else {
                console.warn(`[IMPACT PREVIEW] Choice ${choiceId} not found in ${roleId}/${actionId}`);
              }
            } catch (error) {
              console.error('[IMPACT PREVIEW] Error processing action:', actionString, error);
            }
          }

          return { immediate, delayed, selectedChoices };
        }),
        input: ({ context, event }) => ({
          ...context,
          selectedActions: event.type === 'CALCULATE_IMPACT_PREVIEW' ? event.selectedActions : []
        }),
        onDone: {
          target: 'idle',
          actions: assign(({ event }) => ({
            impactPreview: event.output
          }))
        },
        onError: {
          target: 'idle',
          actions: assign({
            impactPreview: {
              immediate: {},
              delayed: {},
              selectedChoices: []
            }
          })
        }
      }
    },
  },
}, {
  guards: {
    hasFocusSlots: ({ context }) => context.focusSlotsUsed < context.focusSlotsTotal,
    hasValidMeeting: ({ event }) => !!event.meeting && !!event.meeting.id,
  },
  actions: {
    processChoice: ({ context, event }) => {
      if (event.type !== 'SELECT_CHOICE') return;

      const { selectedExecutive, selectedMeeting, onActionSelected } = context;
      if (!selectedExecutive || !selectedMeeting) return;

      const actionData: {
        roleId: string;
        actionId: string;
        choiceId: string;
        executiveId?: string;
      } = {
        roleId: selectedExecutive.role,
        actionId: selectedMeeting.id,
        choiceId: event.choice.id,
      };

      if (selectedExecutive.role !== 'ceo') {
        actionData.executiveId = selectedExecutive.id;
      }

      if (onActionSelected) {
        onActionSelected(JSON.stringify(actionData));
      }
    },
    clearSelection: assign({
      selectedExecutive: null,
      availableMeetings: [],
      selectedMeeting: null,
      currentDialogue: null,
      error: null,
      autoOptions: [],
      impactPreview: {
        immediate: {},
        delayed: {},
        selectedChoices: []
      },
    }),
    calculateImpactPreview: assign(({ context, event }) => {
      if (event.type !== 'CALCULATE_IMPACT_PREVIEW') return {};

      // Return empty preview for now - will be populated by async service
      return {
        impactPreview: {
          immediate: {},
          delayed: {},
          selectedChoices: []
        }
      };
    }),
    calculateAutoOptions: assign(({ context, event }) => {
      console.log('[AUTO] calculateAutoOptions called', { context, event });
      const { executives } = event.output;
      const { allMeetings } = event.output;
      const remainingSlots = context.focusSlotsTotal - context.focusSlotsUsed;

      console.log('[AUTO] Data received:', {
        executivesCount: executives?.length,
        allMeetings: Object.keys(allMeetings || {}),
        remainingSlots
      });

      if (remainingSlots === 0) {
        console.log('[AUTO] No remaining slots');
        return { autoOptions: [] };
      }

      const options = [];

      // Generate all possible combinations
      executives.forEach(executive => {
        const meetings = allMeetings[executive.role] || [];
        console.log(`[AUTO] Executive ${executive.role}: ${meetings.length} meetings`);

        if (meetings.length > 0) {
          const meeting = meetings[0]; // Take first meeting
          console.log(`[AUTO] First meeting for ${executive.role}:`, meeting.id, 'choices:', meeting.choices?.length);

          if (meeting.choices && meeting.choices.length > 0) {
            const choice = meeting.choices[0]; // Take first choice

            // Simple scoring: prioritize by low mood/loyalty + role priority
            const roleScores = {
              'ceo': 50,
              'head_ar': 40,
              'cmo': 30,
              'cco': 20,
              'head_distribution': 10
            };

            const score = (100 - (executive.mood || 50)) +
                         (100 - (executive.loyalty || 50)) +
                         (roleScores[executive.role] || 0);

            const actionData = {
              roleId: executive.role,
              actionId: meeting.id,
              choiceId: choice.id,
              ...(executive.role !== 'ceo' && { executiveId: executive.id })
            };

            console.log(`[AUTO] Created option for ${executive.role}:`, { score, actionData });

            options.push({
              executive,
              meeting,
              choice,
              score,
              actionData
            });
          }
        }
      });

      // Sort by score and take top N
      const sortedOptions = options.sort((a, b) => b.score - a.score);
      const finalOptions = sortedOptions.slice(0, remainingSlots);

      console.log('[AUTO] Final auto options:', finalOptions.length, finalOptions.map(o => o.actionData));

      return {
        autoOptions: finalOptions
      };
    }),
    makeAutoSelections: ({ context }) => {
      console.log('[AUTO] makeAutoSelections called', {
        autoOptionsLength: context.autoOptions.length,
        hasOnActionSelected: !!context.onActionSelected
      });

      context.autoOptions.forEach((option, index) => {
        console.log(`[AUTO] Processing option ${index}:`, JSON.stringify(option.actionData));
        if (context.onActionSelected) {
          context.onActionSelected(JSON.stringify(option.actionData));
          console.log(`[AUTO] Called onActionSelected for option ${index}`);
        } else {
          console.error('[AUTO] onActionSelected is not available!');
        }
      });

      console.log('[AUTO] makeAutoSelections completed');
    }
  },
});