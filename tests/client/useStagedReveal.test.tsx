/**
 * useStagedReveal hook tests (Phase 4 PR-3).
 *
 * The hook is a dumb setTimeout-driven counter; these assert its contract:
 * it walks the stage index up over time, `instant` renders the final stage
 * immediately, and `skip()` collapses to the final stage without waiting.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStagedReveal } from '@/hooks/useStagedReveal';

const OPTS = { stageCount: 4, stageDelays: [0, 100, 100, 100] };

describe('useStagedReveal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at stage 0 and walks up over time', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStagedReveal(OPTS));

    expect(result.current.currentStage).toBe(0);
    expect(result.current.isComplete).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.currentStage).toBe(1);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.currentStage).toBe(3);
    expect(result.current.isComplete).toBe(true);
  });

  it('instant renders the final stage immediately', () => {
    const { result } = renderHook(() => useStagedReveal({ ...OPTS, instant: true }));
    expect(result.current.currentStage).toBe(3);
    expect(result.current.isComplete).toBe(true);
  });

  it('skip() collapses to the final stage without waiting', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStagedReveal(OPTS));

    expect(result.current.currentStage).toBe(0);
    act(() => {
      result.current.skip();
    });
    expect(result.current.currentStage).toBe(3);
    expect(result.current.isComplete).toBe(true);
  });
});
