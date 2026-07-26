/**
 * C75 — the CC affordability gate must account for choices ALREADY QUEUED this
 * week, not just the raw current CC. Pre-fix repro: with 2 CC, queue a 2-CC
 * meeting, open a second meeting — its 2-CC choice still passed the gate
 * (DialogueInterface got the raw CC), and the engine's Math.max(0, …) clamp
 * silently absorbed the overdraw at advance.
 *
 * ExecutiveMeetings now prices each queued action ({ roleId, actionId,
 * choiceId }) against the prefetched weekly meeting pools (the same sit-out/
 * urgency prefetch — zero new requests) and passes
 * `max(0, creativeCapital - committed)` to DialogueInterface AND to the
 * machine via SYNC_SLOTS (AUTO's budget).
 *
 * Pattern-matched on executive-meetings-auto-intent.test.tsx: machine + data
 * deps mocked, DialogueInterface stubbed to capture props.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';

// --- machine control -------------------------------------------------------
const mockSend = vi.fn();
const baseContext = {
  focusSlotsUsed: 1,
  focusSlotsTotal: 4,
  executives: [] as any[],
  error: null,
  selectedExecutive: { id: 'exec-cco', role: 'cco', level: 1, mood: 50, loyalty: 50 },
  availableMeetings: [],
  autoOptions: [],
  currentDialogue: { prompt: 'A second meeting.', choices: [] },
  selectedMeeting: null,
  selectedArtistId: null,
  impactPreview: { immediate: {}, delayed: {}, selectedChoices: [] },
};
let machineState: any = {
  matches: (s: string) => s === 'inDialogue',
  context: { ...baseContext },
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

// The prefetch pools: the cmo pool carries the ALREADY-QUEUED meeting whose
// chosen dialogue choice costs 2 CC (immediate); other roles sit out.
const cmoPool = [
  {
    id: 'cmo_priorities',
    prompt: 'Marketing priorities',
    target_scope: 'global',
    choices: [
      { id: 'cmo_free', label: 'Hold budget', effects_immediate: {}, effects_delayed: {} },
      {
        id: 'cmo_costly',
        label: 'Big swing',
        effects_immediate: { creative_capital: -2, money: -1000 },
        effects_delayed: {},
      },
    ],
  },
];
vi.mock('../../client/src/services/executiveService', () => ({
  fetchRoleMeetings: vi.fn(async (roleId: string) => (roleId === 'cmo' ? cmoPool : [])),
  fetchMeetingDialogue: vi.fn(async () => ({ prompt: 'p', choices: [] })),
  fetchAllRoles: vi.fn(async () => []),
}));

// Child components stubbed; DialogueInterface captures its props so we can
// assert the availableCreativeCapital it was handed on each render.
vi.mock('../../client/src/components/executive-meetings/ExecutiveCard', () => ({
  ExecutiveCard: () => null,
  roleConfig: {},
  meetingDisplayName: (m: any) => m?.id ?? '',
  meetingPreviewSnippet: () => '',
}));
vi.mock('../../client/src/components/executive-meetings/MeetingSelector', () => ({
  MeetingSelector: () => null,
}));
const dialogueRenders: any[] = [];
vi.mock('../../client/src/components/executive-meetings/DialogueInterface', () => ({
  DialogueInterface: (props: any) => {
    dialogueRenders.push(props);
    return null;
  },
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
  consumePendingAutoSelectIntent: vi.fn(),
};
vi.mock('../../client/src/store/gameStore', () => ({
  useGameStore: (selector?: (s: any) => any) =>
    selector ? selector(storeState) : storeState,
}));

import { ExecutiveMeetings } from '../../client/src/components/executive-meetings/ExecutiveMeetings';

const QUEUED_CMO_ACTION = JSON.stringify({
  roleId: 'cmo',
  actionId: 'cmo_priorities',
  choiceId: 'cmo_costly',
  executiveId: 'exec-cmo',
});

function renderMeetings(creativeCapital: number) {
  return render(
    <ExecutiveMeetings
      gameId="game-1"
      currentWeek={5}
      onActionSelected={vi.fn()}
      focusSlots={{ total: 4, used: 1 }}
      creativeCapital={creativeCapital}
    />,
  );
}

const lastDialogueProps = () => dialogueRenders[dialogueRenders.length - 1];
const lastSyncSlots = () => {
  const calls = mockSend.mock.calls.filter(([e]) => e?.type === 'SYNC_SLOTS');
  return calls[calls.length - 1]?.[0];
};

describe('ExecutiveMeetings — remaining-CC gate for same-week queued choices (C75)', () => {
  beforeEach(() => {
    mockSend.mockClear();
    dialogueRenders.length = 0;
    storeState.selectedActions = [];
    machineState = {
      matches: (s: string) => s === 'inDialogue',
      context: { ...baseContext },
    };
  });
  afterEach(() => cleanup());

  it('a queued 2-CC choice reduces the CC the SECOND dialogue is gated against', async () => {
    storeState.selectedActions = [QUEUED_CMO_ACTION];
    renderMeetings(2);

    // Once the pool prefetch lands, the queued cmo_costly choice (2 CC) is
    // priced in: 2 raw − 2 committed → the second meeting sees 0 CC, so its
    // own 2-CC choices fail the gate instead of double-spending.
    await waitFor(() => {
      expect(lastDialogueProps().availableCreativeCapital).toBe(0);
    });
  });

  it('partial commitment: 3 raw CC minus a queued 2-CC choice leaves 1', async () => {
    storeState.selectedActions = [QUEUED_CMO_ACTION];
    renderMeetings(3);

    await waitFor(() => {
      expect(lastDialogueProps().availableCreativeCapital).toBe(1);
    });
  });

  it('SYNC_SLOTS threads the SAME remaining CC to the machine (AUTO budget)', async () => {
    storeState.selectedActions = [QUEUED_CMO_ACTION];
    renderMeetings(3);

    await waitFor(() => {
      expect(lastSyncSlots()?.creativeCapital).toBe(1);
    });
  });

  it('no queued actions → raw CC passes through unchanged', async () => {
    renderMeetings(2);

    await waitFor(() => {
      // Prefetch settled (pools stored) and nothing was subtracted.
      expect(lastDialogueProps().availableCreativeCapital).toBe(2);
      expect(lastSyncSlots()?.creativeCapital).toBe(2);
    });
    // It never dipped below the raw value at any render.
    expect(dialogueRenders.every((p) => p.availableCreativeCapital === 2)).toBe(true);
  });

  it('an unresolvable queued action (unknown meeting) prices at 0 — fail open, no phantom gate', async () => {
    storeState.selectedActions = [
      JSON.stringify({ roleId: 'cmo', actionId: 'gone_meeting', choiceId: 'nope' }),
      'not-even-json',
    ];
    renderMeetings(2);

    await waitFor(() => {
      expect(lastDialogueProps().availableCreativeCapital).toBe(2);
    });
  });

  it('remaining CC floors at 0 (queued commitments exceeding raw CC never go negative)', async () => {
    storeState.selectedActions = [QUEUED_CMO_ACTION];
    renderMeetings(1);

    await waitFor(() => {
      expect(lastDialogueProps().availableCreativeCapital).toBe(0);
    });
  });
});
