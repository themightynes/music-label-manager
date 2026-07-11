import React from 'react';
import { TrendingUp, Minus } from 'lucide-react';
import { anticipationMomentum } from '@/lib/releaseBuzz';
import type { GameChange } from '@shared/types/gameTypes';

/**
 * Hype-board UX arc, Task 2 — weekly "Anticipation building" readout.
 *
 * Renders ONE 'pre_campaign' WeekSummary entry (the engine emits one per
 * building release per week, with structured releaseName / weeksToLaunch /
 * amount fields — buzz-v2 slice 3). Replaces the raw description line with a
 * momentum readout: release name, a direction arrow, a qualitative band word
 * from the week's applied gain, and the launch countdown.
 *
 * Fork E standing rule: strictly qualitative — the entry's raw awareness gain
 * (`change.amount`) is NEVER rendered; only the derived direction + word are.
 * Routing note: 'pre_campaign' entries land in the hypeRoutine bucket
 * (categorizeChanges.ts), which WeekSummary DOES render — never the
 * never-rendered `other` bucket (this repo's recurring swallow-bug class).
 */
export function AnticipationLine({ change }: { change: GameChange }) {
  const momentum = anticipationMomentum((change as any).amount);
  const releaseName = (change as any).releaseName as string | undefined;
  const weeksToLaunch = (change as any).weeksToLaunch as number | undefined;
  const Icon = momentum.direction === 'up' ? TrendingUp : Minus;

  // Fall back to the engine's player-ready description if the structured
  // fields are missing (tolerant-parse convention, mirrors categorizeChanges).
  if (!releaseName) {
    return (
      <div
        data-testid="anticipation-line"
        className="p-3 rounded-[12px] border border-white/10 bg-surface-inner/40"
      >
        <span className="text-sm font-medium text-white/80">{change.description}</span>
      </div>
    );
  }

  return (
    <div
      data-testid="anticipation-line"
      className="flex items-center gap-3 p-3 rounded-[12px] border border-neon-cyan/20 bg-surface-inner/40"
    >
      <Icon
        aria-label={momentum.direction === 'up' ? 'anticipation rising' : 'anticipation holding'}
        className={`h-4 w-4 shrink-0 ${momentum.direction === 'up' ? 'text-neon-cyan' : 'text-text-muted'}`}
      />
      <div className="min-w-0">
        <span className="text-sm font-medium text-white/80">
          “{releaseName}” — anticipation {momentum.word}
        </span>
        {typeof weeksToLaunch === 'number' && (
          <span className="ml-2 text-xs text-text-muted whitespace-nowrap">
            {weeksToLaunch} week{weeksToLaunch === 1 ? '' : 's'} to launch
          </span>
        )}
      </div>
    </div>
  );
}
