import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createActor } from 'xstate';
import { executiveMeetingMachine } from '../../client/src/machines/executiveMeetingMachine';
import type { Executive, RoleMeeting, DialogueChoice } from '../../shared/types/gameTypes';

describe('Executive Meeting State Machine', () => {
  let actor: ReturnType<typeof createActor<typeof executiveMeetingMachine>>;
  let actionQueue: string[];

  const executives: Executive[] = [
    { id: 'ceo', role: 'ceo', level: 1, mood: 50, loyalty: 50 },
    { id: 'head_ar', role: 'head_ar', level: 1, mood: 30, loyalty: 40 },
  ];

  const defaultMeetings: Record<string, RoleMeeting[]> = {
    head_ar: [
      {
        id: 'artist_support',
        prompt: 'Discuss scouting opportunities',
        target_scope: 'global',
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
        target_scope: 'global',
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
  };

  const meetings: Record<string, RoleMeeting[]> = {
    head_ar: [],
    ceo: [],
  };

  beforeEach(() => {
    actionQueue = [];

    meetings.head_ar = JSON.parse(JSON.stringify(defaultMeetings.head_ar)) as RoleMeeting[];
    meetings.ceo = JSON.parse(JSON.stringify(defaultMeetings.ceo)) as RoleMeeting[];

    actor = createActor(executiveMeetingMachine, {
      input: {
        gameId: 'test-game',
        currentWeek: 1,
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

  it('should skip AUTO selection when only user-selected meetings are available', async () => {
    actor.stop();

    meetings.head_ar = [
      {
        id: 'user_choice_head_ar',
        prompt: 'Pick the lead single approach for {artistName}.',
        prompt_before_selection: 'Which artist are you supporting?',
        target_scope: 'user_selected',
        choices: [
          {
            id: 'option_a',
            label: 'Focus on streaming',
            effects_immediate: { reputation: 1 },
            effects_delayed: {},
          } as DialogueChoice,
        ],
      },
    ];

    meetings.ceo = [
      {
        id: 'user_choice_ceo',
        prompt: 'Which artist should we prioritize, {artistName}?',
        prompt_before_selection: 'Choose the artist to spotlight',
        target_scope: 'user_selected',
        choices: [
          {
            id: 'prioritize_artist',
            label: 'Prioritize their rollout',
            effects_immediate: { reputation: 2 },
            effects_delayed: {},
          } as DialogueChoice,
        ],
      },
    ];

    actionQueue = [];
    actor = createActor(executiveMeetingMachine, {
      input: {
        gameId: 'test-game',
        currentWeek: 1,
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

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('idle')).toBe(true);
    });

    actor.send({ type: 'AUTO_SELECT' });

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('idle')).toBe(true);
    });

    expect(actionQueue.length).toBe(0);
  });

  it('should select a non user-selected meeting when AUTO is used', async () => {
    actor.stop();

    meetings.head_ar = [
      {
        id: 'user_choice_head_ar',
        prompt: 'Pick the lead single approach for {artistName}.',
        prompt_before_selection: 'Which artist are you supporting?',
        target_scope: 'user_selected',
        choices: [
          {
            id: 'option_a',
            label: 'Focus on streaming',
            effects_immediate: { reputation: 1 },
            effects_delayed: {},
          } as DialogueChoice,
        ],
      },
      {
        id: 'global_followup',
        prompt: 'Discuss scouting pipeline upgrades',
        target_scope: 'global',
        choices: [
          {
            id: 'invest_pipeline',
            label: 'Invest in scouting pipeline',
            effects_immediate: { money: -2000 },
            effects_delayed: { scouting: 2 },
          } as DialogueChoice,
        ],
      },
    ];

    meetings.ceo = [];

    actionQueue = [];
    actor = createActor(executiveMeetingMachine, {
      input: {
        gameId: 'test-game',
        currentWeek: 1,
        focusSlotsTotal: 1,
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

    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches('idle')).toBe(true);
    });

    actor.send({ type: 'AUTO_SELECT' });

    await vi.waitFor(() => {
      expect(actionQueue.length).toBe(1);
    });

    const autoAction = JSON.parse(actionQueue[0]);
    expect(autoAction.actionId).toBe('global_followup');
    expect(autoAction.metadata?.targetScope).toBe('global');
    expect(autoAction.metadata?.selectedArtistId).toBeUndefined();
  });
});
