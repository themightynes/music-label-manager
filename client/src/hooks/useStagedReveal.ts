import { useEffect, useRef, useState } from 'react';

/**
 * useStagedReveal (Phase 4 PR-3) — a dumb, testable timeline hook.
 *
 * Given a `stageCount` and per-stage delays, it walks a stage index from 0 up to
 * `stageCount - 1`, advancing after each delay. It exposes an imperative `skip()`
 * that instantly jumps to the final stage, and it renders fully-revealed
 * immediately when `instant` is true (reduced motion / skip toggle).
 *
 * Deliberately NOT an XState machine: it is a single `setTimeout` chain plus a
 * counter. Everything the WeekSummary reveal needs — "which groups are visible
 * right now" and "collapse to done on interaction" — is derivable from
 * `currentStage` and `skip()`.
 *
 * Timing contract: the total mandatory sequence is the sum of `stageDelays`
 * (capped by the caller); the reveal component keeps this under ~4s worst case.
 */
export interface UseStagedRevealOptions {
  /** Number of discrete reveal stages (>= 1). Stage indices run 0..stageCount-1. */
  stageCount: number;
  /**
   * Delay in ms BEFORE advancing to stage `i` (i.e. `stageDelays[i]` is the wait
   * that precedes revealing stage `i`). Length should be `stageCount`; index 0 is
   * the initial beat before the first stage. Missing entries default to 0.
   */
  stageDelays: number[];
  /**
   * When true, skip all staging and render the final stage immediately (reduced
   * motion or the manual skip toggle). Changing this to true mid-sequence
   * collapses instantly.
   */
  instant?: boolean;
}

export interface UseStagedRevealResult {
  /** The highest stage index currently revealed. All stages <= this are visible. */
  currentStage: number;
  /** True once the final stage has been reached. */
  isComplete: boolean;
  /** Collapse to the fully-revealed final state immediately. Idempotent. */
  skip: () => void;
}

export function useStagedReveal({
  stageCount,
  stageDelays,
  instant = false,
}: UseStagedRevealOptions): UseStagedRevealResult {
  const finalStage = Math.max(0, stageCount - 1);
  const [currentStage, setCurrentStage] = useState(() => (instant ? finalStage : 0));
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const skip = () => {
    clearAll();
    setCurrentStage(finalStage);
  };

  useEffect(() => {
    if (instant) {
      clearAll();
      setCurrentStage(finalStage);
      return;
    }

    // Reset to the first stage and schedule the rest as a cumulative timeline.
    clearAll();
    setCurrentStage(0);

    let cumulative = 0;
    for (let stage = 1; stage <= finalStage; stage++) {
      cumulative += stageDelays[stage] ?? 0;
      const id = setTimeout(() => {
        setCurrentStage((prev) => (stage > prev ? stage : prev));
      }, cumulative);
      timeoutsRef.current.push(id);
    }

    return clearAll;
    // stageDelays is treated as stable per-mount config; callers pass a constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant, finalStage]);

  return {
    currentStage,
    isComplete: currentStage >= finalStage,
    skip,
  };
}

export default useStagedReveal;
