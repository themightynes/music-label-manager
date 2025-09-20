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
}

export type ExecutiveMeetingEvent =
  | { type: 'SELECT_EXECUTIVE'; executive: Executive }
  | { type: 'SELECT_MEETING'; meeting: RoleMeeting }
  | { type: 'SELECT_CHOICE'; choice: DialogueChoice }
  | { type: 'BACK_TO_EXECUTIVES' }
  | { type: 'BACK_TO_MEETINGS' }
  | { type: 'RESET' }
  | { type: 'SYNC_SLOTS'; used: number; total: number };

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
    }),
  },
});