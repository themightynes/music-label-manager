/**
 * useGameState façade-flip render-timing test (Phase 3.5 PR-5).
 *
 * PR-5 flips the READ side of `useGameState()` off the Zustand `gameState` copy
 * and onto the TanStack Query cache at `gameStateQueryKey(gameId)`. The whole
 * risk of the phase lives in one property: after the store does its SYNCHRONOUS
 * focus-slot math (`selectAction` etc.) and commits via the dual-write funnel,
 * a rendered component reading `useGameState()` must see the new value on the
 * NEXT RENDER — same-tick, no waiting — exactly as the old Zustand subscription
 * delivered. XState `SYNC_SLOTS`, `SelectionSummary`, and the CommandDock AUTO
 * filler all depend on this (plan §0.6, §6).
 *
 * This test renders a REAL component through `useGameState()`, uses the REAL
 * `queryClient` singleton (the same one the store's `commitGameState` funnel
 * writes to) in a `QueryClientProvider`, fires a real store action, and asserts
 * the re-rendered value WITHOUT `waitFor`/`findBy` — proving `setQueryData`
 * notifies the `useQuery` subscriber synchronously.
 *
 * It also proves client-committed-record semantics: a simulated window `focus`
 * event does NOT trigger a refetch that could clobber the optimistic slot math.
 * The queryFn is wired to throw so any refetch attempt would surface loudly.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock apiRequest so a stray refetch can't hit the network; the queryFn wraps
// it, so this doubles as a tripwire if the record key ever tries to refetch.
const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(async () => {
    throw new Error('useGameState queryFn should never fetch (client-committed record)');
  }),
}));
vi.mock('@/lib/queryClient', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return {
    apiRequest: apiRequestMock,
    queryClient: new QueryClient({
      defaultOptions: {
        // Mirror the app defaults that PR-5 must OVERRIDE per-key: a 60s
        // staleTime + focus refetch. If the hook forgot the overrides, a focus
        // event would refetch and this test's tripwire queryFn would throw.
        queries: {
          staleTime: 60_000,
          refetchOnWindowFocus: true,
          retry: false,
        },
      },
    }),
  };
});
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useGameState, gameStateQueryKey } from '@/hooks/useGameState';
import { useGameStore } from '@/store/gameStore';
import { baseGameState, resetGameStore as resetGameStoreImpl } from './gameStore-harness';

const resetGameStore = () => resetGameStoreImpl(useGameStore);

// A minimal real consumer of the façade — renders the focus-slot count that the
// exec suite / selection summary read every render.
function SlotProbe() {
  const usedFocusSlots = useGameState((gs) => gs?.usedFocusSlots ?? null);
  const money = useGameState((gs) => gs?.money ?? null);
  return (
    <div>
      <span data-testid="slots">{String(usedFocusSlots)}</span>
      <span data-testid="money">{String(money)}</span>
    </div>
  );
}

function renderProbe() {
  return render(
    <QueryClientProvider client={queryClient}>
      <SlotProbe />
    </QueryClientProvider>,
  );
}

/** Seed both sources exactly as a real load would: Zustand id pointer + cache record. */
function seedGame(gs: ReturnType<typeof baseGameState>) {
  useGameStore.setState({ gameState: gs, selectedActions: [] });
  queryClient.setQueryData(gameStateQueryKey(gs.id), gs);
}

beforeEach(() => {
  apiRequestMock.mockClear();
  queryClient.clear();
  resetGameStore();
});

afterEach(() => {
  queryClient.clear();
});

describe('useGameState PR-5 flip: reads from the query cache', () => {
  it('returns null before any game loads (no undefined-flash)', () => {
    renderProbe();
    expect(screen.getByTestId('slots').textContent).toBe('null');
    expect(screen.getByTestId('money').textContent).toBe('null');
  });

  it('reads the seeded record from the cache', () => {
    seedGame(baseGameState({ id: 'game-1', usedFocusSlots: 1, money: 42000 }));
    renderProbe();
    expect(screen.getByTestId('slots').textContent).toBe('1');
    expect(screen.getByTestId('money').textContent).toBe('42000');
  });
});

describe('useGameState PR-5 flip: SAME-TICK slot math visibility', () => {
  it('a component sees selectAction\'s slot increment on the next render (no waitFor)', () => {
    seedGame(baseGameState({ id: 'game-1', focusSlots: 3, usedFocusSlots: 0, arOfficeSlotUsed: false }));
    renderProbe();
    expect(screen.getByTestId('slots').textContent).toBe('0');

    // Fire the real store action. selectAction does synchronous slot math and
    // commits via the dual-write funnel BEFORE its background syncSlotsPatch.
    act(() => {
      void useGameStore.getState().selectAction('{"roleId":"ceo","actionId":"a1","choiceId":"c1"}');
    });

    // Asserted synchronously — NO waitFor/findBy. setQueryData notified the
    // useQuery subscriber synchronously, so the new value is on this render.
    expect(screen.getByTestId('slots').textContent).toBe('1');
    // Phase 3.5 PR-6: the cache is the SINGLE owner of the record; Zustand keeps
    // only the `{ id }` session pointer.
    expect((queryClient.getQueryData(gameStateQueryKey('game-1')) as any).usedFocusSlots).toBe(1);
    expect(useGameStore.getState().gameState!.id).toBe('game-1');
  });

  it('sees removeAction\'s decrement on the next render', () => {
    seedGame(baseGameState({ id: 'game-1', focusSlots: 3, usedFocusSlots: 1, arOfficeSlotUsed: false }));
    useGameStore.setState({ selectedActions: ['action-A'] });
    renderProbe();
    expect(screen.getByTestId('slots').textContent).toBe('1');

    act(() => {
      void useGameStore.getState().removeAction('action-A');
    });

    expect(screen.getByTestId('slots').textContent).toBe('0');
  });
});

describe('useGameState PR-5 flip: client-committed-record semantics', () => {
  it('a window focus does NOT refetch/clobber the record (queryFn never fires)', () => {
    seedGame(baseGameState({ id: 'game-1', usedFocusSlots: 2 }));
    renderProbe();
    expect(screen.getByTestId('slots').textContent).toBe('2');

    // Simulate the focus event the app-default refetchOnWindowFocus reacts to.
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    // The tripwire queryFn (apiRequestMock throws) must NOT have been called,
    // and the value must be untouched.
    expect(apiRequestMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('slots').textContent).toBe('2');
  });
});
