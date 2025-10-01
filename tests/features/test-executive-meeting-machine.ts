import { createActor } from 'xstate';
import { executiveMeetingMachine } from '../../client/src/machines/executiveMeetingMachine';
import type { Executive, RoleMeeting, DialogueChoice } from '../../shared/types/gameTypes';

async function tick(ms = 0): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function testExecutiveMeetingMachine() {
  console.log('🧪 Testing executiveMeetingMachine flow');

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

  const actionQueue: string[] = [];

  const actor = createActor(executiveMeetingMachine, {
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
  await tick();

  if (!actor.getSnapshot().matches('idle')) {
    throw new Error('Expected machine to be idle after loading executives');
  }

  actor.send({ type: 'SYNC_SLOTS', used: 0, total: 2 });
  actor.send({ type: 'SELECT_EXECUTIVE', executive: executives[1] });
  await tick();

  if (!actor.getSnapshot().matches('selectingMeeting')) {
    throw new Error('Expected selectingMeeting state after selecting executive');
  }

  const availableMeetings = actor.getSnapshot().context.availableMeetings;
  if (!availableMeetings.length) {
    throw new Error('Expected available meetings to be cached');
  }

  actor.send({ type: 'SELECT_MEETING', meeting: availableMeetings[0] });
  await tick();

  if (!actor.getSnapshot().matches('inDialogue')) {
    throw new Error('Expected inDialogue state after selecting meeting');
  }

  const dialogue = actor.getSnapshot().context.currentDialogue;
  if (!dialogue || !dialogue.choices.length) {
    throw new Error('Dialogue choices not available');
  }

  actor.send({ type: 'SELECT_CHOICE', choice: dialogue.choices[0] });
  await tick(20);

  if (!actionQueue.length) {
    throw new Error('Expected queued executive action after selecting choice');
  }

  const actionPayload = JSON.parse(actionQueue[0]);
  actor.send({ type: 'CALCULATE_IMPACT_PREVIEW', selectedActions: [JSON.stringify(actionPayload)] });
  await tick(20);

  const preview = actor.getSnapshot().context.impactPreview;
  if (preview.selectedChoices.length !== 1) {
    throw new Error('Impact preview did not capture selected choice');
  }

  actor.stop();

  console.log('✅ executiveMeetingMachine flow test passed');
  console.log({
    queuedActions: actionQueue,
    impactPreview: preview,
  });
}

testExecutiveMeetingMachine().catch((error) => {
  console.error('❌ executiveMeetingMachine test failed', error);
  process.exitCode = 1;
});
