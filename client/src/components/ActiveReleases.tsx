import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, BarChart3 } from 'lucide-react';
import { ReleaseWorkflowCard } from './ReleaseWorkflowCard';
import {
  formatChartPosition,
  formatChartMovement,
  getChartPositionColor,
  getMovementColor,
  getMovementArrow
} from '../../../shared/utils/chartUtils';

export function ActiveReleases() {
  const { releases, artists, songs, gameState } = useGameStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'released'>('upcoming');
  const [stateSync, setStateSync] = useState<'synced' | 'syncing' | 'error'>('synced');
  
  // Monitor state synchronization
  useEffect(() => {
    if (!releases || releases.length === 0) return;
    
    // Check for potential desync indicators
    const currentMonth = gameState?.currentMonth || 1;
    const overdueReleases = releases.filter(r => 
      r.status === 'planned' && (r.releaseMonth || 0) < currentMonth
    );
    
    if (overdueReleases.length > 0) {
      console.warn('ActiveReleases: Detected potentially desynchronized releases:', overdueReleases);
      setStateSync('error');
    } else {
      setStateSync('synced');
    }
  }, [releases, gameState?.currentMonth]);

  // Enhanced debug logging for release state tracking
  console.log('ActiveReleases Enhanced Debug:', {
    totalReleases: releases?.length || 0,
    totalSongs: songs?.length || 0,
    gameState: gameState?.id,
    currentMonth: gameState?.currentMonth,
    releasesByStatus: {
      planned: releases?.filter(r => r.status === 'planned').length || 0,
      released: releases?.filter(r => r.status === 'released').length || 0,
      catalog: releases?.filter(r => r.status === 'catalog').length || 0,
      other: releases?.filter(r => !['planned', 'released', 'catalog'].includes(r.status)).length || 0
    }
  });
  
  // Separate log for songs to force display
  if (songs && songs.length > 0) {
    console.log('SONGS DATA - First 2 songs:');
    songs.slice(0, 2).forEach((song, i) => {
      console.log(`Song ${i}:`, {
        id: song.id,
        title: song.title,
        releaseId: song.releaseId,
        isReleased: song.isReleased,
        artistId: song.artistId
      });
    });
    
    // Check if any songs are linked to releases
    const songsWithReleases = songs.filter(s => s.releaseId);
    console.log(`Songs with releaseId set: ${songsWithReleases.length} out of ${songs.length}`);
    if (songsWithReleases.length > 0) {
      console.log('Songs linked to releases:', songsWithReleases.map(s => ({
        songTitle: s.title,
        releaseId: s.releaseId
      })));
    }
  }
  
  if (releases && releases.length > 0) {
    console.log('RELEASES DATA - All releases:');
    releases.forEach((release, i) => {
      console.log(`Release ${i}:`, {
        id: release.id,
        title: release.title,
        status: release.status,
        hasRevenue: release.revenueGenerated > 0
      });
    });
  }

  const getUpcomingReleases = () => {
    const currentMonth = gameState?.currentMonth || 1;
    const upcoming = releases.filter(r => {
      const isPlanned = r.status === 'planned';
      const isFutureOrCurrent = !r.releaseMonth || r.releaseMonth >= currentMonth;
      console.log(`Release "${r.title}": status=${r.status}, releaseMonth=${r.releaseMonth}, currentMonth=${currentMonth}, included=${isPlanned && isFutureOrCurrent}`);
      return isPlanned && isFutureOrCurrent;
    });
    console.log('Filtered upcoming releases:', upcoming.length, 'releases');
    return upcoming;
  };

  const getReleasedReleases = () => {
    const released = releases.filter(r => r.status === 'released' || r.status === 'catalog');
    console.log('Filtered released releases:', released.length, 'releases');
    return released;
  };

  const getArtistName = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.name || 'Unknown Artist';
  };

  const getReleaseTypeBadge = (type: string) => {
    const typeConfig = {
      single: { label: 'Single', color: 'bg-[#A75A5B]/20 text-[#A75A5B]' },
      ep: { label: 'EP', color: 'bg-[#791014]/10 text-[#791014]' },
      album: { label: 'Album', color: 'bg-green-100 text-green-800' },
      compilation: { label: 'Compilation', color: 'bg-orange-100 text-orange-800' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.single;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { label: 'Planned', color: 'bg-yellow-100 text-yellow-800' },
      released: { label: 'Released', color: 'bg-green-100 text-green-800' },
      catalog: { label: 'Catalog', color: 'bg-gray-100 text-white' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, color: 'bg-gray-100 text-white' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getReleaseSongCount = (releaseId: string) => {
    // Count songs that are associated with this release
    return songs.filter(s => s.releaseId === releaseId).length;
  };

  const formatMonth = (month: number) => {
    if (!month) return 'TBD';
    return `Month ${month}`;
  };

  const getSongChartInfo = (songId: string) => {
    const song = songs.find(s => s.id === songId);
    if (!song) return null;

    return {
      position: song.chartPosition,
      movement: song.chartMovement,
      weeksOnChart: song.weeksOnChart,
      peakPosition: song.peakPosition
    };
  };

  const renderChartBadge = (song: any) => {
    const chartInfo = getSongChartInfo(song.id);
    if (!chartInfo || !chartInfo.position) return null;

    return (
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs font-semibold rounded ${getChartPositionColor(chartInfo.position)}`}>
          {formatChartPosition(chartInfo.position)}
        </span>
        {chartInfo.movement && chartInfo.movement !== 0 && (
          <span className={`text-xs ${getMovementColor(chartInfo.movement)}`}>
            {formatChartMovement(chartInfo.movement)}
          </span>
        )}
        {chartInfo.weeksOnChart && (
          <span className="text-xs text-white/50">
            {chartInfo.weeksOnChart}w
          </span>
        )}
        {chartInfo.peakPosition && (
          <span className="text-xs text-white/50">
            Peak {formatChartPosition(chartInfo.peakPosition)}
          </span>
        )}
      </div>
    );
  };

  const upcomingReleases = getUpcomingReleases();
  const releasedReleases = getReleasedReleases();
  const currentMonth = gameState?.currentMonth || 1;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Releases</h3>
            <p className="text-sm text-white/70">Planned and released music</p>
          </div>
          
          {/* State Synchronization Indicator */}
          <div className="flex items-center space-x-2">
            {stateSync === 'synced' && (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">Synced</span>
              </div>
            )}
            {stateSync === 'syncing' && (
              <div className="flex items-center space-x-1 text-[#A75A5B]">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-xs">Syncing...</span>
              </div>
            )}
            {stateSync === 'error' && (
              <div className="flex items-center space-x-1 text-amber-600" title="Some releases may be out of sync">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">Check Status</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-[#3c252d]/30 p-1 rounded-lg mb-6">
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'upcoming' 
                ? 'bg-[#A75A5B]/20 text-white border border-[#A75A5B]/40 shadow-sm' 
                : 'text-white/70 hover:text-white'
            }`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({upcomingReleases.length})
          </button>
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'released' 
                ? 'bg-[#A75A5B]/20 text-white border border-[#A75A5B]/40 shadow-sm' 
                : 'text-white/70 hover:text-white'
            }`}
            onClick={() => setActiveTab('released')}
          >
            Released ({releasedReleases.length})
          </button>
        </div>

        {/* Release List */}
        <div className="space-y-4">
          {activeTab === 'upcoming' && (
            <>
              {upcomingReleases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/50 mb-2">No upcoming releases planned</p>
                  <p className="text-sm text-white/50">Use Plan Release to schedule new releases</p>
                </div>
              ) : (
                upcomingReleases.map(release => (
                  <ReleaseWorkflowCard
                    key={release.id}
                    release={release}
                    currentMonth={currentMonth}
                    artistName={getArtistName(release.artistId)}
                    songs={songs}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'released' && (
            <>
              {releasedReleases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/50 mb-2">No releases yet</p>
                  <p className="text-sm text-white/50">Complete planned releases to see them here</p>
                </div>
              ) : (
                <>
                  {/* Chart Performance Summary for Released Songs */}
                  {(() => {
                    const releasedSongs = songs.filter(s => s.isReleased && s.chartPosition);
                    const chartingSongs = releasedSongs.filter(s => s.chartPosition);
                    const top10Songs = chartingSongs.filter(s => s.chartPosition && s.chartPosition <= 10);
                    const top40Songs = chartingSongs.filter(s => s.chartPosition && s.chartPosition <= 40);

                    return chartingSongs.length > 0 ? (
                      <div className="mb-6 p-4 bg-[#3c252d]/30 rounded-lg border border-[#A75A5B]/20">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4 text-[#A75A5B]" />
                            <span>Chart Performance</span>
                          </h4>
                          <div className="text-xs text-white/50">
                            {chartingSongs.length} song{chartingSongs.length !== 1 ? 's' : ''} charting
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-500">{top10Songs.length}</div>
                            <div className="text-xs text-white/70">Top 10</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-500">{top40Songs.length}</div>
                            <div className="text-xs text-white/70">Top 40</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-500">{chartingSongs.length}</div>
                            <div className="text-xs text-white/70">Charting</div>
                          </div>
                        </div>

                        {/* Top performing songs */}
                        <div className="space-y-2">
                          {chartingSongs
                            .sort((a, b) => (a.chartPosition || 101) - (b.chartPosition || 101))
                            .slice(0, 3)
                            .map(song => (
                              <div key={song.id} className="flex items-center justify-between p-2 bg-black/20 rounded">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-white">{song.title}</div>
                                  <div className="text-xs text-white/60">{getArtistName(song.artistId)}</div>
                                </div>
                                {renderChartBadge(song)}
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {releasedReleases.map(release => (
                    <ReleaseWorkflowCard
                      key={release.id}
                      release={release}
                      currentMonth={currentMonth}
                      artistName={getArtistName(release.artistId)}
                      songs={songs}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}