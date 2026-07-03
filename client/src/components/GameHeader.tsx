import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useGameContext } from '@/contexts/GameContext';
import { fetchExecutives, fetchRoleMeetings } from '@/services/executiveService';
import {
  prepareAutoSelectOptions,
  selectTopOptions,
  optionToActionData,
} from '@/services/executiveAutoSelect';
import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { getWeekDateRange } from '@shared/utils/seasonalCalculations';
import { Coins, ChevronsRight, Zap } from 'lucide-react';

/**
 * GameHeader — slim right-aligned v2 page header (Design System v2 §7).
 *
 * Rendered on every GameLayout page above the page content. The left side of the
 * header row is owned by each page (eyebrow / title); this component only carries
 * the global vitals: balance chip, week + date range, and the Advance Week action
 * (migrated from the old GameSidebar).
 */
export function GameHeader() {
  const { gameState, selectedActions, isAdvancingWeek, advanceWeek, selectAction } =
    useGameStore();
  const { gameId } = useGameContext();
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);

  if (!gameState) {
    return null;
  }

  const freeFocusSlots =
    (gameState.focusSlots || 3) - (gameState.usedFocusSlots || 0);

  // AUTO focus-slot filler (shared service; formerly in the dock's More menu)
  const handleAutoSelect = async () => {
    if (!gameId || isAutoSelecting) return;

    setIsAutoSelecting(true);
    try {
      logger.debug('[HEADER AUTO] Starting auto-selection...');

      const executives = await fetchExecutives(gameId);
      const roles = ['ceo', 'head_ar', 'cmo', 'cco', 'head_distribution'];
      const meetingsByRole: Record<string, any[]> = {};
      const currentWeek = gameState.currentWeek || 1;

      for (const role of roles) {
        try {
          meetingsByRole[role] = await fetchRoleMeetings(role, gameId, currentWeek);
        } catch (error) {
          meetingsByRole[role] = [];
        }
      }

      const options = prepareAutoSelectOptions(executives, meetingsByRole);
      const topOptions = selectTopOptions(options, freeFocusSlots);

      for (const option of topOptions) {
        const actionData = optionToActionData(option);
        await selectAction(JSON.stringify(actionData));
      }

      logger.debug(`[HEADER AUTO] Selected ${topOptions.length} actions`);

      if (topOptions.length > 0) {
        toast({
          title: 'Auto-select complete',
          description: `Selected ${topOptions.length} meeting${topOptions.length !== 1 ? 's' : ''} for executives who need attention.`,
          duration: 3000,
        });
      } else {
        toast({
          title: 'No meetings available',
          description:
            'All eligible executives have been assigned or no meetings are available.',
          variant: 'default',
          duration: 3000,
        });
      }
    } catch (error) {
      logger.error('[HEADER AUTO] Error:', error);
      toast({
        title: 'Auto-select failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to auto-select executive meetings. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsAutoSelecting(false);
    }
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

  return (
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
            disabled={isAutoSelecting}
            title={`Smart-fills ${freeFocusSlots} slot${freeFocusSlots !== 1 ? 's' : ''} with executives who need attention`}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-button bg-gradient-to-br from-action-pink to-action-purple px-4 py-1.5 text-[13px] font-semibold text-white shadow-action transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 right-3.5 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
            />
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            {isAutoSelecting ? 'Auto-selecting…' : 'AUTO'}
          </button>
        )}
        <button
          type="button"
          onClick={handleAdvanceWeek}
          disabled={selectedActions.length === 0 || isAdvancingWeek}
          className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-button bg-gradient-to-br from-action-pink to-action-purple px-4 py-1.5 text-[13px] font-semibold text-white shadow-action transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 right-3.5 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
          />
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
  );
}
