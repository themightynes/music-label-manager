import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { useState } from 'react';

export function ActiveReleases() {
  const { releases, artists, songs, gameState } = useGameStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'released'>('upcoming');

  // Debug logging
  console.log('ActiveReleases Debug:', {
    totalReleases: releases?.length || 0,
    releases: releases,
    gameState: gameState?.id
  });

  const getUpcomingReleases = () => {
    const upcoming = releases.filter(r => r.status === 'planned');
    console.log('Filtered upcoming releases:', upcoming);
    return upcoming;
  };

  const getReleasedReleases = () => {
    return releases.filter(r => r.status !== 'planned');
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
                  <div key={release.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header Row */}
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-slate-900">{release.title}</h4>
                          {getReleaseTypeBadge(release.type)}
                          {getStatusBadge(release.status)}
                        </div>

                        {/* Artist and Details */}
                        <div className="flex items-center space-x-4 text-sm text-slate-600 mb-2">
                          <span>by {getArtistName(release.artistId)}</span>
                          <span>•</span>
                          <span>{getReleaseSongCount(release.id)} songs</span>
                          <span>•</span>
                          <span>Scheduled for {formatMonth(release.releaseMonth)}</span>
                        </div>

                        {/* Budget Info */}
                        <div className="text-sm text-slate-500">
                          Marketing Budget: ${(release.marketingBudget || 0).toLocaleString()}
                        </div>
                      </div>

                      {/* Timeline Indicator */}
                      <div className="text-right text-sm">
                        {release.releaseMonth && (
                          <div className={`font-medium ${
                            release.releaseMonth <= currentMonth 
                              ? 'text-red-600' 
                              : release.releaseMonth <= currentMonth + 1
                              ? 'text-orange-600'
                              : 'text-slate-600'
                          }`}>
                            {release.releaseMonth <= currentMonth 
                              ? 'Overdue' 
                              : release.releaseMonth === currentMonth + 1
                              ? 'Next Month'
                              : `${release.releaseMonth - currentMonth} months`
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
                  <div key={release.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header Row */}
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-slate-900">{release.title}</h4>
                          {getReleaseTypeBadge(release.type)}
                          {getStatusBadge(release.status)}
                        </div>

                        {/* Artist and Details */}
                        <div className="flex items-center space-x-4 text-sm text-slate-600 mb-2">
                          <span>by {getArtistName(release.artistId)}</span>
                          <span>•</span>
                          <span>{getReleaseSongCount(release.id)} songs</span>
                          <span>•</span>
                          <span>Released {formatMonth(release.releaseMonth)}</span>
                        </div>

                        {/* Performance Metrics */}
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          <span>Budget: ${(release.marketingBudget || 0).toLocaleString()}</span>
                          {release.streamsGenerated > 0 && (
                            <>
                              <span>•</span>
                              <span>Streams: {release.streamsGenerated.toLocaleString()}</span>
                            </>
                          )}
                          {release.revenueGenerated > 0 && (
                            <>
                              <span>•</span>
                              <span>Revenue: ${release.revenueGenerated.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}