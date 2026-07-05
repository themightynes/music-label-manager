import React from 'react';
import { useLocation } from 'wouter';
import { useGameStore } from '@/store/gameStore';
import { useGameState } from '@/hooks/useGameState';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { getWeekDateRange } from '@shared/utils/seasonalCalculations';
import { Coins, ChevronsRight, Zap } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { WeekTransition } from '@/components/WeekTransition';

/**
 * GameHeader — slim right-aligned v2 page header (Design System v2 §7).
 *
 * Rendered on every GameLayout page above the page content. The left side of the
 * header row is owned by each page (eyebrow / title); this component only carries
 * the global vitals: balance chip, week + date range, and the Advance Week action
 * (migrated from the old GameSidebar).
 */
export function GameHeader() {
  const gameState = useGameState();
  const { selectedActions, isAdvancingWeek, advanceWeek } = useGameStore();
  const pendingAutoSelectIntent = useGameStore((s) => s.pendingAutoSelectIntent);
  const setPendingAutoSelectIntent = useGameStore(
    (s) => s.setPendingAutoSelectIntent,
  );
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();

  if (!gameState) {
    return null;
  }

  const freeFocusSlots =
    (gameState.focusSlots || 3) - (gameState.usedFocusSlots || 0);

  /**
   * C74: route the header AUTO button through the SAME propose-then-confirm review
   * gate the Executive Suite's AUTO button uses (Option A). The old direct
   * fetch/score/COMMIT path here was removed — it bypassed the review panel.
   *
   * The machine that owns the review flow only lives inside ExecutiveMeetings (the
   * Executive Suite page). Since the header is global, we set a session-scoped
   * intent flag and navigate to /executives; ExecutiveMeetings consumes the intent
   * exactly once when its machine is idle, sending AUTO_SELECT. If the player is
   * already on the Executive Suite, the flag is still consumed on the next effect
   * pass, so the button works from that route too. The button is disabled while
   * the intent is already pending and while there are no free focus slots.
   */
  const handleAutoSelect = () => {
    if (freeFocusSlots <= 0 || pendingAutoSelectIntent) return;
    logger.debug('[HEADER AUTO] Routing to Executive Suite review gate...');
    setPendingAutoSelectIntent(true);
    setLocation('/executives');
  };

  const week = gameState.currentWeek || 1;
  const startYear =
    (gameState as any)?.musicLabel?.foundedYear || new Date().getFullYear();
  const { start, end } = getWeekDateRange(startYear, week);
  const formatDay = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dateRange = `${formatDay(start)} – ${formatDay(end)}, ${end.getFullYear()}`;

  const handleAdvanceWeek = async () => {
    try {
      await advanceWeek();
    } catch (error) {
      logger.error('Failed to advance week:', error);
      toast({
        title: 'Failed to advance week',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while advancing the week. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // Charging treatment while the advance is in flight (Phase 4 PR-4).
  // Reduced motion keeps the plain "Processing…" text with no shimmer/pulse.
  const isCharging = isAdvancingWeek && !prefersReducedMotion;

  return (
    <>
    <header
      aria-label="Label vitals"
      className="flex flex-wrap items-center justify-end gap-4"
    >
      {/* Week number + date range — leftmost of the vitals group */}
      <div className="text-right">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-label">
          Week {week}
        </div>
        <div className="mt-0.5 text-[13px] text-text-body">{dateRange}</div>
      </div>

      {/* Actions — AUTO stacked on Advance Week, identical treatment */}
      <div className="flex w-[180px] flex-col gap-1.5">
        {freeFocusSlots > 0 && (
          <button
            type="button"
            onClick={handleAutoSelect}
            disabled={pendingAutoSelectIntent}
            title={`Review an AUTO fill for ${freeFocusSlots} slot${freeFocusSlots !== 1 ? 's' : ''} in the Executive Suite`}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-button bg-gradient-to-br from-action-pink to-action-purple px-4 py-1.5 text-[13px] font-semibold text-white shadow-action transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 right-3.5 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
            />
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            {pendingAutoSelectIntent ? 'Opening…' : 'AUTO'}
          </button>
        )}
        <button
          type="button"
          onClick={handleAdvanceWeek}
          disabled={selectedActions.length === 0 || isAdvancingWeek}
          className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-button bg-gradient-to-br from-action-pink to-action-purple px-4 py-1.5 text-[13px] font-semibold text-white shadow-action transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50${
            isCharging ? ' animate-pulse [animation-duration:1.6s]' : ''
          }`}
          // Charging: lift the disabled dim + add a soft glow so the pulse reads
          // as energy, not a dead button. Inline style so it deterministically
          // wins over the disabled:opacity-50 utility.
          style={
            isCharging
              ? {
                  opacity: 0.95,
                  boxShadow: '0 0 18px rgba(255, 77, 141, 0.45)',
                }
              : undefined
          }
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 right-3.5 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
          />
          {/* charging shimmer sweep while the week advance is in flight */}
          {isCharging && (
            <span
              aria-hidden="true"
              data-testid="advance-week-charging"
              className="animate-ds-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent bg-[length:200%_100%] [animation-duration:1.2s]"
            />
          )}
          {isAdvancingWeek ? 'Processing…' : 'Advance Week'}
          <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Balance chip — rightmost */}
      <div
        className="relative flex items-center gap-3 overflow-hidden rounded-button border border-white/[0.09] px-4 py-2.5"
        style={{
          background:
            'linear-gradient(135deg, rgba(160,90,240,0.16), rgba(47,143,255,0.1))',
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 right-3 top-0 h-px"
          style={{ background: 'var(--ds-hairline)' }}
        />
        <Coins className="h-4 w-4 text-money opacity-75" aria-hidden="true" />
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-label">
            Balance
          </div>
          <div className="mt-px font-mono text-[17px] font-semibold text-money">
            ${(gameState.money || 0).toLocaleString()}
          </div>
        </div>
      </div>
    </header>

    {/* Week-transition interstitial — purely visual, never gates data flow */}
    <WeekTransition isAdvancing={isAdvancingWeek} />
    </>
  );
}
