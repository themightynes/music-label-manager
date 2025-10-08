import { assign, fromPromise, setup } from 'xstate';
import type { DialogueScene, DialogueChoice, GameArtist } from '@shared/types/gameTypes';
import type { ArtistDialogueRequest, ArtistDialogueResponse } from '@shared/api/contracts';

/**
 * Service interface for artist dialogue interactions
 */
export interface ArtistDialogueServices {
  loadAllDialogues: () => Promise<DialogueScene[]>;
  submitDialogueChoice: (gameId: string, request: ArtistDialogueRequest) => Promise<ArtistDialogueResponse>;
}

/**
 * Context for the artist dialogue state machine
 */
export interface ArtistDialogueContext {
  gameId: string;
  artist: GameArtist;
  allDialogues: DialogueScene[];
  selectedDialogue: DialogueScene | null;
  selectedChoice: DialogueChoice | null;
  appliedEffects: Record<string, number> | null;
  delayedEffects: Record<string, number> | null;
  error: string | null;
  services: ArtistDialogueServices;
}

/**
 * Events handled by the artist dialogue machine
 */
export type ArtistDialogueEvent =
  | { type: 'OPEN' }
  | { type: 'SELECT_CHOICE'; choice: DialogueChoice }
  | { type: 'RETRY' }
  | { type: 'CLOSE' }
  | { type: 'COMPLETE' };

/**
 * Input for initializing the artist dialogue machine
 */
export interface ArtistDialogueInput {
  gameId: string;
  artist: GameArtist;
  loadAllDialogues: ArtistDialogueServices['loadAllDialogues'];
  submitDialogueChoice: ArtistDialogueServices['submitDialogueChoice'];
}

/**
 * XState machine for managing artist dialogue interactions
 * Follows the pattern from executiveMeetingMachine.ts
 */
export const artistDialogueMachine = setup({
  types: {
    context: {} as ArtistDialogueContext,
    events: {} as ArtistDialogueEvent,
    input: {} as ArtistDialogueInput,
  },
  actors: {
    loadDialogues: fromPromise(async ({ input }: { input: { services: ArtistDialogueServices } }) => {
      return await input.services.loadAllDialogues();
    }),
    submitChoice: fromPromise(async ({ input }: {
      input: {
        gameId: string;
        artistId: string;
        sceneId: string;
        choiceId: string;
        services: ArtistDialogueServices;
      }
    }) => {
      return await input.services.submitDialogueChoice(input.gameId, {
        artistId: input.artistId,
        sceneId: input.sceneId,
        choiceId: input.choiceId,
      });
    }),
  },
  guards: {
    hasSelectedChoice: ({ context }) => context.selectedChoice !== null,
    hasSelectedDialogue: ({ context }) => context.selectedDialogue !== null,
    hasDialogues: ({ event }) => {
      if (event.type.startsWith('xstate.done.actor.')) {
        const dialogues = event.output as DialogueScene[];
        return Array.isArray(dialogues) && dialogues.length > 0;
      }
      return false;
    },
  },
  actions: {
    selectRandomDialogue: assign(({ context }) => {
      if (context.allDialogues.length > 0) {
        const randomIndex = Math.floor(Math.random() * context.allDialogues.length);
        return { selectedDialogue: context.allDialogues[randomIndex], error: null };
      }
      // If no dialogues, keep selectedDialogue as null
      return {};
    }),
    setAllDialogues: assign(({ event }) => {
      if (!event.type.startsWith('xstate.done.actor.') || !Array.isArray(event.output)) {
        return {};
      }
      const dialogues = event.output as DialogueScene[];
      return { allDialogues: dialogues, error: null };
    }),
    selectChoice: assign(({ event }) => {
      if (event.type !== 'SELECT_CHOICE') return {};
      return { selectedChoice: event.choice };
    }),
    setSubmissionResult: assign(({ event }) => {
      if (!event.type.startsWith('xstate.done.actor.')) return {};
      const result = event.output as ArtistDialogueResponse;
      // Only process if output has the expected structure (not an array)
      if (!result || Array.isArray(result) || !('effects' in result)) return {};
      return {
        appliedEffects: result.effects,
        delayedEffects: result.delayedEffects,
        error: null,
      };
    }),
    setError: assign(({ event }) => {
      // Handle any error actor event
      if (event.type.startsWith('xstate.error.actor.')) {
        const error = (event as any).error instanceof Error ? (event as any).error.message : 'An unknown error occurred';
        return { error };
      }
      return {};
    }),
    clearError: assign({ error: null }),
    reset: assign(({ context }) => ({
      // Keep all existing context but clear selection/effects/error
      ...context,
      selectedDialogue: null,
      selectedChoice: null,
      appliedEffects: null,
      delayedEffects: null,
      error: null,
    })),
  },
}).createMachine({
  id: 'artistDialogue',
  initial: 'idle',
  context: ({ input }) => ({
    gameId: input.gameId,
    artist: input.artist,
    allDialogues: [],
    selectedDialogue: null,
    selectedChoice: null,
    appliedEffects: null,
    delayedEffects: null,
    error: null,
    services: {
      loadAllDialogues: input.loadAllDialogues,
      submitDialogueChoice: input.submitDialogueChoice,
    },
  }),
  on: {
    CLOSE: { target: '#artistDialogue.idle', actions: 'reset' },
  },
  states: {
    idle: {
      on: {
        OPEN: 'loading',
      },
    },
    loading: {
      invoke: {
        src: 'loadDialogues',
        input: ({ context }) => ({ services: context.services }),
        onDone: [
          {
            target: 'error',
            guard: ({ event }) => {
              if (event.type.startsWith('xstate.done.actor.')) {
                const dialogues = event.output as DialogueScene[];
                return !Array.isArray(dialogues) || dialogues.length === 0;
              }
              return false;
            },
            actions: assign({ error: 'No dialogue scenes available. Please check the dialogue data configuration.' }),
          },
          {
            target: 'displaying',
            actions: ['setAllDialogues', 'selectRandomDialogue'],
          },
        ],
        onError: {
          target: 'error',
          actions: 'setError',
        },
      },
    },
    displaying: {
      on: {
        SELECT_CHOICE: {
          target: 'submitting',
          actions: 'selectChoice',
          guard: 'hasSelectedDialogue',
        },
        CLOSE: 'idle',
      },
    },
    submitting: {
      invoke: {
        src: 'submitChoice',
        input: ({ context }) => ({
          gameId: context.gameId,
          artistId: context.artist.id,
          sceneId: context.selectedDialogue!.id,
          choiceId: context.selectedChoice!.id,
          services: context.services,
        }),
        onDone: {
          target: 'complete',
          actions: 'setSubmissionResult',
        },
        onError: {
          target: 'error',
          actions: 'setError',
        },
      },
    },
    complete: {
      on: {
        COMPLETE: { target: 'idle', actions: 'reset' },
        CLOSE: { target: 'idle', actions: 'reset' },
      },
    },
    error: {
      on: {
        RETRY: { target: 'loading', actions: 'clearError' },
        CLOSE: { target: 'idle', actions: 'reset' },
      },
    },
  },
});
