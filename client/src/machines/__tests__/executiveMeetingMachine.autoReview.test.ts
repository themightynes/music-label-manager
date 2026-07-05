/**
 * Meeting-relevance PR-3 (AUTO Option A: propose-then-confirm).
 *
 * AUTO used to commit its picks the moment it computed them. It now computes them
 * into `autoOptions` and parks in the `reviewingAutoSelections` state — a review
 * gate. These tests drive the machine actor with mock services and assert:
 *   - AUTO_SELECT lands in `reviewingAutoSelections` and commits NOTHING yet.
 *   - CONFIRM_AUTO_SELECT commits exactly the proposed picks (one onActionSelected
 *     call per option) and returns to idle.
 *   - CANCEL_AUTO_SELECT commits nothing and drops the proposal (no leaked state).
 *   - OVERRIDE_AUTO_ROW drops the proposal and enters the manual flow
 *     (selectingMeeting / loadingMeetings) for that exec.
 *
 * The AUTO SELECTION LOGIC (executiveAutoSelect.ts) is untouched — these tests
 * only exercise the new review gate around it.
 */
import { describe, it, expect, vi } from 'vitest';
import { createActor } from 'xstate';
import { executiveMeetingMachine } from '../executiveMeetingMachine';
import type { Executive, RoleMeeting } from '../../../../shared/types/gameTypes';

function makeMeeting(id: string): RoleMeeting {
  return {
    id,
    prompt: `Prompt for ${id}`,
    target_scope: 'global',
    choices: [
      { id: `${id}_c1`, label: 'Safe choice', effects_immediate: { reputation: 2 }, effects_delayed: {} },
      { id: `${id}_c2`, label: 'Gamble', effects_immediate: { rep_swing: 5 }, effects_delayed: {} },
    ],
  } as any;
}

const cmoExec: Executive = { id: 'e-cmo', role: 'cmo', level: 1, mood: 20, loyalty: 30 } as any;
const ccoExec: Executive = { id: 'e-cco', role: 'cco', level: 1, mood: 40, loyalty: 40 } as any;
const arExec: Executive = { id: 'e-ar', role: 'head_ar', level: 1, mood: 10, loyalty: 20 } as any;

