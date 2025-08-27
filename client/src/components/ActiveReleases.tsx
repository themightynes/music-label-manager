import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { ReleaseWorkflowCard } from './ReleaseWorkflowCard';

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
    releases: releases,
    gameState: gameState?.id,
    currentMonth: gameState?.currentMonth,
    releasesByStatus: {
      planned: releases?.filter(r => r.status === 'planned').length || 0,
      released: releases?.filter(r => r.status === 'released').length || 0,
      catalog: releases?.filter(r => r.status === 'catalog').length || 0,
      other: releases?.filter(r => !['planned', 'released', 'catalog'].includes(r.status)).length || 0
    },
    releaseDetails: releases?.map(r => ({
      id: r.id,
      title: r.title,
      status: r.status,
      releaseMonth: r.releaseMonth,
      type: r.type
    })) || []
  });

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
      single: { label: 'Single', color: 'bg-blue-100 text-blue-800' },
      ep: { label: 'EP', color: 'bg-purple-100 text-purple-800' },
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
      catalog: { label: 'Catalog', color: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, color: 'bg-gray-100 text-gray-800' };
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

  const upcomingReleases = getUpcomingReleases();
  const releasedReleases = getReleasedReleases();
  const currentMonth = gameState?.currentMonth || 1;

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Releases</h3>
            <p className="text-sm text-slate-600">Planned and released music</p>
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
              <div className="flex items-center space-x-1 text-blue-600">
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
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mb-6">
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'upcoming' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({upcomingReleases.length})
          </button>
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'released' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
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
                  <p className="text-slate-500 mb-2">No upcoming releases planned</p>
                  <p className="text-sm text-slate-400">Use Plan Release to schedule new releases</p>
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
                  <p className="text-slate-500 mb-2">No releases yet</p>
                  <p className="text-sm text-slate-400">Complete planned releases to see them here</p>
                </div>
              ) : (
                releasedReleases.map(release => (
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
        </div>
      </CardContent>
    </Card>
  );
}