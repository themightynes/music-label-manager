/**
 * CC affordability gate (playtest bug, 2026-07-05): a meeting choice whose
 * Creative Capital cost exceeds the player's available CC must be DISABLED
 * with an explanatory note — previously it was selectable at 0 CC and the
 * engine's Math.max(0, …) clamp silently erased the cost (free lunch).
 * Absent prop = no gating (legacy behavior for other render sites).
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// The decorative motion primitives reference React APIs that break under the
// test DOM and are irrelevant to the gate — stub them out.
vi.mock('../../client/src/components/motion-primitives/border-trail', () => ({
  BorderTrail: () => null,
}));
vi.mock('../../client/src/components/motion-primitives/glow-effect', () => ({
  GlowEffect: () => null,
}));

import { DialogueInterface } from '../../client/src/components/executive-meetings/DialogueInterface';
import type { DialogueChoice } from '../../shared/types/gameTypes';

afterEach(() => cleanup());

const ccChoice: DialogueChoice = {
  id: 'creative_reset',
  label: 'Creative reset',
  effects_immediate: { creative_capital: -2, money: -1500 },
  effects_delayed: { artist_mood: 4 },
} as DialogueChoice;

const freeChoice: DialogueChoice = {
  id: 'push_through',
  label: 'Push through',
  effects_immediate: {},
  effects_delayed: { artist_mood: -3 },
} as DialogueChoice;

function renderDialogue(availableCreativeCapital?: number, choices: DialogueChoice[] = [ccChoice, freeChoice]) {
  return render(
    <DialogueInterface
      dialogue={{ prompt: 'A tense meeting.', choices }}
      onSelectChoice={vi.fn()}
      onBack={vi.fn()}
      availableCreativeCapital={availableCreativeCapital}
    />
  );
}

describe('DialogueInterface — CC affordability gate', () => {
  it('disables a CC-costing choice at 0 CC and shows the gate note', () => {
    renderDialogue(0);
    expect(screen.getByTestId('cc-gate-creative_reset')).toHaveTextContent(
      'Needs 2 Creative Capital — you have 0'
    );
    // Console redesign: takes render side by side; the gated one reads "Locked"
    // and is disabled, the free one stays a live "Choose".
    const locked = screen.getByRole('button', { name: 'Locked' }) as HTMLButtonElement;
    expect(locked.disabled).toBe(true);
    const choose = screen.getByRole('button', { name: 'Choose' }) as HTMLButtonElement;
    expect(choose.disabled).toBe(false);
  });

  it('does not gate an affordable CC choice', () => {
    renderDialogue(5);
    expect(screen.queryByTestId('cc-gate-creative_reset')).toBeNull();
    const buttons = screen.getAllByRole('button', { name: 'Choose' });
    expect(buttons.every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('exactly-affordable is allowed (cost === available)', () => {
    renderDialogue(2);
    expect(screen.queryByTestId('cc-gate-creative_reset')).toBeNull();
  });

  it('absent prop = legacy behavior, nothing gated (other render sites unchanged)', () => {
    renderDialogue(undefined);
    expect(screen.queryByTestId('cc-gate-creative_reset')).toBeNull();
    const buttons = screen.getAllByRole('button', { name: 'Choose' });
    expect(buttons.every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
  });
});
