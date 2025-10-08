import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createActor } from 'xstate';
import { executiveMeetingMachine } from '../../client/src/machines/executiveMeetingMachine';
import type { Executive, RoleMeeting, DialogueChoice } from '../../shared/types/gameTypes';

describe('Executive Meeting State Machine', () => {
  let actor: ReturnType<typeof createActor<typeof executiveMeetingMachine>>;
  let actionQueue: string[];

  const executives: Executive[] = [
    { id: 'ceo', role: 'ceo', mood: 50, loyalty: 50 },
    { id: 'head_ar', role: 'head_ar', mood: 30, loyalty: 40 },
  ];

  const meetings: Record<string, RoleMeeting[]> = {
    head_ar: [
      {
        id: 'artist_support',
        prompt: 'Discuss scouting opportunities',
        choices: [
          {
            id: 'invest_budget',
            label: 'Allocate additional scouting budget',
            effects_immediate: { money: -5000, reputation: 2 },
            effects_delayed: { scouting: 3 },
          } as DialogueChoice,
        ],
      },
    ],
    ceo: [
      {
        id: 'vision_review',
        prompt: 'Set company vision',
        choices: [
          {
            id: 'double_down',
            label: 'Double down on artist development',
            effects_immediate: { reputation: 3 },
            effects_delayed: { morale: 2 },
          } as DialogueChoice,
        ],
      },
    ],
  } as Record<string, RoleMeeting[]>;

  beforeEach(() => {
    actionQueue = [];

    actor = createActor(executiveMeetingMachine, {
      input: {
        gameId: 'test-game',
        focusSlotsTotal: 2,
        onActionSelected: (action) => actionQueue.push(action),
        fetchExecutives: async () => executives,
        fetchRoleMeetings: async (roleId) => meetings[roleId] ?? [],
        fetchMeetingDialogue: async (roleId, meetingId) => {
          const meeting = meetings[roleId]?.find((m) => m.id === meetingId);
          if (!meeting) {
            throw new Error('Meeting not found');
          }
          return {
            prompt: meeting.prompt,
            choices: meeting.choices ?? [],
          };
        },
      },
    });

    actor.start();
  });

  afterEach(() => {
    if (actor) {
      actor.stop();
    }
  });

  it('should start in idle state after loading executives', async () => {
    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('idle')).toBe(true);
    });
  });

  it('should transition to selectingMeeting after selecting executive', async () => {
    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'SELECT_EXECUTIVE', executive: executives[1] });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('selectingMeeting')).toBe(true);
    });
  });

  it('should load available meetings when executive is selected', async () => {
    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'SELECT_EXECUTIVE', executive: executives[1] });

    await vi.waitFor(() => {
      const availableMeetings = actor.getSnapshot().context.availableMeetings;
      expect(availableMeetings.length).toBeGreaterThan(0);
    });
  });

  it('should transition to inDialogue after selecting meeting', async () => {
    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'SELECT_EXECUTIVE', executive: executives[1] });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('selectingMeeting')).toBe(true);
    });

    const availableMeetings = actor.getSnapshot().context.availableMeetings;
    actor.send({ type: 'SELECT_MEETING', meeting: availableMeetings[0] });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('inDialogue')).toBe(true);
    });
  });

  it('should load dialogue choices when meeting is selected', async () => {
    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'SELECT_EXECUTIVE', executive: executives[1] });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('selectingMeeting')).toBe(true);
    });

    const availableMeetings = actor.getSnapshot().context.availableMeetings;
    actor.send({ type: 'SELECT_MEETING', meeting: availableMeetings[0] });

    await vi.waitFor(() => {
      const dialogue = actor.getSnapshot().context.currentDialogue;
      expect(dialogue).toBeDefined();
      expect(dialogue?.choices.length).toBeGreaterThan(0);
    });
  });

  it('should queue action when dialogue choice is selected', async () => {
    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'SELECT_EXECUTIVE', executive: executives[1] });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('selectingMeeting')).toBe(true);
    });

    const availableMeetings = actor.getSnapshot().context.availableMeetings;
    actor.send({ type: 'SELECT_MEETING', meeting: availableMeetings[0] });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('inDialogue')).toBe(true);
    });

    const dialogue = actor.getSnapshot().context.currentDialogue;
    actor.send({ type: 'SELECT_CHOICE', choice: dialogue!.choices[0] });

    await vi.waitFor(() => {
      expect(actionQueue.length).toBeGreaterThan(0);
    });
  });

  it('should calculate impact preview with selected actions', async () => {
    actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
    actor.send({ type: 'SELECT_EXECUTIVE', executive: executives[1] });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('selectingMeeting')).toBe(true);
    });

    const availableMeetings = actor.getSnapshot().context.availableMeetings;
    actor.send({ type: 'SELECT_MEETING', meeting: availableMeetings[0] });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('inDialogue')).toBe(true);
    });

    const dialogue = actor.getSnapshot().context.currentDialogue;
    actor.send({ type: 'SELECT_CHOICE', choice: dialogue!.choices[0] });

    await vi.waitFor(() => {
      expect(actionQueue.length).toBeGreaterThan(0);
    });

    const actionPayload = JSON.parse(actionQueue[0]);
    actor.send({ type: 'CALCULATE_IMPACT_PREVIEW', selectedActions: [JSON.stringify(actionPayload)] });

    await vi.waitFor(() => {
      const preview = actor.getSnapshot().context.impactPreview;
      expect(preview.selectedChoices.length).toBe(1);
    });
  });
});
