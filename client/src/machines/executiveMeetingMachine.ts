import { assign, fromPromise, setup } from 'xstate';
import type { RoleMeeting, DialogueChoice, Executive } from '../../../shared/types/gameTypes';
import { fetchExecutives, fetchRoleMeetings, fetchMeetingDialogue } from '../services/executiveService';
import { prepareAutoSelectOptions, selectTopOptions, optionToActionData, type AutoSelectOption } from '../services/executiveAutoSelect';

type DialogueData = {
  prompt: string;
  choices: DialogueChoice[];
};

type AutoOption = {
  executive: Executive;
  meeting: RoleMeeting;
  choice: DialogueChoice;
  score: number;
  actionData: {
    roleId: string;
    actionId: string;
    choiceId: string;
    executiveId?: string;
  };
};

interface ExecutiveServices {
  fetchExecutives: (gameId: string) => Promise<Executive[]>;
  fetchRoleMeetings: (roleId: string, gameId?: string, currentWeek?: number) => Promise<RoleMeeting[]>;
  fetchMeetingDialogue: (roleId: string, meetingId: string) => Promise<DialogueData>;
}

export interface ExecutiveMeetingContext {
  gameId: string;
  currentWeek: number;
  executives: Executive[];
  meetingsCache: Record<string, RoleMeeting[]>;
  dialogueCache: Record<string, DialogueData>;
  selectedExecutive: Executive | null;
  availableMeetings: RoleMeeting[];
  selectedMeeting: RoleMeeting | null;
  selectedArtistId: string | null;
  currentDialogue: DialogueData | null;
  focusSlotsUsed: number;
  focusSlotsTotal: number;
  error: string | null;
  autoOptions: AutoOption[];
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
  services: ExecutiveServices;
  onActionSelected: (action: string) => void;
}

export type ExecutiveMeetingEvent =
  | { type: 'SELECT_EXECUTIVE'; executive: Executive }
  | { type: 'SELECT_MEETING'; meeting: RoleMeeting; selectedArtistId?: string }
  | { type: 'SELECT_CHOICE'; choice: DialogueChoice }
  | { type: 'BACK_TO_EXECUTIVES' }
  | { type: 'BACK_TO_MEETINGS' }
  | { type: 'RESET' }
  | { type: 'SYNC_SLOTS'; used: number; total: number }
  | { type: 'SYNC_WEEK'; currentWeek: number }
  | { type: 'AUTO_SELECT' }
  | { type: 'CALCULATE_IMPACT_PREVIEW'; selectedActions: string[] }
  | { type: 'REFRESH_EXECUTIVES' };

interface ExecutiveMeetingInput {
  gameId: string;
  currentWeek: number;
  focusSlotsTotal: number;
  onActionSelected: (action: string) => void;
  fetchExecutives?: ExecutiveServices['fetchExecutives'];
  fetchRoleMeetings?: ExecutiveServices['fetchRoleMeetings'];
  fetchMeetingDialogue?: ExecutiveServices['fetchMeetingDialogue'];
}

const createAutoActionData = (executive: Executive, meeting: RoleMeeting, choice: DialogueChoice, selectedArtistId?: string | null) => ({
  roleId: executive.role,
  actionId: meeting.id,
  choiceId: choice.id,
  ...(executive.role !== 'ceo' && { executiveId: executive.id }),
  ...(selectedArtistId && { metadata: { selectedArtistId, targetScope: meeting.target_scope } }),
  ...(!selectedArtistId && meeting.target_scope && { metadata: { targetScope: meeting.target_scope } }),
});

