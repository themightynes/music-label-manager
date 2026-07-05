/**
 * LEGIBILITY Slice A — SelectionSummary tooltip-wiring test.
 *
 * SelectionSummary's Impact Preview renders the aggregated immediate/delayed
 * effect badges. This asserts each rendered badge is wrapped in the explanation
 * tooltip (data-effect-key + aria-label carrying the channel copy), following the
 * repo convention of asserting reachable trigger attributes rather than driving
 * Radix's portaled content.
 *
 * The component reads game state via useGameStore/useGameState (the Phase 3.5
 * façade); both are mocked to the minimum the render path needs.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// SelectionSummary.tsx relies on the automatic JSX runtime (it doesn't import
// React). When this module is compiled under the classic transform in the test
// pipeline, `React` must be resolvable at module scope — expose it globally so
// the component renders in isolation. (Harmless no-op if already global.)
(globalThis as any).React = React;

vi.mock('@/store/gameStore', () => ({
  useGameStore: () => ({ cancelAROfficeOperation: vi.fn() }),
}));

vi.mock('@/hooks/useGameState', () => ({
  useGameState: () => ({ focusSlots: 3, usedFocusSlots: 1, arOfficeSlotUsed: false }),
}));

// @hello-pangea/dnd reads a global React; stub the drag-drop primitives to plain
// pass-throughs so the render doesn't depend on DnD internals (irrelevant to the
// Impact Preview badges under test).
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <>{children}</>,
  Droppable: ({ children }: any) =>
    children({ droppableProps: {}, innerRef: () => {}, placeholder: null }, {}),
  Draggable: ({ children }: any) =>
    children({ draggableProps: {}, dragHandleProps: {}, innerRef: () => {} }, {}),
}));

import { SelectionSummary } from '../SelectionSummary';

describe('SelectionSummary Impact Preview — effect tooltips', () => {
  const impactPreview = {
    immediate: { money: -1500, reputation: 1 },
    delayed: { awareness_boost: 2, press_momentum: 1 },
    selectedChoices: [],
  };

  const selectedActions = [
    '{"roleId":"cmo","actionId":"cmo_pr_angle","choiceId":"safe"}',
  ];

  it('wraps immediate and delayed preview badges in explanation tooltips', () => {
    render(
      <SelectionSummary
        selectedActions={selectedActions}
        onRemoveAction={vi.fn()}
        onReorderActions={vi.fn()}
        onAdvanceWeek={vi.fn()}
        isAdvancing={false}
        impactPreview={impactPreview}
      />
    );

    // Immediate channel.
    const moneyTrigger = document.querySelector('[data-effect-key="money"]');
    expect(moneyTrigger).not.toBeNull();
    expect(moneyTrigger?.getAttribute('aria-label')).toContain('Money');

    // Delayed channels each get their own explanation trigger.
    const buzzTrigger = document.querySelector('[data-effect-key="awareness_boost"]');
    expect(buzzTrigger).not.toBeNull();
    expect(buzzTrigger?.getAttribute('aria-label')).toContain('release');

    const pressTrigger = document.querySelector('[data-effect-key="press_momentum"]');
    expect(pressTrigger).not.toBeNull();
    expect(pressTrigger?.getAttribute('aria-label')).toContain('press');
  });
});
