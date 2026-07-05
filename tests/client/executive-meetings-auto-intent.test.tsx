/**
 * C74 — ExecutiveMeetings consumes the header AUTO intent exactly once.
 *
 * The global GameHeader AUTO button sets `pendingAutoSelectIntent` and navigates
 * to the Executive Suite. ExecutiveMeetings (which owns the review machine) must:
 *   - when its machine is IDLE and the intent is pending: send AUTO_SELECT and
 *     clear the intent (exactly once — no double-fire on re-render);
 *   - when the machine is NOT idle: leave the intent pending (consume later);
 *   - when there are no free slots: clear the intent but do NOT send AUTO_SELECT.
 *
 * The XState machine + all data deps are mocked so only the consume effect runs.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// --- machine control -------------------------------------------------------
const mockSend = vi.fn();
let machineState: any = {
  matches: (s: string) => s === 'idle',
  context: {
    focusSlotsUsed: 0,
    focusSlotsTotal: 3,
    executives: [] as any[],
    error: null,
    selectedExecutive: null,
    availableMeetings: [],
    autoOptions: [],
    currentDialogue: null,
    selectedMeeting: null,
    selectedArtistId: null,
    impactPreview: { immediate: {}, delayed: {}, selectedChoices: [] },
  },
};
vi.mock('@xstate/react', () => ({
  useMachine: () => [machineState, mockSend],
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({}),
}));

vi.mock('../../client/src/hooks/useExecutives', () => ({
  makeCachedFetchExecutives: () => vi.fn(),
}));

vi.mock('../../client/src/hooks/useArtists', () => ({
  useArtists: () => ({ data: [] }),
}));

vi.mock('../../client/src/services/executiveService', () => ({
  fetchRoleMeetings: vi.fn(async () => []),
  fetchMeetingDialogue: vi.fn(async () => ({ prompt: 'p', choices: [] })),
  fetchAllRoles: vi.fn(async () => []),
}));

// Child components stubbed so we only exercise the container's effects.
vi.mock('../../client/src/components/executive-meetings/ExecutiveCard', () => ({
  ExecutiveCard: () => null,
}));
vi.mock('../../client/src/components/executive-meetings/MeetingSelector', () => ({
  MeetingSelector: () => null,
}));
vi.mock('../../client/src/components/executive-meetings/DialogueInterface', () => ({
  DialogueInterface: () => null,
}));
vi.mock('../../client/src/components/executive-meetings/AutoSelectReviewPanel', () => ({
  AutoSelectReviewPanel: () => null,
}));

// --- store control ---------------------------------------------------------
const storeState = {
  getAROfficeStatus: () => ({
    arOfficeSlotUsed: false,
    arOfficeSourcingType: null,
    arOfficeOperationStart: null,
  }),
  selectedActions: [] as string[],
  pendingAutoSelectIntent: false,
  consumePendingAutoSelectIntent: vi.fn(() => {
    storeState.pendingAutoSelectIntent = false;
  }),
};
vi.mock('../../client/src/store/gameStore', () => ({
  useGameStore: (selector?: (s: any) => any) =>
    selector ? selector(storeState) : storeState,
}));

import { ExecutiveMeetings } from '../../client/src/components/executive-meetings/ExecutiveMeetings';

function renderMeetings() {
  return render(
    <ExecutiveMeetings
      gameId="game-1"
      currentWeek={5}
      onActionSelected={vi.fn()}
      focusSlots={{ total: 3, used: 0 }}
      creativeCapital={100}
    />,
  );
}

describe('ExecutiveMeetings — consumes header AUTO intent (C74)', () => {
  beforeEach(() => {
    mockSend.mockClear();
    storeState.consumePendingAutoSelectIntent.mockClear();
    storeState.pendingAutoSelectIntent = false;
    machineState = {
      matches: (s: string) => s === 'idle',
      context: { ...machineState.context, focusSlotsUsed: 0, focusSlotsTotal: 3 },
    };
  });
  afterEach(() => cleanup());

  const autoSelectCalls = () =>
    mockSend.mock.calls.filter(([e]) => e?.type === 'AUTO_SELECT');

  it('idle + intent pending → sends AUTO_SELECT once and clears the intent', () => {
    storeState.pendingAutoSelectIntent = true;
    const { rerender } = renderMeetings();

    expect(autoSelectCalls().length).toBe(1);
    expect(storeState.consumePendingAutoSelectIntent).toHaveBeenCalledTimes(1);

    // Re-render must not double-fire (intent was already cleared).
    rerender(
      <ExecutiveMeetings
        gameId="game-1"
        currentWeek={5}
        onActionSelected={vi.fn()}
        focusSlots={{ total: 3, used: 0 }}
        creativeCapital={100}
      />,
    );
    expect(autoSelectCalls().length).toBe(1);
  });

  it('NOT idle + intent pending → leaves the intent pending (no AUTO_SELECT, no clear)', () => {
    machineState = {
      matches: (s: string) => s === 'reviewingAutoSelections',
      context: { ...machineState.context },
    };
    storeState.pendingAutoSelectIntent = true;
    renderMeetings();

    expect(autoSelectCalls().length).toBe(0);
    expect(storeState.consumePendingAutoSelectIntent).not.toHaveBeenCalled();
    expect(storeState.pendingAutoSelectIntent).toBe(true);
  });

  it('idle + intent pending but NO free slots → clears the intent WITHOUT sending AUTO_SELECT', () => {
    machineState = {
      matches: (s: string) => s === 'idle',
      context: { ...machineState.context, focusSlotsUsed: 3, focusSlotsTotal: 3 },
    };
    storeState.pendingAutoSelectIntent = true;
    renderMeetings();

    expect(autoSelectCalls().length).toBe(0);
    expect(storeState.consumePendingAutoSelectIntent).toHaveBeenCalledTimes(1);
  });

  it('no intent → never sends AUTO_SELECT on its own', () => {
    storeState.pendingAutoSelectIntent = false;
    renderMeetings();
    expect(autoSelectCalls().length).toBe(0);
  });
});
