import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trophy, BarChart3 } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';
import { useTop10Chart } from '@/hooks/useCharts';
import { ChartDataTable } from '@/components/chart/ChartDataTable';
import { ChartEntry, chartColumns } from '@/components/chart/chartColumns';
import { isPlayerSongHighlight } from '../../../shared/utils/chartUtils';
import logger from '@/lib/logger';

type Top10Entry = ChartEntry;

export function Top10ChartDisplay() {
  logger.debug('🚀 Top10ChartDisplay component rendering...');

  const gameState = useGameState();
  logger.debug('🎮 GameState from store:', { id: gameState?.id, currentWeek: gameState?.currentWeek });

  const {
    data: chartData,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useTop10Chart();

  const refreshing = isFetching;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load chart data') : null;

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <Card className="glass-panel chromatic-hairline">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-warning" />
            <span>Top 10 Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-text-muted" />
            <span className="ml-2 text-text-body">Loading chart data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-panel chromatic-hairline">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-warning" />
            <span>Top 10 Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-negative mb-4">{error}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.top10.length === 0) {
    return (
      <Card className="glass-panel chromatic-hairline">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-warning" />
            <span>Top 10 Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-10 h-10 text-text-muted mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-text-body mb-2">No Chart Data</h3>
            <p className="text-xs text-text-muted">No songs are currently charting in the Top 10</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const playerSongs = chartData.top10.filter(entry => entry.isPlayerSong);
  const debuts = chartData.top10.filter(entry => entry.isDebut);

  return (
    <Card className="glass-panel chromatic-hairline">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-warning" />
            <CardTitle>Top 10 Chart</CardTitle>
            <Badge variant="outline" className="text-xs">
              Week {chartData.currentWeek}
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            {playerSongs.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-neon-purple rounded-full"></div>
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
              className="text-text-body hover:text-text-primary"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {debuts.length > 0 && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs bg-positive/15 text-positive border border-positive/30 rounded-chip">
              {debuts.length} New Debut{debuts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <ChartDataTable<Top10Entry>
          columns={chartColumns}
          data={chartData.top10}
          rowHighlight={entry => isPlayerSongHighlight(entry.isPlayerSong, entry.position)}
          initialSort={{ columnId: 'position', direction: 'asc' }}
          getRowKey={entry => entry.songId ?? `${entry.position}-${entry.songTitle}`}
        />

        {chartData.top10.length > 0 && (
          <div className="pt-3 border-t border-white/[0.08]">
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="font-semibold text-text-primary">{playerSongs.length}</div>
                <div className="text-text-muted">Your Songs</div>
              </div>
              <div>
                <div className="font-semibold text-text-primary">{debuts.length}</div>
                <div className="text-text-muted">New This Week</div>
              </div>
              <div>
                <div className="font-semibold text-text-primary">
                  {chartData.top10.filter(e => e.movement > 0).length}
                </div>
                <div className="text-text-muted">Climbing</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Top10ChartDisplay;
