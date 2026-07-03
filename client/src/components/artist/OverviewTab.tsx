import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TabsContent } from '@/components/ui/tabs';
import { User, Music, BarChart3, Activity } from 'lucide-react';
import { ArtistCard, getArchetypeInfo as getArtistCardArchetypeInfo, getRelationshipStatus } from '@/components/ArtistCard';
import type { Artist, Song } from './types';
import { getQualityColor } from './artistPageUtils';
import { PerformanceMetrics } from './PerformanceMetrics';

interface OverviewTabProps {
  artist: Artist;
  songs: Song[];
  artistId: string;
  avgQuality: number;
  projectCount: number;
  insights: any;
  roiData?: any;
  gameState: any;
  expandedArtist: boolean;
  onToggleExpand: () => void;
  onMeet: () => void;
  onNavigate: () => void;
}

function OverviewTabComponent({
  artist,
  songs,
  artistId,
  avgQuality,
  projectCount,
  insights,
  roiData,
  gameState,
  expandedArtist,
  onToggleExpand,
  onMeet,
  onNavigate,
}: OverviewTabProps) {
  return (
    <TabsContent value="overview" className="space-y-6">
      {/* Rich Artist Card */}
      <Card className="relative z-20">
          <CardHeader>
            <CardTitle className="flex items-center justify-center space-x-2">
              <User className="w-5 h-5" />
              <span>Artist Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ArtistCard
              artist={artist}
              insights={insights}
              relationship={getRelationshipStatus(artist.mood || 50, artist.energy ?? (artist as any).loyalty ?? 50)}
              archetype={getArtistCardArchetypeInfo(artist.archetype)}
              isExpanded={expandedArtist}
              onToggleExpand={onToggleExpand}
              onMeet={onMeet}
              onNavigate={onNavigate}
              gameState={gameState}
              roiData={roiData}
            />
          </CardContent>
        </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Artist Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Artist Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Mood</span>
                  <span className={`font-medium ${(artist.mood || 50) >= 70 ? 'text-green-600' : (artist.mood || 50) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {artist.mood || 50}%
                  </span>
                </div>
                <Progress value={artist.mood || 50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                <span>Energy</span>
                  <span className={`font-medium ${((artist.energy ?? (artist as any).loyalty ?? 50) >= 70) ? 'text-green-600' : ((artist.energy ?? (artist as any).loyalty ?? 50) >= 40) ? 'text-yellow-600' : 'text-red-600'}`}>
                    {artist.energy ?? (artist as any).loyalty ?? 50}%
                  </span>
                </div>
                <Progress value={artist.energy ?? (artist as any).loyalty ?? 50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Talent</span>
                  <span className="font-medium">{artist.talent || 50}%</span>
                </div>
                <Progress value={artist.talent || 50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Work Ethic</span>
                  <span className="font-medium">{artist.workEthic || 50}%</span>
                </div>
                <Progress value={artist.workEthic || 50} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PerformanceMetrics
              artistId={artistId || ''}
              avgQuality={avgQuality}
              projectCount={projectCount}
              readySongs={songs.filter(s => s.isRecorded && !s.isReleased).length}
              popularity={artist.popularity || 0}
              roiData={roiData}
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {songs.length === 0 ? (
                <div className="text-center text-white/50 py-4">
                  <Music className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                <>
                  {songs.slice(0, 3).map(song => (
                    <div key={song.id} className="flex items-center justify-between p-2 bg-brand-dark-card/5 rounded">
                      <div>
                        <div className="text-sm font-medium">{song.title}</div>
                        <div className="text-xs text-white/50">
                          {song.isReleased ? 'Released' : song.isRecorded ? 'Recorded' : 'Recording'} • Week {song.createdWeek}
                        </div>
                      </div>
                      <Badge className={getQualityColor(song.quality)}>
                        {song.quality}
                      </Badge>
                    </div>
                  ))}
                  {songs.length > 3 && (
                    <div className="text-center">
                      <Button variant="ghost" size="sm">
                        View All {songs.length} Songs
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}

export const OverviewTab = React.memo(OverviewTabComponent);
