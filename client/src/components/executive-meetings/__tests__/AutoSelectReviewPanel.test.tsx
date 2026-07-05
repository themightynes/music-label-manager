/**
 * Meeting-relevance PR-3 — AUTO Option A review panel.
 *
 * Renders `AutoSelectReviewPanel` directly with a mock proposal (mirrors the
 * DialogueInterface.badges pattern — no XState/Carousel tree). Verifies:
 *   - one row per proposed option, with meeting + choice + effect badges;
 *   - Confirm All fires exactly once (the machine commits the picks);
 *   - Override on a row fires with that row's executive (→ manual flow);
 *   - Cancel fires without committing;
 *   - CC / money cost surface from AUTO's own numbers;
 *   - effect badges reuse the same whitelist as the dialogue (dead keys drop).
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AutoSelectReviewPanel } from '../AutoSelectReviewPanel';
import type { Executive, RoleMeeting, DialogueChoice } from '../../../../../shared/types/gameTypes';

function exec(role: string): Executive {
  return { id: `e-${role}`, role, level: 1, mood: 50, loyalty: 50 } as any;
}

function meeting(id: string, name: string): RoleMeeting {
  return { id, name, prompt: `${name} prompt`, target_scope: 'global', choices: [] } as any;
}

function choice(overrides: Partial<DialogueChoice> = {}): DialogueChoice {
  return {
    id: 'c1',
    label: 'The safe move',
    effects_immediate: {},
    effects_delayed: {},
    ...overrides,
  } as DialogueChoice;
}

function makeOption(role: string, meetingName: string, choiceOverrides: Partial<DialogueChoice> = {}) {
  return {
    executive: exec(role),
    meeting: meeting(`${role}_m`, meetingName),
    choice: choice(choiceOverrides),
  };
}

describe('AutoSelectReviewPanel', () => {
  it('renders one row per proposed option with meeting name, choice, and effect badges', () => {
    const options = [
      makeOption('cmo', 'PR Angle', { label: 'Play it safe', effects_immediate: { reputation: 3 } }),
      makeOption('cco', 'Timeline Talk', { label: 'Ship it', effects_delayed: { quality_bonus: 5 } }),
    ];
    render(
      <AutoSelectReviewPanel
        options={options}
        onConfirmAll={vi.fn()}
        onCancel={vi.fn()}
        onOverrideRow={vi.fn()}
      />
    );

    const cmoRow = screen.getByTestId('auto-review-row-cmo');
    expect(within(cmoRow).getByText(/PR Angle/)).toBeInTheDocument();
    expect(within(cmoRow).getByText('Play it safe')).toBeInTheDocument();
    expect(within(cmoRow).getByText('+3 Rep')).toBeInTheDocument();

    const ccoRow = screen.getByTestId('auto-review-row-cco');
    expect(within(ccoRow).getByText(/Timeline Talk/)).toBeInTheDocument();
    expect(within(ccoRow).getByText('+5 Quality')).toBeInTheDocument();
  });

  it('filters dead effect keys the same way the dialogue does', () => {
    const options = [
      makeOption('cmo', 'PR Angle', {
        effects_immediate: { reputation: 2, sellthrough_hint: 9 },
      }),
    ];
    render(
      <AutoSelectReviewPanel options={options} onConfirmAll={vi.fn()} onCancel={vi.fn()} onOverrideRow={vi.fn()} />
    );

    expect(screen.getByText('+2 Rep')).toBeInTheDocument();
    expect(screen.queryByText(/Market Data/)).not.toBeInTheDocument();
  });

  it('surfaces Creative Capital cost and money delta from AUTO’s numbers', () => {
    const options = [
      makeOption('cco', 'Budget Crisis', {
        effects_immediate: { creative_capital: -3, money: -2000 },
      }),
    ];
    render(
      <AutoSelectReviewPanel options={options} onConfirmAll={vi.fn()} onCancel={vi.fn()} onOverrideRow={vi.fn()} />
    );

    const row = screen.getByTestId('auto-review-row-cco');
    // The cost row prefixes with "Cost:" — distinct from the "-3 Creative" badge.
    expect(within(row).getByText(/Cost:/)).toBeInTheDocument();
    expect(within(row).getByText(/\$2,000/)).toBeInTheDocument();
  });

  it('Confirm All commits the whole proposal exactly once', () => {
    const onConfirmAll = vi.fn();
    render(
      <AutoSelectReviewPanel
        options={[makeOption('cmo', 'PR Angle'), makeOption('cco', 'Timeline')]}
        onConfirmAll={onConfirmAll}
        onCancel={vi.fn()}
        onOverrideRow={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('auto-review-confirm'));
    expect(onConfirmAll).toHaveBeenCalledTimes(1);
  });

  it('Override on a row calls back with that row’s executive (→ manual flow)', () => {
    const onOverrideRow = vi.fn();
    render(
      <AutoSelectReviewPanel
        options={[makeOption('cmo', 'PR Angle'), makeOption('cco', 'Timeline')]}
        onConfirmAll={vi.fn()}
        onCancel={vi.fn()}
        onOverrideRow={onOverrideRow}
      />
    );

    fireEvent.click(screen.getByTestId('auto-review-override-cco'));
    expect(onOverrideRow).toHaveBeenCalledTimes(1);
    expect(onOverrideRow.mock.calls[0][0].role).toBe('cco');
  });

  it('Cancel fires without committing anything', () => {
    const onCancel = vi.fn();
    const onConfirmAll = vi.fn();
    render(
      <AutoSelectReviewPanel
        options={[makeOption('cmo', 'PR Angle')]}
        onConfirmAll={onConfirmAll}
        onCancel={onCancel}
        onOverrideRow={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('auto-review-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirmAll).not.toHaveBeenCalled();
  });

  it('renders nothing when the proposal is empty', () => {
    const { container } = render(
      <AutoSelectReviewPanel options={[]} onConfirmAll={vi.fn()} onCancel={vi.fn()} onOverrideRow={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
