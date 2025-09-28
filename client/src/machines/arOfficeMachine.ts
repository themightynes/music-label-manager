import { createMachine, assign } from 'xstate';

// A&R Office sourcing types
export type SourcingType = 'active' | 'passive' | 'specialized';

// Callback types for external orchestration (no store mutations here)
export type SourcingStartCallback = (info: {
  gameId: string;
  sourcingType: SourcingType;
  startedAt: number;
}) => void;

export type SourcingEndCallback = (info: {
  gameId: string;
  sourcingType: SourcingType | null;
  startedAt: number | null;
  endedAt: number;
  reason: 'completed' | 'cancelled';
}) => void;

export type ConsumeSlotCallback = (info: {
  gameId: string;
  sourcingType: SourcingType;
  at: number;
}) => void;

export type ReleaseSlotCallback = (info: {
  gameId: string;
  sourcingType: SourcingType | null;
  at: number;
  reason: 'completed' | 'cancelled';
}) => void;

export interface AROfficeContext {
  gameId: string;
  sourcingType: SourcingType | null;
  operationStartTime: number | null;
  focusSlotsUsed: number;
  focusSlotsTotal: number;
  // Optimistic, local-only reservation count for this machine instance
  reservedLocally: number;
  // Derived from server/store: true when slot is free and sourcingType is set
  operationComplete: boolean;
  error: string | null;
  onSourcingStart?: SourcingStartCallback;
  onSourcingEnd?: SourcingEndCallback;
  onConsumeSlot?: ConsumeSlotCallback;
  onReleaseSlot?: ReleaseSlotCallback;
}

export type AROfficeEvent =
  | { type: 'START_SOURCING'; sourcingType: SourcingType }
  | { type: 'COMPLETE_SOURCING' }
  | { type: 'CANCEL_SOURCING' }
  | { type: 'SYNC_SLOTS'; used: number; total: number }
  | { type: 'SYNC_STATUS'; slotUsed: boolean; sourcingType: SourcingType | null }
  | { type: 'RETRY' };

// No services needed: gate on hasFocusSlots and mirror via SYNC_SLOTS.

