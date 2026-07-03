import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trophy, BarChart3 } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { useTop100Chart } from '@/hooks/useCharts';
import { ChartDataTable } from '@/components/chart/ChartDataTable';
import { ChartEntry, chartColumns } from '@/components/chart/chartColumns';
import { isPlayerSongHighlight } from '../../../shared/utils/chartUtils';

type Top100Entry = ChartEntry;

export function Top100ChartDisplay() {
  console.log('🚀 Top100ChartDisplay component rendering...');

  const gameState = useGameState();
  console.log('🎮 GameState from store:', { id: gameState?.id, currentWeek: gameState?.currentWeek });

  const [showAll, setShowAll] = useState(false);

  const {
    data: chartData,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useTop100Chart();

  const refreshing = isFetching;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load chart data') : null;

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-panel chromatic-hairline flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-neon-lilac" />
          <span className="ml-2 text-text-body">Loading chart data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="glass-panel chromatic-hairline text-center py-8">
          <div className="mb-4 text-negative">{error}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-button border-neon-cyan/35 bg-neon-cyan/[0.06] text-neon-cyan hover:bg-neon-cyan/[0.12] hover:text-neon-cyan"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.top100.length === 0) {
    return (
      <div className="space-y-6">
        <div className="glass-panel chromatic-hairline text-center py-8">
          <BarChart3 className="w-10 h-10 text-text-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-text-body mb-2">No Chart Data</h3>
          <p className="text-xs text-text-muted">No songs are currently charting in the Top 100</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-button border-neon-cyan/35 bg-neon-cyan/[0.06] text-neon-cyan hover:bg-neon-cyan/[0.12] hover:text-neon-cyan"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const playerSongs = chartData.top100.filter(entry => entry.isPlayerSong);
  const debuts = chartData.top100.filter(entry => entry.isDebut);
  const displayEntries = showAll ? chartData.top100 : chartData.top100.slice(0, 25);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="glass-panel chromatic-hairline hud-ticks mb-8 p-4">
        <div className="flex items-center justify-between mb-6">
          <div></div>

          <div className="flex items-center space-x-4">
            {playerSongs.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-neon-lilac shadow-glow-lilac"></div>
                <span className="text-xs text-text-body">
                  {playerSongs.length} Your Song{playerSongs.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-text-body hover:text-text-primary hover:bg-white/[0.045]"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {debuts.length > 0 && (
          <div className="mb-4">
            <Badge
              variant="secondary"
              className="rounded-chip border border-positive/40 bg-positive/[0.14] text-xs text-positive"
            >
              {debuts.length} New Debut{debuts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-text-body">
            Showing {displayEntries.length} of {chartData.top100.length} songs
          </div>
          {chartData.top100.length > 25 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="rounded-button border-white/[0.09] bg-white/[0.02] text-text-body hover:text-text-primary hover:bg-white/[0.045]"
            >
              {showAll ? 'Show Top 25' : `Show All ${chartData.top100.length}`}
            </Button>
          )}
        </div>
      </div>

      {/* Chart Content */}
      <div className="space-y-6">
        <ChartDataTable<Top100Entry>
          columns={chartColumns}
          data={displayEntries}
          rowHighlight={entry => isPlayerSongHighlight(entry.isPlayerSong, entry.position)}
          initialSort={{ columnId: 'position', direction: 'asc' }}
          getRowKey={entry => entry.songId ?? `${entry.position}-${entry.songTitle}`}
        />

        {chartData.top100.length > 0 && (
          <div className="glass-panel chromatic-hairline p-4">
            <div className="grid grid-cols-4 gap-4 text-center text-xs">
              <div>
                <div className="font-mono font-semibold text-text-primary">{playerSongs.length}</div>
                <div className="text-text-muted">Your Songs</div>
              </div>
              <div>
                <div className="font-mono font-semibold text-text-primary">{debuts.length}</div>
                <div className="text-text-muted">New This Week</div>
              </div>
              <div>
                <div className="font-mono font-semibold text-positive">
                  {chartData.top100.filter(e => e.movement > 0).length}
                </div>
                <div className="text-text-muted">Climbing</div>
              </div>
              <div>
                <div className="font-mono font-semibold text-neon-lilac">
                  {chartData.top100.filter(e => e.position <= 10).length}
                </div>
                <div className="text-text-muted">Top 10</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Top100ChartDisplay;
