/**
 * Exec-meetings-revival PR-9 (C6/D) — client Impact Preview mood-modifier parity.
 *
 * The preview (executiveMeetingMachine.calculateImpactPreview) routes the SAME shared
 * util (shared/utils/executiveMoodModifier.ts) the engine routes through, so the
 * numbers a player previews are the numbers the week will produce. These tests drive
 * the machine actor with mock services and assert the preview equals the shared util's
 * output for the selected executive's mood — and that CEO (synthetic exec) is skipped.
 */
import { describe, it, expect, vi } from 'vitest';
import { createActor } from 'xstate';
import { executiveMeetingMachine } from '../executiveMeetingMachine';
import type { Executive, DialogueChoice } from '../../../../shared/types/gameTypes';
import {
  getMoodModifiers,
  applyMoodModifiersToEffects,
} from '@shared/utils/executiveMoodModifier';

function makeChoice(effects_immediate: Record<string, number>, effects_delayed: Record<string, number> = {}): DialogueChoice {
  return { id: 'choice_x', label: 'Do the thing', effects_immediate, effects_delayed } as any;
}

function waitForExecutives(actor: ReturnType<typeof createActor>): Promise<void> {
  return new Promise((resolve) => {
    const sub = actor.subscribe((state) => {
      if ((state.context.executives?.length ?? 0) > 0) {
        sub.unsubscribe();
        resolve();
      }
    });
  });
}

function waitForPreview(actor: ReturnType<typeof createActor>, selectedActions: string[]): Promise<any> {
  return new Promise((resolve) => {
    const sub = actor.subscribe((state) => {
      // The preview lands back in 'idle' after the fetchingImpactPreview actor resolves.
      const preview = state.context.impactPreview;
      if (preview.selectedChoices.length > 0) {
        sub.unsubscribe();
        resolve(preview);
      }
    });
    actor.send({ type: 'CALCULATE_IMPACT_PREVIEW', selectedActions });
  });
}

function buildActor(executives: Executive[], choice: DialogueChoice) {
  const fetchMeetingDialogue = vi.fn(async () => ({ prompt: 'p', choices: [choice] }));
  const actor = createActor(executiveMeetingMachine, {
    input: {
      gameId: 'g1',
      currentWeek: 5,
      focusSlotsTotal: 3,
      onActionSelected: () => {},
      fetchExecutives: async () => executives,
      fetchRoleMeetings: async () => [],
      fetchMeetingDialogue,
    },
  });
  actor.start();
  return { actor, fetchMeetingDialogue };
}

const disgruntledExec: Executive = { id: 'e-cmo', role: 'cmo', level: 1, mood: 20, loyalty: 50 } as any;
const inspiredExec: Executive = { id: 'e-cco', role: 'cco', level: 1, mood: 95, loyalty: 50 } as any;
const neutralExec: Executive = { id: 'e-ar', role: 'head_ar', level: 1, mood: 50, loyalty: 50 } as any;

describe('Impact Preview — mood modifier parity with the shared util', () => {
  it('disgruntled exec: preview scales the money COST ×1.25 (matches shared util)', async () => {
    const choice = makeChoice({ money: -1000, reputation: 5 });
    const { actor } = buildActor([disgruntledExec], choice);
    await waitForExecutives(actor);
    const action = JSON.stringify({ roleId: 'cmo', actionId: 'meeting_x', choiceId: 'choice_x' });
    const preview = await waitForPreview(actor, [action]);

    const expected = applyMoodModifiersToEffects({ money: -1000, reputation: 5 }, getMoodModifiers(20));
    expect(preview.immediate.money).toBe(expected.money); // -1250
    expect(preview.immediate.reputation).toBe(expected.reputation); // 5 (unscaled — disgruntled effectMult=1)
  });

  it('inspired exec: preview amplifies non-money magnitude ×1.20 and discounts cost ×0.90', async () => {
    const choice = makeChoice({ money: -1000, reputation: 5 }, { artist_popularity: -3 });
    const { actor } = buildActor([inspiredExec], choice);
    await waitForExecutives(actor);
    const action = JSON.stringify({ roleId: 'cco', actionId: 'meeting_x', choiceId: 'choice_x' });
    const preview = await waitForPreview(actor, [action]);

    const mods = getMoodModifiers(95);
    const expectedImmediate = applyMoodModifiersToEffects({ money: -1000, reputation: 5 }, mods);
    const expectedDelayed = applyMoodModifiersToEffects({ artist_popularity: -3 }, mods);
    expect(preview.immediate.money).toBe(expectedImmediate.money); // -900
    expect(preview.immediate.reputation).toBe(expectedImmediate.reputation); // 6
    expect(preview.delayed.artist_popularity).toBe(expectedDelayed.artist_popularity); // -4
  });

  it('neutral exec (mood 50): preview shows authored numbers unchanged', async () => {
    const choice = makeChoice({ money: -1000, reputation: 5 });
    const { actor } = buildActor([neutralExec], choice);
    await waitForExecutives(actor);
    const action = JSON.stringify({ roleId: 'head_ar', actionId: 'meeting_x', choiceId: 'choice_x' });
    const preview = await waitForPreview(actor, [action]);
    expect(preview.immediate.money).toBe(-1000);
    expect(preview.immediate.reputation).toBe(5);
  });

  it('CEO (synthetic exec, no row) is skipped — preview never scales', async () => {
    const choice = makeChoice({ money: -1000, reputation: 5 });
    // No 'ceo' entry in executives → find() returns undefined → no scaling.
    const { actor } = buildActor([inspiredExec], choice);
    await waitForExecutives(actor);
    const action = JSON.stringify({ roleId: 'ceo', actionId: 'meeting_x', choiceId: 'choice_x' });
    const preview = await waitForPreview(actor, [action]);
    expect(preview.immediate.money).toBe(-1000);
    expect(preview.immediate.reputation).toBe(5);
  });
});
