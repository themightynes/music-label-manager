import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { HoloDisc } from '@/components/ui/holo-disc';
import { useGameState } from '@/hooks/useGameState';

/** Minimum time the interstitial stays on screen so fast advances don't flash. */
export const WEEK_TRANSITION_MIN_MS = 700;
/** Safety net: force-dismiss if we are somehow still visible this long after the advance ended. */
export const WEEK_TRANSITION_SAFETY_MS = 10_000;

export interface WeekTransitionProps {
  /** Whether the week advance is currently in flight (store's `isAdvancingWeek`). */
  isAdvancing: boolean;
}

/**
 * WeekTransition — full-screen anticipation interstitial for the week advance
 * (Phase 4 PR-4, game-feel plan §3 row 4).
 *
 * Purely visual: it never gates, delays, or wraps any data flow. It appears
 * when `isAdvancing` flips true, holds for a minimum of
 * `WEEK_TRANSITION_MIN_MS` so fast server responses don't flash, and dismisses
 * as soon as BOTH the advance has completed AND the minimum has elapsed — it
 * never outlasts the advance by more than the minimum. The WeekSummary modal
 * may open beneath it; the overlay simply sits on top until its timer ends.
 *
 * `pointer-events: none` throughout — it can never trap focus or block the
 * app — plus a 10s auto-dismiss safety net in case a timer ever fails.
 *
 * Reduced motion: renders nothing at all.
 */
export function WeekTransition({ isAdvancing }: WeekTransitionProps) {
  const prefersReducedMotion = useReducedMotion();
  const currentWeek = useGameState((gs) => gs?.currentWeek ?? 1);

  const [visible, setVisible] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  // Latch the incoming week number when the transition starts so a mid-display
  // gameState commit doesn't flip the label.
  const targetWeekRef = useRef(currentWeek + 1);
  // The minimum-display timer must SURVIVE `isAdvancing` flipping back to
  // false (a fast server response), so it lives in a ref and is only cleared
  // on unmount / restart — not by this effect's re-run cleanup.
  const minTimerRef = useRef<number | null>(null);

  // Show + start the minimum-display clock when an advance begins.
  useEffect(() => {
    if (prefersReducedMotion || !isAdvancing) return;
    targetWeekRef.current = currentWeek + 1;
    setVisible(true);
    setMinElapsed(false);
    if (minTimerRef.current !== null) {
      window.clearTimeout(minTimerRef.current);
    }
    minTimerRef.current = window.setTimeout(
      () => setMinElapsed(true),
      WEEK_TRANSITION_MIN_MS,
    );
    // currentWeek intentionally read-latched, not a re-trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdvancing, prefersReducedMotion]);

  // Clear the minimum-display timer on unmount only.
  useEffect(() => {
    return () => {
      if (minTimerRef.current !== null) {
        window.clearTimeout(minTimerRef.current);
      }
    };
  }, []);

  // Dismiss as soon as the advance is done AND the minimum has elapsed.
  useEffect(() => {
    if (visible && !isAdvancing && minElapsed) {
      setVisible(false);
    }
  }, [visible, isAdvancing, minElapsed]);

  // Safety net: never linger more than 10s past the end of the advance.
  useEffect(() => {
    if (!visible || isAdvancing) return;
    const timer = window.setTimeout(
      () => setVisible(false),
      WEEK_TRANSITION_SAFETY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [visible, isAdvancing]);

  if (prefersReducedMotion || !visible) {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      data-testid="week-transition"
      className="pointer-events-none fixed inset-0 z-[120] flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm"
    >
      {/* holo-disc spinning up (fast spin = charging feel) */}
      <HoloDisc size={104} spinSeconds={1.6} grooves />

      <div className="text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-label">
          Advancing to
        </div>
        <div className="text-aberration mt-1 font-mono text-3xl font-semibold uppercase tracking-[0.2em] text-white">
          Week {targetWeekRef.current}
        </div>
      </div>

      {/* shimmer sweep — scoped fast variant of the v2 .shimmer-bar */}
      <div
        className="shimmer-bar w-56"
        style={{ animationDuration: '1.4s' }}
      />
    </div>,
    document.body,
  );
}

export default WeekTransition;
