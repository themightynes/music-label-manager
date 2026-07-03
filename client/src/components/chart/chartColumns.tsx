import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, TrendingDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  formatChartMovement,
  formatChartPosition,
  formatWeeksOnChart,
  formatStreamCount,
  formatLastWeekPosition,
  getChartExitRisk,
  getChartPositionOrdinal,
  isPlayerSongHighlight
} from '@shared/utils/chartUtils';
import { cn } from '@/lib/utils';

import { ChartColumn, SortDirection } from './ChartDataTable';

// v2 restyle note: `getChartPositionColor` / `getMovementColor` / `getChartExitRiskBgColor` from
// shared/utils/chartUtils return legacy v1 utility classes (shared with other, out-of-scope
// consumers). This table no longer calls them — position/movement/risk styling is derived
// inline with v2 token classes (surface-inner, neon-lilac, positive/negative/warning) so the
// chart matches the neo-cyber HUD system without editing the shared util.

export interface ChartEntry {
  position: number;
  songId: string | null;
  songTitle: string;
  artistName: string;
  streams: number;
  movement: number;
  weeksOnChart: number;
  peakPosition: number | null;
  lastWeekPosition: number | null | undefined;
  isPlayerSong: boolean;
  isCompetitorSong: boolean;
  competitorTitle?: string;
  competitorArtist?: string;
  isDebut: boolean;
}

const headerButtonClasses =
  'flex w-full items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-label hover:text-text-accent transition-colors';

function SortIndicator({ direction }: { direction: SortDirection | null }) {
  if (direction === 'asc') {
    return <ArrowUp className="h-3 w-3 text-neon-lilac" />;
  }

  if (direction === 'desc') {
    return <ArrowDown className="h-3 w-3 text-neon-lilac" />;
  }

  return <ArrowUpDown className="h-3 w-3 text-text-label" />;
}

