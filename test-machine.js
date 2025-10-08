import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { artistDialogueMachine } from './client/src/machines/artistDialogueMachine.js';

const mockDialogueScenes = [
  {
    id: 'dialogue_test_1',
    prompt: 'Test prompt',
    choices: [
      { id: 'c1', label: 'Choice 1', effects_immediate: {}, effects_delayed: {} },
    ],
  },
];

const mockServices = {
  loadAllDialogues: vi.fn().mockResolvedValue(mockDialogueScenes),
  submitDialogueChoice: vi.fn().mockResolvedValue({}),
};

const actor = createActor(artistDialogueMachine, {
  input: {
    gameId: 'test',
    artist: { id: 'a1', name: 'Test' },
    loadAllDialogues: mockServices.loadAllDialogues,
    submitDialogueChoice: mockServices.submitDialogueChoice,
  },
});

actor.start();
actor.send({ type: 'OPEN' });

setTimeout(() => {
  console.log('State:', actor.getSnapshot().value);
  console.log('Dialogues:', actor.getSnapshot().context.allDialogues);
  actor.stop();
}, 100);