export const executiveMeetingMachine = setup({
  types: {
    context: {} as ExecutiveMeetingContext,
    events: {} as ExecutiveMeetingEvent,
    input: {} as ExecutiveMeetingInput,
  },
  guards: {
    hasFocusSlots: ({ context }) => context.focusSlotsUsed < context.focusSlotsTotal,
    hasCachedMeetings: ({ context, event }) => {
      if (event.type !== 'SELECT_EXECUTIVE') return false;
      const cacheKey = `${event.executive.role}-week${context.currentWeek}`;
      return Boolean(context.meetingsCache[cacheKey]?.length);
    },
    hasFocusSlotsAndCachedMeetings: ({ context, event }) => {
      if (event.type !== 'SELECT_EXECUTIVE') return false;
      const cacheKey = `${event.executive.role}-week${context.currentWeek}`;
      return context.focusSlotsUsed < context.focusSlotsTotal && Boolean(context.meetingsCache[cacheKey]?.length);
    },
    hasValidMeeting: ({ event }) => event.type === 'SELECT_MEETING' && Boolean(event.meeting?.id),
    hasDialogueCached: ({ context, event }) =>
      event.type === 'SELECT_MEETING' &&
      Boolean(context.selectedExecutive && context.dialogueCache[`${context.selectedExecutive.role}::${event.meeting.id}`]),
    hasSelectedActions: ({ event }) => event.type === 'CALCULATE_IMPACT_PREVIEW' && event.selectedActions.length > 0,
  },
  actions: {
    syncSlots: assign(({ event }) =>
      event.type === 'SYNC_SLOTS'
        ? {
            focusSlotsUsed: event.used,
            focusSlotsTotal: event.total,
          }
        : {}
    ),
    syncWeek: assign(({ event }) =>
      event.type === 'SYNC_WEEK'
        ? {
            currentWeek: event.currentWeek,
            meetingsCache: {}, // Clear cache when week changes
          }
        : {}
    ),
    setExecutives: assign(({ event }) => {
      const output = (event as any)?.output as Executive[] | undefined;
      if (!output) return {};
      return {
        executives: output,
        error: null,
      };
    }),
    captureError: assign(({ event }) => {
      const message =
        event instanceof Error
          ? event.message
          : typeof event === 'object' && event !== null && 'data' in event && event.data instanceof Error
          ? event.data.message
          : 'Unable to load executive data';
      return { error: message } satisfies Partial<ExecutiveMeetingContext>;
    }),
    clearError: assign({ error: () => null }),
    assignSelectedExecutive: assign(({ event }) =>
      event.type === 'SELECT_EXECUTIVE'
        ? {
            selectedExecutive: event.executive,
            selectedMeeting: null,
            currentDialogue: null,
            availableMeetings: [],
            error: null,
          }
        : {}
    ),
    useCachedMeetings: assign(({ context, event }) => {
      if (event.type !== 'SELECT_EXECUTIVE') return {};
      const cacheKey = `${event.executive.role}-week${context.currentWeek}`;
      const meetings = context.meetingsCache[cacheKey] ?? [];
      return {
        selectedExecutive: event.executive,
        availableMeetings: meetings,
        selectedMeeting: null,
        currentDialogue: null,
        error: null,
      } satisfies Partial<ExecutiveMeetingContext>;
    }),
    cacheMeetings: assign(({ context, event }) => {
      if (!context.selectedExecutive) return {};
      const output = (event as any)?.output as RoleMeeting[] | undefined;
      if (!output) return {};
      const cacheKey = `${context.selectedExecutive.role}-week${context.currentWeek}`;
      return {
        meetingsCache: {
          ...context.meetingsCache,
          [cacheKey]: output,
        },
        availableMeetings: output,
        error: null,
      };
    }),
    selectMeeting: assign(({ event }) =>
      event.type === 'SELECT_MEETING'
        ? {
            selectedMeeting: event.meeting,
            selectedArtistId: event.selectedArtistId ?? null,
            error: null,
          }
        : {}
    ),
    cacheDialogue: assign(({ context, event }) => {
      if (!context.selectedExecutive || !context.selectedMeeting) {
        return {};
      }
      const output = (event as any)?.output as DialogueData | undefined;
      if (!output) return {};
      const key = `${context.selectedExecutive.role}::${context.selectedMeeting.id}`;
      return {
        dialogueCache: {
          ...context.dialogueCache,
          [key]: output,
        },
        currentDialogue: output,
        error: null,
      };
    }),
    useCachedDialogue: assign(({ context, event }) => {
      if (event.type !== 'SELECT_MEETING' || !context.selectedExecutive) return {};
      const role = context.selectedExecutive.role;
      const key = `${role}::${event.meeting.id}`;
      const dialogue = context.dialogueCache[key];
      if (!dialogue) return {};
      return {
        selectedMeeting: event.meeting,
        selectedArtistId: event.selectedArtistId || null,
        currentDialogue: dialogue,
        error: null,
      } satisfies Partial<ExecutiveMeetingContext>;
    }),
    clearSelection: assign({
      selectedExecutive: () => null,
      selectedMeeting: () => null,
      selectedArtistId: () => null,
      availableMeetings: () => [],
      currentDialogue: () => null,
      autoOptions: () => [],
      error: () => null,
    }),
    queueChoiceAction: ({ context, event }) => {
      if (event.type !== 'SELECT_CHOICE') return;
      const { selectedExecutive, selectedMeeting, selectedArtistId, onActionSelected } = context;
      if (!selectedExecutive || !selectedMeeting) return;
      const data = createAutoActionData(selectedExecutive, selectedMeeting, event.choice, selectedArtistId);
      onActionSelected(JSON.stringify(data));
    },
    storeAutoOptions: assign(({ context, event }) => {
      const result = (event as any)?.output as { options: AutoOption[]; meetings: Record<string, RoleMeeting[]> } | undefined;
      if (!result) return {};
      const { options, meetings } = result;
      const updatedMeetings = { ...context.meetingsCache };
      Object.entries(meetings).forEach(([role, list]) => {
        if (list.length > 0) {
          updatedMeetings[role] = list;
        }
      });
      return {
        autoOptions: options,
        meetingsCache: updatedMeetings,
      };
    }),
    executeAutoOptions: ({ context }) => {
      context.autoOptions.forEach((option) => {
        context.onActionSelected(JSON.stringify(option.actionData));
      });
    },
    clearImpactPreview: assign({
      impactPreview: () => ({ immediate: {}, delayed: {}, selectedChoices: [] }),
    }),
    updateImpactPreview: assign(({ context, event }) => {
      const result = (event as any)?.output as {
        preview: ExecutiveMeetingContext['impactPreview'];
        dialogueUpdates: Record<string, DialogueData>;
      } | undefined;
      if (!result) return {};
      const { preview, dialogueUpdates } = result;
      return {
        impactPreview: preview,
        dialogueCache: { ...context.dialogueCache, ...dialogueUpdates },
        error: null,
      };
    }),
  },
  actors: {
    fetchExecutives: fromPromise(({ input }) => {
      const { context } = input as { context: ExecutiveMeetingContext };
      return context.services.fetchExecutives(context.gameId);
    }),
    fetchMeetings: fromPromise(({ input }) => {
      const { context } = input as { context: ExecutiveMeetingContext };
      if (!context.selectedExecutive) throw new Error('No executive selected');
      return context.services.fetchRoleMeetings(context.selectedExecutive.role, context.gameId, context.currentWeek);
    }),
    fetchDialogue: fromPromise(({ input }) => {
      const { context } = input as { context: ExecutiveMeetingContext };
      if (!context.selectedExecutive || !context.selectedMeeting) {
        throw new Error('Executive or meeting missing');
      }
      return context.services.fetchMeetingDialogue(context.selectedExecutive.role, context.selectedMeeting.id);
    }),
    prepareAutoSelections: fromPromise(async ({ input }) => {
      const { context } = input as { context: ExecutiveMeetingContext };
      const meetingsUpdates: Record<string, RoleMeeting[]> = {};
      const ensureMeetings = async (role: string) => {
        const cacheKey = `${role}-week${context.currentWeek}`;
        if (context.meetingsCache[cacheKey]?.length) {
          return context.meetingsCache[cacheKey];
        }
        const fetched = await context.services.fetchRoleMeetings(role, context.gameId, context.currentWeek);
        meetingsUpdates[cacheKey] = fetched;
        return fetched;
      };

      const slotsRemaining = Math.max(0, context.focusSlotsTotal - context.focusSlotsUsed);
      if (slotsRemaining === 0) {
        return { options: [], meetings: meetingsUpdates };
      }

      // Build meetings by role map
      const meetingsByRole: Record<string, RoleMeeting[]> = {};
      for (const executive of context.executives) {
        meetingsByRole[executive.role] = await ensureMeetings(executive.role);
      }

      // Use shared auto-select logic
      const allOptions = prepareAutoSelectOptions(context.executives, meetingsByRole);
      const topOptions = selectTopOptions(allOptions, slotsRemaining);

      // Convert to AutoOption format expected by machine
      const machineOptions: AutoOption[] = topOptions.map(option => ({
        executive: option.executive,
        meeting: option.meeting,
        choice: option.choice,
        score: option.score,
        actionData: createAutoActionData(option.executive, option.meeting, option.choice),
      }));

      return {
        options: machineOptions,
        meetings: meetingsUpdates,
      };
    }),
    calculateImpactPreview: fromPromise(async ({ input }) => {
      const { context, event } = input as { context: ExecutiveMeetingContext; event: ExecutiveMeetingEvent };
      if (event.type !== 'CALCULATE_IMPACT_PREVIEW') {
        return { preview: { immediate: {}, delayed: {}, selectedChoices: [] }, dialogueUpdates: {} };
      }

      const immediate: Record<string, number> = {};
      const delayed: Record<string, number> = {};
      const selectedChoices: ExecutiveMeetingContext['impactPreview']['selectedChoices'] = [];
      const dialogueUpdates: Record<string, DialogueData> = {};

      for (const actionString of event.selectedActions) {
        try {
          const actionData = JSON.parse(actionString) as {
            roleId: string;
            actionId: string;
            choiceId: string;
          };
          const cacheKey = `${actionData.roleId}::${actionData.actionId}`;
          let dialogue = context.dialogueCache[cacheKey];
          if (!dialogue) {
            dialogue = await context.services.fetchMeetingDialogue(actionData.roleId, actionData.actionId);
            dialogueUpdates[cacheKey] = dialogue;
          }
          const choice = dialogue.choices.find((c: DialogueChoice) => c.id === actionData.choiceId);
          if (!choice) continue;

          const immediateEffects = Object.fromEntries(
            Object.entries(choice.effects_immediate ?? {}).filter(([, value]) => typeof value === 'number')
          ) as Record<string, number>;

          const delayedEffects = Object.fromEntries(
            Object.entries(choice.effects_delayed ?? {}).filter(([, value]) => typeof value === 'number')
          ) as Record<string, number>;

          selectedChoices.push({
            executiveName: actionData.roleId.toUpperCase(),
            meetingName: actionData.actionId.replace(/_/g, ' '),
            choiceLabel: choice.label,
            effects_immediate: immediateEffects,
            effects_delayed: delayedEffects,
          });

          Object.entries(immediateEffects).forEach(([key, value]) => {
            if (typeof value === 'number') {
              immediate[key] = (immediate[key] ?? 0) + value;
            }
          });
          Object.entries(delayedEffects).forEach(([key, value]) => {
            if (typeof value === 'number') {
              delayed[key] = (delayed[key] ?? 0) + value;
            }
          });
        } catch (err) {
          console.error('[IMPACT PREVIEW] Failed to process action', actionString, err);
        }
      }

      return {
        preview: { immediate, delayed, selectedChoices },
        dialogueUpdates,
      };
    }),
  },
}).createMachine({
  id: 'executiveMeeting',
  initial: 'loadingExecutives',
  context: ({ input }) => ({
    gameId: input.gameId,
    currentWeek: input.currentWeek,
    executives: [],
    meetingsCache: {},
    dialogueCache: {},
    selectedExecutive: null,
    availableMeetings: [],
    selectedMeeting: null,
    selectedArtistId: null,
    currentDialogue: null,
    focusSlotsUsed: 0,
    focusSlotsTotal: input.focusSlotsTotal,
    error: null,
    autoOptions: [],
    impactPreview: { immediate: {}, delayed: {}, selectedChoices: [] },
    services: {
      fetchExecutives: input.fetchExecutives ?? fetchExecutives,
      fetchRoleMeetings: input.fetchRoleMeetings ?? fetchRoleMeetings,
      fetchMeetingDialogue: input.fetchMeetingDialogue ?? fetchMeetingDialogue,
    },
    onActionSelected: input.onActionSelected,
  }),
  on: {
    SYNC_SLOTS: { actions: 'syncSlots' },
    SYNC_WEEK: { actions: 'syncWeek' },
    CALCULATE_IMPACT_PREVIEW: [
      {
        guard: 'hasSelectedActions' as const,
        target: '#executiveMeeting.fetchingImpactPreview',
        actions: 'clearImpactPreview',
      },
      {
        actions: 'clearImpactPreview',
      },
    ],
    REFRESH_EXECUTIVES: {
      target: '#executiveMeeting.refreshingExecutives',
      actions: 'clearSelection',
    },
    RESET: {
      actions: 'clearSelection',
      target: '#executiveMeeting.idle',
    },
    BACK_TO_EXECUTIVES: {
      actions: 'clearSelection',
      target: '#executiveMeeting.idle',
    },
    BACK_TO_MEETINGS: {
      actions: assign({ selectedMeeting: () => null, currentDialogue: () => null }),
      target: '#executiveMeeting.selectingMeeting',
    },
  },
  states: {
    loadingExecutives: {
      invoke: {
        src: 'fetchExecutives',
        input: ({ context }) => ({ context }),
        onDone: {
          target: 'idle',
          actions: 'setExecutives',
        },
        onError: {
          target: 'idle',
          actions: 'captureError',
        },
      },
    },
    idle: {
      on: {
        SELECT_EXECUTIVE: [
          {
            guard: 'hasFocusSlotsAndCachedMeetings' as const,
            target: 'selectingMeeting',
            actions: 'useCachedMeetings',
          },
          {
            guard: 'hasFocusSlots' as const,
            target: 'loadingMeetings',
            actions: 'assignSelectedExecutive',
          },
        ],
        AUTO_SELECT: {
          guard: 'hasFocusSlots' as const,
          target: 'autoSelecting',
        },
      },
    },
    loadingMeetings: {
      invoke: {
        src: 'fetchMeetings',
        input: ({ context }) => ({ context }),
        onDone: {
          target: 'selectingMeeting',
          actions: 'cacheMeetings',
        },
        onError: {
          target: 'idle',
          actions: 'captureError',
        },
      },
    },
    selectingMeeting: {
      on: {
        SELECT_MEETING: [
          {
            guard: 'hasDialogueCached' as const,
            target: 'inDialogue',
            actions: 'useCachedDialogue',
          },
          {
            guard: 'hasValidMeeting' as const,
            target: 'loadingDialogue',
            actions: 'selectMeeting',
          },
        ],
        SELECT_EXECUTIVE: [
          {
            guard: 'hasFocusSlotsAndCachedMeetings' as const,
            target: 'selectingMeeting',
            actions: 'useCachedMeetings',
          },
          {
            guard: 'hasFocusSlots' as const,
            target: 'loadingMeetings',
            actions: 'assignSelectedExecutive',
          },
        ],
        BACK_TO_EXECUTIVES: {
          target: 'idle',
          actions: 'clearSelection',
        },
      },
    },
    loadingDialogue: {
      invoke: {
        src: 'fetchDialogue',
        input: ({ context }) => ({ context }),
        onDone: {
          target: 'inDialogue',
          actions: 'cacheDialogue',
        },
        onError: {
          target: 'selectingMeeting',
          actions: 'captureError',
        },
      },
    },
    inDialogue: {
      on: {
        SELECT_CHOICE: {
          target: 'processingChoice',
          actions: 'queueChoiceAction',
        },
        SELECT_EXECUTIVE: [
          {
            guard: 'hasFocusSlotsAndCachedMeetings' as const,
            target: 'selectingMeeting',
            actions: 'useCachedMeetings',
          },
          {
            guard: 'hasFocusSlots' as const,
            target: 'loadingMeetings',
            actions: 'assignSelectedExecutive',
          },
        ],
        BACK_TO_MEETINGS: {
          target: 'selectingMeeting',
          actions: assign({ selectedMeeting: () => null, currentDialogue: () => null }),
        },
      },
    },
    processingChoice: {
      after: {
        400: 'refreshingExecutives',
      },
    },
    refreshingExecutives: {
      invoke: {
        src: 'fetchExecutives',
        input: ({ context }) => ({ context }),
        onDone: {
          target: 'complete',
          actions: 'setExecutives',
        },
        onError: {
          target: 'complete',
          actions: 'captureError',
        },
      },
    },
    complete: {
      entry: 'clearSelection',
      after: {
        600: 'idle',
      },
    },
    autoSelecting: {
      invoke: {
        src: 'prepareAutoSelections',
        input: ({ context }) => ({ context }),
        onDone: {
          target: 'idle',
          actions: ['storeAutoOptions', 'executeAutoOptions', 'clearSelection'],
        },
        onError: {
          target: 'idle',
          actions: 'captureError',
        },
      },
    },
    fetchingImpactPreview: {
      invoke: {
        src: 'calculateImpactPreview',
        input: ({ context, event }) => ({ context, event }),
        onDone: {
          target: 'idle',
          actions: 'updateImpactPreview',
        },
        onError: {
          target: 'idle',
          actions: ['captureError', 'clearImpactPreview'],
        },
      },
    },
  },
});