export const chartColumns: ChartColumn<ChartEntry>[] = [
  {
    id: 'position',
    sortable: true,
    sortAccessor: entry => entry.position,
    header: ({ direction, toggleSort }) => (
      <button
        type="button"
        className={cn(headerButtonClasses, 'justify-start')}
        onClick={toggleSort}
      >
        Pos
        <SortIndicator direction={direction} />
      </button>
    ),
    cell: entry => (
      <div className="flex items-center gap-3">
        {entry.position === 1 ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-money to-neon-amber font-mono text-sm font-bold text-[#3a2a0a] shadow-glow-money">
            1
          </div>
        ) : (
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-semibold',
              entry.position <= 10
                ? 'bg-neon-lilac/[0.14] text-neon-lilac shadow-glow-lilac'
                : 'bg-surface-inner text-text-body'
            )}
          >
            {entry.position}
          </div>
        )}
        <span className="hidden font-mono text-[11px] uppercase tracking-wide text-text-label xl:inline">
          {getChartPositionOrdinal(entry.position)}
        </span>
      </div>
    )
  },
  {
    id: 'songTitle',
    sortable: true,
    sortAccessor: entry => entry.songTitle.toLowerCase(),
    header: ({ direction, toggleSort }) => (
      <button
        type="button"
        className={cn(headerButtonClasses, 'justify-start')}
        onClick={toggleSort}
      >
        Song
        <SortIndicator direction={direction} />
      </button>
    ),
    cell: entry => {
      const isHighlighted = isPlayerSongHighlight(entry.isPlayerSong, entry.position);

      return (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-medium',
                isHighlighted ? 'text-text-primary' : 'text-text-body'
              )}
            >
              {entry.songTitle}
            </span>
            {entry.isDebut && (
              <Badge
                variant="secondary"
                className="rounded-chip border border-positive/40 bg-positive/[0.14] px-1 text-xs text-positive"
              >
                NEW
              </Badge>
            )}
            {isHighlighted && (
              <Badge
                variant="secondary"
                className="rounded-chip border border-neon-lilac/40 bg-neon-lilac/[0.14] px-1 text-xs text-neon-lilac"
              >
                YOURS
              </Badge>
            )}
          </div>
          <div className="text-xs text-text-muted">{entry.artistName}</div>
        </div>
      )
    }
  },
  {
    id: 'streams',
    sortable: true,
    sortAccessor: entry => entry.streams,
    header: ({ direction, toggleSort }) => (
      <button
        type="button"
        className={cn(headerButtonClasses, 'justify-end')}
        onClick={toggleSort}
      >
        Streams
        <SortIndicator direction={direction} />
      </button>
    ),
    cell: entry => (
      <div className="text-right text-xs font-mono text-text-body">
        {formatStreamCount(entry.streams)}
      </div>
    )
  },
  {
    id: 'weeksOnChart',
    sortable: true,
    sortAccessor: entry => (entry.weeksOnChart > 0 ? entry.weeksOnChart : entry.isDebut ? -1 : 0),
    header: ({ direction, toggleSort }) => (
      <button
        type="button"
        className={cn(headerButtonClasses, 'justify-end')}
        onClick={toggleSort}
      >
        Weeks
        <SortIndicator direction={direction} />
      </button>
    ),
    cell: entry => {
      const weeksText =
        entry.weeksOnChart > 0 ? formatWeeksOnChart(entry.weeksOnChart) : entry.isDebut ? 'Debut' : '—';

      return (
        <div className="flex justify-end">
          <span className="rounded-chip border border-white/[0.09] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-text-body">
            {weeksText}
          </span>
        </div>
      );
    }
  },
  {
    id: 'peakPosition',
    sortable: true,
    sortAccessor: entry => entry.peakPosition ?? 9999,
    header: ({ direction, toggleSort }) => (
      <button
        type="button"
        className={cn(headerButtonClasses, 'justify-end')}
        onClick={toggleSort}
      >
        Peak
        <SortIndicator direction={direction} />
      </button>
    ),
    cell: entry => (
      <div className="text-right text-xs font-mono text-text-body">
        {entry.peakPosition ? formatChartPosition(entry.peakPosition) : '—'}
      </div>
    )
  },
  {
    id: 'lastWeekPosition',
    sortable: true,
    sortAccessor: entry => {
      const calculatedLastWeekPosition = entry.movement !== 0 ? entry.position + entry.movement : null;
      return calculatedLastWeekPosition ?? 9999;
    },
    header: ({ direction, toggleSort }) => (
      <button
        type="button"
        className={cn(headerButtonClasses, 'justify-end')}
        onClick={toggleSort}
      >
        LW Pos
        <SortIndicator direction={direction} />
      </button>
    ),
    cell: entry => {
      // Calculate last week position from current position and movement
      // movement = previousPosition - currentPosition, so previousPosition = currentPosition + movement
      const calculatedLastWeekPosition = entry.movement !== 0 ? entry.position + entry.movement : null;
      return (
        <div className="text-right text-xs font-mono text-text-body">
          {formatLastWeekPosition(calculatedLastWeekPosition)}
        </div>
      );
    }
  },
  {
    id: 'movement',
    sortable: true,
    sortAccessor: entry => entry.movement,
    header: ({ direction, toggleSort }) => (
      <button
        type="button"
        className={cn(headerButtonClasses, 'justify-end')}
        onClick={toggleSort}
      >
        Move
        <SortIndicator direction={direction} />
      </button>
    ),
    cell: entry => (
      <div
        className={cn(
          'flex items-center justify-end gap-1 text-xs font-semibold font-mono',
          entry.movement > 0 ? 'text-positive' : entry.movement < 0 ? 'text-negative' : 'text-text-muted'
        )}
      >
        {entry.movement > 0 && <TrendingUp className="h-3 w-3" />}
        {entry.movement < 0 && <TrendingDown className="h-3 w-3" />}
        {formatChartMovement(entry.movement)}
      </div>
    )
  },
  {
    id: 'exitRisk',
    headerClassName: 'text-right',
    cellClassName: 'text-right',
    header: () => (
      <div className="flex w-full justify-end font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-label">
        Risk
      </div>
    ),
    cell: entry => {
      const exitRisk = getChartExitRisk(entry.movement, entry.weeksOnChart);
      const riskLabel = exitRisk === 'high' ? 'High' : exitRisk === 'medium' ? 'Watch' : 'Stable';
      const riskTextClass =
        exitRisk === 'high' ? 'text-negative' : exitRisk === 'medium' ? 'text-warning' : 'text-positive';
      const riskDotClass =
        exitRisk === 'high' ? 'bg-negative shadow-glow-negative' : exitRisk === 'medium' ? 'bg-warning shadow-glow-amber' : 'bg-positive shadow-glow-positive';

      return (
        <div className="flex items-center justify-end gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', riskDotClass)} />
          <span className={cn('text-[11px] font-semibold uppercase', riskTextClass)}>{riskLabel}</span>
        </div>
      );
    }
  }
];
