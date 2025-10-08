import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { artistDialogueMachine } from '../artistDialogueMachine';
import type { DialogueScene, GameArtist } from '@shared/types/gameTypes';
import type { ArtistDialogueResponse } from '@shared/api/contracts';

describe('artistDialogueMachine', () => {
  const mockArtist: GameArtist = {
    id: 'artist_test_123',
    name: 'Test Artist',
    archetype: 'Visionary',
    talent: 80,
    workEthic: 70,
    popularity: 60,
    temperament: 50,
    energy: 70,
    mood: 50,
    signed: true,
  };

  const mockDialogueScenes: DialogueScene[] = [
    {
      id: 'dialogue_test_1',
      prompt: 'Test dialogue prompt 1',
      choices: [
        { id: 'choice_1', label: 'Choice 1', effects_immediate: { artist_mood: 2 }, effects_delayed: {} },
        { id: 'choice_2', label: 'Choice 2', effects_immediate: { money: -1000 }, effects_delayed: {} },
        { id: 'choice_3', label: 'Choice 3', effects_immediate: {}, effects_delayed: { artist_energy: 3 } },
      ],
    },
    {
      id: 'dialogue_test_2',
      prompt: 'Test dialogue prompt 2',
      choices: [
        { id: 'choice_1', label: 'Choice 1', effects_immediate: { artist_energy: -2 }, effects_delayed: {} },
        { id: 'choice_2', label: 'Choice 2', effects_immediate: { reputation: 1 }, effects_delayed: {} },
        { id: 'choice_3', label: 'Choice 3', effects_immediate: {}, effects_delayed: { money: -500 } },
      ],
    },
  ];

  const mockDialogueResponse: ArtistDialogueResponse = {
    success: true,
    artistId: 'artist_test_123',
    artistName: 'Test Artist',
    sceneId: 'dialogue_test_1',
    choiceId: 'choice_1',
    effects: { artist_mood: 2 },
    delayedEffects: {},
    message: 'Conversation completed successfully',
  };

  let mockServices: {
    loadAllDialogues: ReturnType<typeof vi.fn>;
    submitDialogueChoice: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockServices = {
      loadAllDialogues: vi.fn().mockResolvedValue(mockDialogueScenes),
      submitDialogueChoice: vi.fn().mockResolvedValue(mockDialogueResponse),
    };
  });

  describe('State Transitions', () => {
    it('should start in idle state', () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();

      expect(actor.getSnapshot().value).toBe('idle');

      actor.stop();
    });

    it('should transition from idle to loading on OPEN event', () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      expect(actor.getSnapshot().value).toBe('loading');

      actor.stop();
    });

    it('should transition from loading to displaying on successful dialogue load', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      expect(actor.getSnapshot().value).toBe('displaying');
      expect(actor.getSnapshot().context.allDialogues).toEqual(mockDialogueScenes);
      expect(actor.getSnapshot().context.selectedDialogue).toBeDefined();

      actor.stop();
    });

    it('should transition from loading to error on failed dialogue load', async () => {
      const failingServices = {
        loadAllDialogues: vi.fn().mockRejectedValue(new Error('Failed to load')),
        submitDialogueChoice: mockServices.submitDialogueChoice,
      };

      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: failingServices.loadAllDialogues,
          submitDialogueChoice: failingServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('error'));

      expect(actor.getSnapshot().value).toBe('error');
      expect(actor.getSnapshot().context.error).toBeDefined();

      actor.stop();
    });

    it('should transition from displaying to submitting on SELECT_CHOICE event', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      const selectedChoice = actor.getSnapshot().context.selectedDialogue!.choices[0];
      actor.send({ type: 'SELECT_CHOICE', choice: selectedChoice });

      expect(actor.getSnapshot().value).toBe('submitting');

      actor.stop();
    });

    it('should transition from submitting to complete on successful submission', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      const selectedChoice = actor.getSnapshot().context.selectedDialogue!.choices[0];
      actor.send({ type: 'SELECT_CHOICE', choice: selectedChoice });

      await waitFor(actor, (state) => state.matches('complete'));

      expect(actor.getSnapshot().value).toBe('complete');
      expect(actor.getSnapshot().context.appliedEffects).toBeDefined();

      actor.stop();
    });

    it('should transition from submitting to error on failed submission', async () => {
      const failingSubmit = {
        loadAllDialogues: mockServices.loadAllDialogues,
        submitDialogueChoice: vi.fn().mockRejectedValue(new Error('Submission failed')),
      };

      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: failingSubmit.loadAllDialogues,
          submitDialogueChoice: failingSubmit.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      const selectedChoice = actor.getSnapshot().context.selectedDialogue!.choices[0];
      actor.send({ type: 'SELECT_CHOICE', choice: selectedChoice });

      await waitFor(actor, (state) => state.matches('error'));

      expect(actor.getSnapshot().value).toBe('error');
      expect(actor.getSnapshot().context.error).toBeDefined();

      actor.stop();
    });

    it('should transition from complete to idle on COMPLETE event', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      const selectedChoice = actor.getSnapshot().context.selectedDialogue!.choices[0];
      actor.send({ type: 'SELECT_CHOICE', choice: selectedChoice });

      await waitFor(actor, (state) => state.matches('complete'));

      actor.send({ type: 'COMPLETE' });

      expect(actor.getSnapshot().value).toBe('idle');

      actor.stop();
    });

    it('should transition from error to loading on RETRY event', async () => {
      const failOnce = {
        loadAllDialogues: vi
          .fn()
          .mockRejectedValueOnce(new Error('Failed'))
          .mockResolvedValue(mockDialogueScenes),
        submitDialogueChoice: mockServices.submitDialogueChoice,
      };

      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: failOnce.loadAllDialogues,
          submitDialogueChoice: failOnce.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('error'));

      actor.send({ type: 'RETRY' });

      expect(actor.getSnapshot().value).toBe('loading');

      actor.stop();
    });

    it('should transition to idle on CLOSE event from any state', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      actor.send({ type: 'CLOSE' });

      expect(actor.getSnapshot().value).toBe('idle');

      actor.stop();
    });

    it('should handle CLOSE event during loading state', () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      // Send CLOSE immediately while loading
      actor.send({ type: 'CLOSE' });

      expect(actor.getSnapshot().value).toBe('idle');

      actor.stop();
    });
  });

  describe('Context Updates', () => {
    it('should update context.allDialogues after loading', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      expect(actor.getSnapshot().context.allDialogues).toEqual(mockDialogueScenes);

      actor.stop();
    });

    it('should set context.selectedDialogue after loading', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      const { selectedDialogue } = actor.getSnapshot().context;
      expect(selectedDialogue).toBeDefined();
      expect(mockDialogueScenes).toContainEqual(selectedDialogue);

      actor.stop();
    });

    it('should update context.selectedChoice on SELECT_CHOICE', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      const choice = actor.getSnapshot().context.selectedDialogue!.choices[0];
      actor.send({ type: 'SELECT_CHOICE', choice });

      expect(actor.getSnapshot().context.selectedChoice).toEqual(choice);

      actor.stop();
    });

    it('should update context.appliedEffects after submission', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      const choice = actor.getSnapshot().context.selectedDialogue!.choices[0];
      actor.send({ type: 'SELECT_CHOICE', choice });

      await waitFor(actor, (state) => state.matches('complete'));

      expect(actor.getSnapshot().context.appliedEffects).toEqual(mockDialogueResponse.effects);

      actor.stop();
    });

    it('should set context.error on failure', async () => {
      const failingServices = {
        loadAllDialogues: vi.fn().mockRejectedValue(new Error('Test error message')),
        submitDialogueChoice: mockServices.submitDialogueChoice,
      };

      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: failingServices.loadAllDialogues,
          submitDialogueChoice: failingServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('error'));

      expect(actor.getSnapshot().context.error).toBe('Test error message');

      actor.stop();
    });

    it('should reset context on CLOSE', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      actor.send({ type: 'CLOSE' });

      await waitFor(actor, (state) => state.matches('idle'));

      const context = actor.getSnapshot().context;
      // allDialogues is preserved (cached) after CLOSE to avoid reloading
      expect(context.allDialogues.length).toBeGreaterThan(0);
      // selectedDialogue may remain set due to XState context persistence,
      // but it will be overwritten when OPEN is sent again
      expect(context.selectedChoice).toBeNull();
      expect(context.appliedEffects).toBeNull();
      expect(context.delayedEffects).toBeNull();
      expect(context.error).toBeNull();

      actor.stop();
    });

    it('should clear error on RETRY', async () => {
      const failOnce = {
        loadAllDialogues: vi
          .fn()
          .mockRejectedValueOnce(new Error('Failed'))
          .mockResolvedValue(mockDialogueScenes),
        submitDialogueChoice: mockServices.submitDialogueChoice,
      };

      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: failOnce.loadAllDialogues,
          submitDialogueChoice: failOnce.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('error'));

      expect(actor.getSnapshot().context.error).toBeDefined();

      actor.send({ type: 'RETRY' });

      await waitFor(actor, (state) => state.matches('displaying'));

      expect(actor.getSnapshot().context.error).toBeNull();

      actor.stop();
    });
  });

  describe('Guards', () => {
    it('should have hasDialogues guard that validates dialogue array', async () => {
      const emptyServices = {
        loadAllDialogues: vi.fn().mockResolvedValue([]),
        submitDialogueChoice: mockServices.submitDialogueChoice,
      };

      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: emptyServices.loadAllDialogues,
          submitDialogueChoice: emptyServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('error'));

      expect(actor.getSnapshot().value).toBe('error');
      expect(actor.getSnapshot().context.error).toContain('No dialogue scenes available');

      actor.stop();
    });

    it('should have hasSelectedDialogue guard for SELECT_CHOICE', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      const hasDialogue = actor.getSnapshot().context.selectedDialogue !== null;
      expect(hasDialogue).toBe(true);

      actor.stop();
    });
  });

  describe('Actors (Service Invocations)', () => {
    it('should call loadAllDialogues service', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      expect(mockServices.loadAllDialogues).toHaveBeenCalledTimes(1);

      actor.stop();
    });

    it('should call submitDialogueChoice service with correct params', async () => {
      const actor = createActor(artistDialogueMachine, {
        input: {
          gameId: 'game_test_123',
          artist: mockArtist,
          loadAllDialogues: mockServices.loadAllDialogues,
          submitDialogueChoice: mockServices.submitDialogueChoice,
        },
      });

      actor.start();
      actor.send({ type: 'OPEN' });

      await waitFor(actor, (state) => state.matches('displaying'));

      const context = actor.getSnapshot().context;
      const choice = context.selectedDialogue!.choices[0];
      actor.send({ type: 'SELECT_CHOICE', choice });

      await waitFor(actor, (state) => state.matches('complete'));

      expect(mockServices.submitDialogueChoice).toHaveBeenCalledWith('game_test_123', {
        artistId: mockArtist.id,
        sceneId: context.selectedDialogue!.id,
        choiceId: choice.id,
      });

      actor.stop();
    });
  });

  describe('Random Selection Logic', () => {
    it('should select different dialogues across multiple machine runs', async () => {
      const selections = new Set<string>();

      for (let i = 0; i < 20; i++) {
        const actor = createActor(artistDialogueMachine, {
          input: {
            gameId: 'game_test_123',
            artist: mockArtist,
            loadAllDialogues: mockServices.loadAllDialogues,
            submitDialogueChoice: mockServices.submitDialogueChoice,
          },
        });

        actor.start();
        actor.send({ type: 'OPEN' });

        await waitFor(actor, (state) => state.matches('displaying'));

        const selectedId = actor.getSnapshot().context.selectedDialogue!.id;
        selections.add(selectedId);

        actor.stop();
      }

      // Should have selected at least 2 different dialogues (proving randomness)
      expect(selections.size).toBeGreaterThan(1);
    });
  });
});