function waitForState(actor: ReturnType<typeof createActor>, matcher: string): Promise<void> {
  return new Promise((resolve) => {
    // Resolve immediately if already in the target state (send() is synchronous,
    // so a CONFIRM/CANCEL transition may have landed before we subscribe).
    if ((actor.getSnapshot() as any).matches(matcher)) {
      resolve();
      return;
    }
    const sub = actor.subscribe((state) => {
      if (state.matches(matcher)) {
        sub.unsubscribe();
        resolve();
      }
    });
  });
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

function buildActor(executives: Executive[], opts: { arOfficeSlotUsed?: boolean } = {}) {
  const onActionSelected = vi.fn();
  const fetchRoleMeetings = vi.fn(async (role: string) => [makeMeeting(`${role}_meeting`)]);
  const actor = createActor(executiveMeetingMachine, {
    input: {
      gameId: 'g1',
      currentWeek: 5,
      focusSlotsTotal: 3,
      creativeCapital: 100,
      arOfficeSlotUsed: opts.arOfficeSlotUsed,
      onActionSelected,
      fetchExecutives: async () => executives,
      fetchRoleMeetings,
      fetchMeetingDialogue: async () => ({ prompt: 'p', choices: [] }),
    },
  });
  actor.start();
  return { actor, onActionSelected, fetchRoleMeetings };
}

describe('executiveMeetingMachine — AUTO propose-then-confirm (PR-3)', () => {
  it('AUTO_SELECT computes picks into review WITHOUT committing them', async () => {
    const { actor, onActionSelected } = buildActor([cmoExec, ccoExec]);
    await waitForExecutives(actor);

    actor.send({ type: 'AUTO_SELECT' });
    await waitForState(actor, 'reviewingAutoSelections');

    const { autoOptions } = actor.getSnapshot().context;
    expect(autoOptions.length).toBe(2);
    // Not committed yet — the review gate must not have called onActionSelected.
    expect(onActionSelected).not.toHaveBeenCalled();
    // AUTO's safest-choice logic is unchanged: it picks the gamble-free choice.
    expect(autoOptions.every((o) => o.choice.id.endsWith('_c1'))).toBe(true);
  });

  it('CONFIRM_AUTO_SELECT commits exactly the proposed picks and returns to idle', async () => {
    const { actor, onActionSelected } = buildActor([cmoExec, ccoExec]);
    await waitForExecutives(actor);

    actor.send({ type: 'AUTO_SELECT' });
    await waitForState(actor, 'reviewingAutoSelections');
    const proposed = actor.getSnapshot().context.autoOptions;

    actor.send({ type: 'CONFIRM_AUTO_SELECT' });
    await waitForState(actor, 'idle');

    // One commit per proposed option, and each commit carries that option's actionData.
    expect(onActionSelected).toHaveBeenCalledTimes(proposed.length);
    const committed = onActionSelected.mock.calls.map(([s]) => JSON.parse(s as string));
    for (const option of proposed) {
      expect(committed).toContainEqual(option.actionData);
    }
    // Proposal cleared after commit.
    expect(actor.getSnapshot().context.autoOptions).toEqual([]);
  });

  it('CANCEL_AUTO_SELECT commits nothing and drops the proposal', async () => {
    const { actor, onActionSelected } = buildActor([cmoExec, ccoExec]);
    await waitForExecutives(actor);

    actor.send({ type: 'AUTO_SELECT' });
    await waitForState(actor, 'reviewingAutoSelections');
    expect(actor.getSnapshot().context.autoOptions.length).toBeGreaterThan(0);

    actor.send({ type: 'CANCEL_AUTO_SELECT' });
    await waitForState(actor, 'idle');

    expect(onActionSelected).not.toHaveBeenCalled();
    expect(actor.getSnapshot().context.autoOptions).toEqual([]);
    // No focus slots leaked, no selection state left behind.
    expect(actor.getSnapshot().context.selectedExecutive).toBeNull();
  });

  it('AR-busy: AUTO proposal EXCLUDES head_ar when arOfficeSlotUsed is set in context', async () => {
    // Playtest bug: AUTO grabbed Marcus (head_ar) while the A&R office slot was in
    // use. The flag reaches the machine via input (SYNC_SLOTS in the live app).
    const { actor, onActionSelected } = buildActor([cmoExec, arExec], { arOfficeSlotUsed: true });
    await waitForExecutives(actor);

    actor.send({ type: 'AUTO_SELECT' });
    await waitForState(actor, 'reviewingAutoSelections');

    const { autoOptions } = actor.getSnapshot().context;
    expect(autoOptions.some((o) => o.executive.role === 'head_ar')).toBe(false);
    // The non-busy exec is still proposed.
    expect(autoOptions.some((o) => o.executive.role === 'cmo')).toBe(true);
    expect(onActionSelected).not.toHaveBeenCalled();
  });

  it('AR-free: AUTO proposal INCLUDES head_ar when the flag is absent (default behavior)', async () => {
    const { actor } = buildActor([cmoExec, arExec]);
    await waitForExecutives(actor);

    actor.send({ type: 'AUTO_SELECT' });
    await waitForState(actor, 'reviewingAutoSelections');

    const { autoOptions } = actor.getSnapshot().context;
    expect(autoOptions.some((o) => o.executive.role === 'head_ar')).toBe(true);
  });

  it('OVERRIDE_AUTO_ROW drops the proposal and enters the manual flow for that exec', async () => {
    const { actor, onActionSelected } = buildActor([cmoExec, ccoExec]);
    await waitForExecutives(actor);

    actor.send({ type: 'AUTO_SELECT' });
    await waitForState(actor, 'reviewingAutoSelections');

    actor.send({ type: 'OVERRIDE_AUTO_ROW', executive: cmoExec });
    await waitForState(actor, 'selectingMeeting');

    const ctx = actor.getSnapshot().context;
    // Now in the normal manual meeting flow for the overridden exec.
    expect(ctx.selectedExecutive?.role).toBe('cmo');
    expect(ctx.availableMeetings.length).toBeGreaterThan(0);
    // The proposal is gone (no partial AUTO state leaking into the manual flow)
    // and still nothing has been committed.
    expect(ctx.autoOptions).toEqual([]);
    expect(onActionSelected).not.toHaveBeenCalled();
  });
});
