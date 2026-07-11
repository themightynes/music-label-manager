/**
 * useCrisisSideEvent — Mandatory Side Events ("Crisis on the Desk") derivation.
 *
 * The slot-occupation and advance-gate math threads through the whole
 * action-selection UI, so it is pinned here at the source. Mocks the three
 * inputs the hook composes: the kill-switch, the spine's pending flag, and the
 * store's picked resolution.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockConfig, mockGameState, mockStorePick } = vi.hoisted(() => ({
  mockConfig: vi.fn(),
  mockGameState: vi.fn(),
  mockStorePick: vi.fn(),
}));

vi.mock('@/hooks/useSideEventsConfig', () => ({
  useSideEventsConfig: () => mockConfig(),
}));
vi.mock('@/hooks/useGameState', () => ({
  useGameState: (selector?: (gs: unknown) => unknown) => {
    const gs = mockGameState();
    return selector ? selector(gs) : gs;
  },
}));
vi.mock('@/store/gameStore', () => ({
  useGameStore: (selector?: (s: unknown) => unknown) => {
    const state = { pendingSideEventChoice: mockStorePick() };
    return selector ? selector(state) : state;
  },
}));

import { useCrisisSideEvent } from '../useCrisisSideEvent';

const CRISIS = { eventId: 'sync_offer', week: 5, prompt: 'x', category: 'sync_licensing', choices: [] };

describe('useCrisisSideEvent', () => {
  beforeEach(() => {
    mockConfig.mockReturnValue({ mandatory: true });
    mockGameState.mockReturnValue({ flags: {} });
    mockStorePick.mockReturnValue(null);
  });

  it('no crisis: inert (no slot, no block) when nothing is pending', () => {
    const { result } = renderHook(() => useCrisisSideEvent());
    expect(result.current.crisisActive).toBe(false);
    expect(result.current.crisisSlotUsed).toBe(0);
    expect(result.current.blocksAdvance).toBe(false);
  });

  it('pending crisis, no pick: occupies a slot AND blocks the advance', () => {
    mockGameState.mockReturnValue({ flags: { pending_side_event: CRISIS } });
    const { result } = renderHook(() => useCrisisSideEvent());
    expect(result.current.crisisActive).toBe(true);
    expect(result.current.crisisSlotUsed).toBe(1);
    expect(result.current.blocksAdvance).toBe(true);
    expect(result.current.choicePicked).toBe(false);
  });

  it('pending crisis WITH a matching pick: still occupies the slot but no longer blocks', () => {
    mockGameState.mockReturnValue({ flags: { pending_side_event: CRISIS } });
    mockStorePick.mockReturnValue({ eventId: 'sync_offer', choiceId: 'take_deal' });
    const { result } = renderHook(() => useCrisisSideEvent());
    expect(result.current.crisisActive).toBe(true);
    expect(result.current.crisisSlotUsed).toBe(1);
    expect(result.current.choicePicked).toBe(true);
    expect(result.current.chosenChoiceId).toBe('take_deal');
    expect(result.current.blocksAdvance).toBe(false);
  });

  it('kill-switch OFF: a pending flag is ignored (legacy in-results path)', () => {
    mockConfig.mockReturnValue({ mandatory: false });
    mockGameState.mockReturnValue({ flags: { pending_side_event: CRISIS } });
    const { result } = renderHook(() => useCrisisSideEvent());
    expect(result.current.crisisActive).toBe(false);
    expect(result.current.crisisSlotUsed).toBe(0);
    expect(result.current.blocksAdvance).toBe(false);
  });

  it('a pick for a DIFFERENT event does not count as resolving the current crisis', () => {
    mockGameState.mockReturnValue({ flags: { pending_side_event: CRISIS } });
    mockStorePick.mockReturnValue({ eventId: 'other_event', choiceId: 'x' });
    const { result } = renderHook(() => useCrisisSideEvent());
    expect(result.current.choicePicked).toBe(false);
    expect(result.current.blocksAdvance).toBe(true);
  });
});
