import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  formatChartMovement,
  formatChartPosition,
  formatWeeksOnChart,
  getChartExitRisk,
  getChartExitRiskBgColor,
  getChartPositionColor,
  getChartPositionOrdinal,
  getMovementColor,
  isPlayerSongHighlight
} from '@shared/utils/chartUtils';
import { cn } from '@/lib/utils';

import { ChartColumn, SortDirection } from './ChartDataTable';

export interface ChartEntry {
  position: number;
  songId: string | null;
  songTitle: string;
  artistName: string;
  movement: number;
  weeksOnChart: number;
  peakPosition: number | null;
  isPlayerSong: boolean;
  isCompetitorSong: boolean;
  competitorTitle?: string;
  competitorArtist?: string;
  isDebut: boolean;
}

const headerButtonClasses =
  'flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white/60';

function SortIndicator({ direction }: { direction: SortDirection | null }) {
  if (direction === 'asc') {
    return <ArrowUp className="h-3 w-3 text-white/90" />;
  }

  if (direction === 'desc') {
    return <ArrowDown className="h-3 w-3 text-white/90" />;
  }

  return <ArrowUpDown className="h-3 w-3 text-white/30" />;
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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-sm font-bold text-yellow-900 shadow-lg">
            1
          </div>
        ) : (
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
              getChartPositionColor(entry.position)
            )}
          >
            {entry.position}
          </div>
        )}
        <span className="hidden text-[11px] font-mono uppercase tracking-wide text-white/40 xl:inline">
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
                isHighlighted ? 'text-white' : 'text-white/90'
              )}
            >
              {entry.songTitle}
            </span>
            {entry.isDebut && (
              <Badge variant="secondary" className="bg-green-100 px-1 text-xs text-green-700">
                NEW
              </Badge>
            )}
            {isHighlighted && (
              <Badge variant="secondary" className="bg-[#A75A5B] px-1 text-xs text-white">
                YOURS
              </Badge>
            )}
          </div>
          <div className="text-xs text-white/60">{entry.artistName}</div>
        </div>
      )
    }
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

      return <div className="text-right text-xs font-mono text-white/70">{weeksText}</div>;
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
      <div className="text-right text-xs font-mono text-white/70">
        {entry.peakPosition ? formatChartPosition(entry.peakPosition) : '—'}
      </div>
    )
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
          'text-right text-xs font-semibold',
          getMovementColor(entry.movement)
        )}
      >
        {formatChartMovement(entry.movement)}
      </div>
    )
  },
  {
    id: 'exitRisk',
    headerClassName: 'text-right',
    cellClassName: 'text-right',
    header: () => (
      <div className="flex w-full justify-end text-xs font-semibold uppercase tracking-wide text-white/60">
        Risk
      </div>
    ),
    cell: entry => {
      const exitRisk = getChartExitRisk(entry.movement, entry.weeksOnChart);
      const riskLabel = exitRisk === 'high' ? 'High' : exitRisk === 'medium' ? 'Watch' : 'Stable';
      const riskTextClass =
        exitRisk === 'high' ? 'text-red-400' : exitRisk === 'medium' ? 'text-amber-300' : 'text-green-400';

      return (
        <div className="flex items-center justify-end gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', getChartExitRiskBgColor(exitRisk))} />
          <span className={cn('text-[11px] font-semibold uppercase', riskTextClass)}>{riskLabel}</span>
        </div>
      );
    }
  }
];
