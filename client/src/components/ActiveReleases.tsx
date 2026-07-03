import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameState } from '@/hooks/useGameState';
import { useReleases } from '@/hooks/useReleases';
import { useSongs } from '@/hooks/useSongs';
import { useArtists } from '@/hooks/useArtists';
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
  const gameState = useGameState();
  // Phase 3 PR-6/PR-9: releases / songs / artists read from the TanStack Query
  // cache, not Zustand.
  const { data: releases = [] } = useReleases();
  const { data: songs = [] } = useSongs();
  const { data: artists = [] } = useArtists();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'released'>('upcoming');
  const [stateSync, setStateSync] = useState<'synced' | 'syncing' | 'error'>('synced');
  
  // Monitor state synchronization
  useEffect(() => {
    if (!releases || releases.length === 0) return;
    
    // Check for potential desync indicators
    const currentWeek = gameState?.currentWeek || 1;
    const overdueReleases = releases.filter(r => 
      r.status === 'planned' && (r.releaseWeek || 0) < currentWeek
    );
    
    if (overdueReleases.length > 0) {
      console.warn('ActiveReleases: Detected potentially desynchronized releases:', overdueReleases);
      setStateSync('error');
    } else {
      setStateSync('synced');
    }
  }, [releases, gameState?.currentWeek]);

  // Enhanced debug logging for release state tracking
  console.log('ActiveReleases Enhanced Debug:', {
    totalReleases: releases?.length || 0,
    totalSongs: songs?.length || 0,
    gameState: gameState?.id,
    currentWeek: gameState?.currentWeek,
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
    const currentWeek = gameState?.currentWeek || 1;
    const upcoming = releases.filter(r => {
      const isPlanned = r.status === 'planned';
      const isFutureOrCurrent = !r.releaseWeek || r.releaseWeek >= currentWeek;
      console.log(`Release "${r.title}": status=${r.status}, releaseWeek=${r.releaseWeek}, currentWeek=${currentWeek}, included=${isPlanned && isFutureOrCurrent}`);
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
      single: { label: 'Single', color: 'bg-neon-purple/15 text-text-accent border border-neon-purple/30' },
      ep: { label: 'EP', color: 'bg-neon-purple/15 text-text-accent border border-neon-purple/30' },
      album: { label: 'Album', color: 'bg-positive/15 text-positive border border-positive/30' },
      compilation: { label: 'Compilation', color: 'bg-neon-amber/15 text-neon-amber border border-neon-amber/30' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.single;
    return <Badge className={`rounded-chip ${config.color}`}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { label: 'Planned', color: 'bg-warning/15 text-warning border border-warning/30' },
      released: { label: 'Released', color: 'bg-positive/15 text-positive border border-positive/30' },
      catalog: { label: 'Catalog', color: 'bg-white/[0.04] text-text-muted border border-white/[0.08]' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] ||
                   { label: status, color: 'bg-white/[0.04] text-text-muted border border-white/[0.08]' };
    return <Badge className={`rounded-chip ${config.color}`}>{config.label}</Badge>;
  };

  const getReleaseSongCount = (releaseId: string) => {
    // Count songs that are associated with this release
    return songs.filter(s => s.releaseId === releaseId).length;
  };

  const formatWeek = (week: number) => {
    if (!week) return 'TBD';
    return `Week ${week}`;
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
          <span className="text-xs text-text-muted">
            {chartInfo.weeksOnChart}w
          </span>
        )}
        {chartInfo.peakPosition && (
          <span className="text-xs text-text-muted">
            Peak {formatChartPosition(chartInfo.peakPosition)}
          </span>
        )}
      </div>
    );
  };

  const upcomingReleases = getUpcomingReleases();
  const releasedReleases = getReleasedReleases();
  const currentWeek = gameState?.currentWeek || 1;

  return (
    <Card className="glass-panel chromatic-hairline">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Releases</h3>
            <p className="text-sm text-text-body">Planned and released music</p>
          </div>
          
          {/* State Synchronization Indicator */}
          <div className="flex items-center space-x-2">
            {stateSync === 'synced' && (
              <div className="flex items-center space-x-1 text-positive">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">Synced</span>
              </div>
            )}
            {stateSync === 'syncing' && (
              <div className="flex items-center space-x-1 text-text-accent">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-xs">Syncing...</span>
              </div>
            )}
            {stateSync === 'error' && (
              <div className="flex items-center space-x-1 text-warning" title="Some releases may be out of sync">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">Check Status</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-surface-inner/40 p-1 rounded-button mb-6">
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-chip transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-neon-purple/20 text-text-primary border border-neon-purple/40 shadow-sm'
                : 'text-text-body hover:text-text-primary'
            }`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({upcomingReleases.length})
          </button>
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-chip transition-colors ${
              activeTab === 'released'
                ? 'bg-neon-purple/20 text-text-primary border border-neon-purple/40 shadow-sm'
                : 'text-text-body hover:text-text-primary'
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
                  <p className="text-text-muted mb-2">No upcoming releases planned</p>
                  <p className="text-sm text-text-muted">Use Plan Release to schedule new releases</p>
                </div>
              ) : (
                upcomingReleases.map(release => (
                  <ReleaseWorkflowCard
                    key={release.id}
                    release={release}
                    currentWeek={currentWeek}
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
                  <p className="text-text-muted mb-2">No releases yet</p>
                  <p className="text-sm text-text-muted">Complete planned releases to see them here</p>
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
                      <div className="mb-6 p-4 bg-surface-inner/40 rounded-[14px] border border-white/[0.08]">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-text-primary flex items-center space-x-2">
                            <BarChart3 className="w-4 h-4 text-text-accent" />
                            <span>Chart Performance</span>
                          </h4>
                          <div className="text-xs text-text-muted">
                            {chartingSongs.length} song{chartingSongs.length !== 1 ? 's' : ''} charting
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-lg font-mono font-semibold text-warning">{top10Songs.length}</div>
                            <div className="text-xs text-text-body">Top 10</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-mono font-semibold text-neon-cyan">{top40Songs.length}</div>
                            <div className="text-xs text-text-body">Top 40</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-mono font-semibold text-positive">{chartingSongs.length}</div>
                            <div className="text-xs text-text-body">Charting</div>
                          </div>
                        </div>

                        {/* Top performing songs */}
                        <div className="space-y-2">
                          {chartingSongs
                            .sort((a, b) => (a.chartPosition || 101) - (b.chartPosition || 101))
                            .slice(0, 3)
                            .map(song => (
                              <div key={song.id} className="flex items-center justify-between p-2 bg-surface-inner/50 rounded-chip">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-text-primary">{song.title}</div>
                                  <div className="text-xs text-text-muted">{getArtistName(song.artistId)}</div>
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
                      currentWeek={currentWeek}
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