export const arOfficeMachine = createMachine({
  types: {} as {
    context: AROfficeContext;
    events: AROfficeEvent;
    input: { gameId: string; onSourcingStart?: SourcingStartCallback; onSourcingEnd?: SourcingEndCallback; onConsumeSlot?: ConsumeSlotCallback; onReleaseSlot?: ReleaseSlotCallback };
  },
  id: 'arOffice',
  initial: 'idle',
  context: ({ input }) => ({
    gameId: input.gameId,
    sourcingType: null,
    operationStartTime: null,
    focusSlotsUsed: 0,
    focusSlotsTotal: 0,
    reservedLocally: 0,
    operationComplete: false,
    error: null,
    onSourcingStart: input.onSourcingStart,
    onSourcingEnd: input.onSourcingEnd,
    onConsumeSlot: input.onConsumeSlot,
    onReleaseSlot: input.onReleaseSlot,
  }),
  on: {
    SYNC_SLOTS: {
      actions: assign(({ event }) => {
        if (event.type !== 'SYNC_SLOTS') return {};
        return {
          focusSlotsUsed: event.used,
          focusSlotsTotal: event.total,
        };
      }),
    },
    SYNC_STATUS: {
      actions: assign(({ event }) => {
        if (event.type !== 'SYNC_STATUS') return {};
        const operationComplete = !event.slotUsed && !!event.sourcingType;
        return {
          operationComplete,
          sourcingType: event.sourcingType ?? null,
        };
      }),
    },
  },
  states: {
    idle: {
      on: {
        START_SOURCING: [
          {
            guard: ({ context, event }) =>
              event.type === 'START_SOURCING' && (context.focusSlotsUsed + context.reservedLocally) < context.focusSlotsTotal && ['active','passive','specialized'].includes(event.sourcingType),
            target: 'sourcingActive',
            actions: ['assignSourcingType', 'clearError', 'logOperationStart', 'reserveLocalSlot', 'notifyConsumeSlot', 'notifySourcingStart'],
          },
          {
            target: 'noSlotsAvailable',
            actions: assign({ error: () => 'No focus slots available' }),
          }
        ],
      },
    },

    sourcingActive: {
      always: [
        {
          guard: 'isOperationComplete',
          target: 'idle',
          actions: ['notifyReleaseSlot', 'notifySourcingEnd', 'logOperationEnd', 'releaseLocalSlot', assign({ sourcingType: () => null, operationComplete: () => false })],
        }
      ],
      on: {
        COMPLETE_SOURCING: [
          {
            guard: 'isOperationComplete',
            target: 'idle',
            actions: ['notifyReleaseSlot', 'notifySourcingEnd', 'logOperationEnd', 'releaseLocalSlot', assign({ sourcingType: () => null, operationComplete: () => false })],
          },
          {
            target: 'sourcingActive',
            actions: assign({ error: () => 'Operation not yet completed by server. Advance the week first.' }),
          }
        ],
        CANCEL_SOURCING: {
          target: 'idle',
          actions: ['notifyReleaseSlot', 'notifySourcingEnd', 'logOperationEnd', 'releaseLocalSlot', assign({ sourcingType: () => null, operationComplete: () => false })],
        },
      },
    },

    noSlotsAvailable: {
      on: {
        RETRY: {
          target: 'idle',
          actions: 'clearError',
        },
      },
    },
  },
}, {
  guards: {
    hasFocusSlots: ({ context }) => (context.focusSlotsUsed + context.reservedLocally) < context.focusSlotsTotal,
    isValidSourcingType: ({ event }) => {
      if (event.type !== 'START_SOURCING') return false;
      return ['active', 'passive', 'specialized'].includes(event.sourcingType);
    },
    isOperationComplete: ({ context }) => !!context.operationComplete,
  },
  actions: {
    assignSourcingType: assign(({ event }) => {
      if (event.type !== 'START_SOURCING') return {};
      return { sourcingType: event.sourcingType };
    }),
    clearError: assign({ error: () => null }),
    logOperationStart: assign({ operationStartTime: () => Date.now() }),
    logOperationEnd: assign({ operationStartTime: () => null }),
    reserveLocalSlot: assign({ reservedLocally: ({ context }) => context.reservedLocally + 1 }),
    releaseLocalSlot: assign({ reservedLocally: ({ context }) => Math.max(0, context.reservedLocally - 1) }),
    notifySourcingStart: ({ context }) => {
      try {
        if (context.onSourcingStart && context.sourcingType) {
          context.onSourcingStart({
            gameId: context.gameId,
            sourcingType: context.sourcingType,
            startedAt: context.operationStartTime ?? Date.now(),
          });
        }
      } catch (e) {
        // Swallow callback errors to avoid breaking machine flow
        console.error('[A&R] notifySourcingStart callback error:', e);
      }
    },
    notifySourcingEnd: ({ context, event }) => {
      try {
        if (context.onSourcingEnd) {
          const reason = event.type === 'CANCEL_SOURCING' ? 'cancelled' : 'completed';
          context.onSourcingEnd({
            gameId: context.gameId,
            sourcingType: context.sourcingType,
            startedAt: context.operationStartTime,
            endedAt: Date.now(),
            reason,
          });
        }
      } catch (e) {
        console.error('[A&R] notifySourcingEnd callback error:', e);
      }
    },
    notifyConsumeSlot: ({ context }) => {
      try {
        if (context.onConsumeSlot && context.sourcingType) {
          context.onConsumeSlot({
            gameId: context.gameId,
            sourcingType: context.sourcingType,
            at: context.operationStartTime ?? Date.now(),
          });
        }
      } catch (e) {
        console.error('[A&R] notifyConsumeSlot callback error:', e);
      }
    },
    notifyReleaseSlot: ({ context, event }) => {
      try {
        if (context.onReleaseSlot) {
          const reason = event.type === 'CANCEL_SOURCING' ? 'cancelled' : 'completed';
          context.onReleaseSlot({
            gameId: context.gameId,
            sourcingType: context.sourcingType,
            at: Date.now(),
            reason,
          });
        }
      } catch (e) {
        console.error('[A&R] notifyReleaseSlot callback error:', e);
      }
    },
  },
});
