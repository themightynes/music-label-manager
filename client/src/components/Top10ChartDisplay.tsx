import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trophy, BarChart3 } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';
import { ChartDataTable } from '@/components/chart/ChartDataTable';
import { ChartEntry, chartColumns } from '@/components/chart/chartColumns';
import { isPlayerSongHighlight } from '../../../shared/utils/chartUtils';

type Top10Entry = ChartEntry;

interface Top10ChartData {
  chartWeek: string;
  currentWeek: number;
  top10: Top10Entry[];
}

export function Top10ChartDisplay() {
  console.log('🚀 Top10ChartDisplay component rendering...');

  const { gameState } = useGameStore();
  console.log('🎮 GameState from store:', { id: gameState?.id, currentWeek: gameState?.currentWeek });

  const [chartData, setChartData] = useState<Top10ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTop10Data = async () => {
    console.log('📡 fetchTop10Data called, gameState:', { id: gameState?.id, exists: !!gameState });

    if (!gameState?.id) {
      console.log('❌ No gameState.id, returning early');
      return;
    }

    try {
      console.log('🔄 Starting Top 10 chart fetch...');
      setRefreshing(true);
      const apiUrl = `/api/game/${gameState.id}/charts/top10`;
      console.log('📍 Fetching from URL:', apiUrl);

      const response = await apiRequest('GET', apiUrl);
      const data = await response.json();
      setChartData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Top 10 chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('🎵 Chart Debug Info:', {
      gameStateId: gameState?.id,
      hasGameState: !!gameState,
      apiUrl: `/api/game/${gameState?.id}/charts/top10`
    });
    fetchTop10Data();
  }, [gameState?.id]);

  const handleRefresh = () => {
    fetchTop10Data();
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <span>Top 10 Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-white/50" />
            <span className="ml-2 text-white/70">Loading chart data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <span>Top 10 Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-400 mb-4">{error}</div>
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
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <span>Top 10 Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-10 h-10 text-white/50 mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-white/70 mb-2">No Chart Data</h3>
            <p className="text-xs text-white/50">No songs are currently charting in the Top 10</p>
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
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <CardTitle>Top 10 Chart</CardTitle>
            <Badge variant="outline" className="text-xs">
              Week {chartData.currentWeek}
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            {playerSongs.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-brand-burgundy rounded-full"></div>
                <span className="text-xs text-white/70">
                  {playerSongs.length} Your Song{playerSongs.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-white/70 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {debuts.length > 0 && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
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
          <div className="pt-3 border-t border-brand-purple">
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="font-semibold text-white/90">{playerSongs.length}</div>
                <div className="text-white/50">Your Songs</div>
              </div>
              <div>
                <div className="font-semibold text-white/90">{debuts.length}</div>
                <div className="text-white/50">New This Week</div>
              </div>
              <div>
                <div className="font-semibold text-white/90">
                  {chartData.top10.filter(e => e.movement > 0).length}
                </div>
                <div className="text-white/50">Climbing</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Top10ChartDisplay;
