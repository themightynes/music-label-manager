import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trophy, BarChart3 } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { ChartDataTable } from '@/components/chart/ChartDataTable';
import { ChartEntry, chartColumns } from '@/components/chart/chartColumns';
import { isPlayerSongHighlight } from '../../../shared/utils/chartUtils';
import { apiRequest } from '@/lib/queryClient';

type Top100Entry = ChartEntry;

interface Top100ChartData {
  chartWeek: string;
  currentMonth: number;
  top100: Top100Entry[];
}

export function Top100ChartDisplay() {
  console.log('🚀 Top100ChartDisplay component rendering...');

  const { gameState } = useGameStore();
  console.log('🎮 GameState from store:', { id: gameState?.id, currentMonth: gameState?.currentMonth });

  const [chartData, setChartData] = useState<Top100ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const fetchTop100Data = async () => {
    console.log('📡 fetchTop100Data called, gameState:', { id: gameState?.id, exists: !!gameState });

    if (!gameState?.id) {
      console.log('❌ No gameState.id, returning early');
      return;
    }

    try {
      console.log('🔄 Starting Top 100 chart fetch...');
      setRefreshing(true);
      const apiUrl = `/api/game/${gameState.id}/charts/top100`;
      console.log('📍 Fetching from URL:', apiUrl);

      const response = await apiRequest('GET', apiUrl);
      const data = await response.json();
      setChartData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Top 100 chart data:', err);
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
      apiUrl: `/api/game/${gameState?.id}/charts/top100`
    });
    fetchTop100Data();
  }, [gameState?.id]);

  const handleRefresh = () => {
    fetchTop100Data();
  };

  if (loading) {
    return (
      <Card className="shadow-sm max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <span>Top 100 Chart</span>
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
      <Card className="shadow-sm max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <span>Top 100 Chart</span>
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

  if (!chartData || chartData.top100.length === 0) {
    return (
      <Card className="shadow-sm max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>Top 100 Chart</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="w-10 h-10 text-white/50 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-white/70 mb-2">No Chart Data</h3>
              <p className="text-xs text-white/50">No songs are currently charting in the Top 100</p>
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

  const playerSongs = chartData.top100.filter(entry => entry.isPlayerSong);
  const debuts = chartData.top100.filter(entry => entry.isDebut);
  const displayEntries = showAll ? chartData.top100 : chartData.top100.slice(0, 25);

  return (
    <Card className="shadow-sm max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <CardTitle>Top 100 Chart</CardTitle>
            <Badge variant="outline" className="text-xs">
              Month {chartData.currentMonth}
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            {playerSongs.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#A75A5B] rounded-full"></div>
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

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-white/70">
            Showing {displayEntries.length} of {chartData.top100.length} songs
          </div>
          {chartData.top100.length > 25 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-white/70 hover:text-white"
            >
              {showAll ? 'Show Top 25' : `Show All ${chartData.top100.length}`}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <ChartDataTable<Top100Entry>
          columns={chartColumns}
          data={displayEntries}
          rowHighlight={entry => isPlayerSongHighlight(entry.isPlayerSong, entry.position)}
          initialSort={{ columnId: 'position', direction: 'asc' }}
          getRowKey={entry => entry.songId ?? `${entry.position}-${entry.songTitle}`}
        />

        {chartData.top100.length > 0 && (
          <div className="pt-4 border-t border-[#4e324c]">
            <div className="grid grid-cols-4 gap-4 text-center text-xs">
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
                  {chartData.top100.filter(e => e.movement > 0).length}
                </div>
                <div className="text-white/50">Climbing</div>
              </div>
              <div>
                <div className="font-semibold text-white/90">
                  {chartData.top100.filter(e => e.position <= 10).length}
                </div>
                <div className="text-white/50">Top 10</div>
              </div>
            </div>
          </div>
        )}

        {chartData.top100.length >= 10 && (
          <div className="p-4 bg-[#3c252d]/30 rounded-lg border border-[#A75A5B]/20">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span>Top 10 Highlights</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {chartData.top100.slice(0, 10).map(entry => (
                <div
                  key={entry.songId}
                  className={`flex items-center justify-between p-2 rounded text-xs ${
                    entry.isPlayerSong
                      ? 'bg-[#A75A5B]/20 border border-[#A75A5B]/30'
                      : 'bg-black/20'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold w-6">#{entry.position}</span>
                    <div className="truncate">
                      <div className="font-medium truncate">{entry.songTitle}</div>
                      <div className="text-white/50 truncate">{entry.artistName}</div>
                    </div>
                  </div>
                  {entry.isPlayerSong && (
                    <Badge variant="secondary" className="text-xs bg-[#A75A5B] text-white px-1 ml-2">
                      YOURS
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Top100ChartDisplay;
