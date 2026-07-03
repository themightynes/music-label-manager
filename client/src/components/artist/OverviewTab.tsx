import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

// Stat value color by threshold (mood/energy semantics per design-system-v2 §6)
function statValueColor(value: number) {
  if (value >= 70) return 'text-positive';
  if (value >= 40) return 'text-warning';
  return 'text-negative';
}

// Progress bar fill gradient by threshold (artist-detail.html Artist Stats panel)
function statBarGradient(value: number) {
  if (value >= 70) return 'from-positive to-neon-cyan';
  if (value >= 40) return 'from-warning to-neon-amber';
  return 'from-negative to-neon-magenta';
}

// Lightweight labeled stat bar — 6px pill track, semantic gradient fill by value.
// The shared shadcn Progress component always renders the action-pink→purple
// gradient regardless of value, so these stat rows render their own bar to
// honor the mood/energy/talent/work-ethic threshold coloring from the spec.
function StatBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-pill bg-white/[0.08] overflow-hidden">
      <div
        className={`h-full rounded-pill bg-gradient-to-r ${statBarGradient(value)}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
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
  const mood = artist.mood || 50;
  const energy = artist.energy ?? (artist as any).loyalty ?? 50;
  const talent = artist.talent || 50;
  const workEthic = artist.workEthic || 50;

  return (
    <TabsContent value="overview" className="space-y-6">
      {/* Rich Artist Card */}
      <Card className="relative z-20">
          <CardHeader>
            <CardTitle className="flex items-center justify-center space-x-2 text-base">
              <User className="w-5 h-5 text-neon-lilac" />
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
            <CardTitle className="flex items-center space-x-2 text-base">
              <User className="w-5 h-5 text-neon-lilac" />
              <span>Artist Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-text-body">Mood</span>
                  <span className={`font-mono font-medium ${statValueColor(mood)}`}>
                    {mood}%
                  </span>
                </div>
                <StatBar value={mood} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-text-body">Energy</span>
                  <span className={`font-mono font-medium ${statValueColor(energy)}`}>
                    {energy}%
                  </span>
                </div>
                <StatBar value={energy} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-text-body">Talent</span>
                  <span className={`font-mono font-medium ${statValueColor(talent)}`}>{talent}%</span>
                </div>
                <StatBar value={talent} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-text-body">Work Ethic</span>
                  <span className={`font-mono font-medium ${statValueColor(workEthic)}`}>{workEthic}%</span>
                </div>
                <StatBar value={workEthic} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <BarChart3 className="w-5 h-5 text-neon-lilac" />
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
            <CardTitle className="flex items-center space-x-2 text-base">
              <Activity className="w-5 h-5 text-neon-lilac" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {songs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-6 min-h-[200px]">
                  <div className="w-[54px] h-[54px] rounded-chip bg-neon-purple/10 border border-neon-purple/[0.28] flex items-center justify-center mb-4 shadow-glow-purple">
                    <Music className="w-5 h-5 text-neon-lilac" />
                  </div>
                  <p className="text-sm font-semibold text-text-body">No activity yet</p>
                  <p className="text-xs text-text-muted mt-1 max-w-[190px]">
                    Book a session or plan a release to get things moving.
                  </p>
                </div>
              ) : (
                <>
                  {songs.slice(0, 3).map(song => (
                    <div key={song.id} className="flex items-center justify-between p-2.5 rounded-chip bg-white/[0.02] border border-white/[0.05]">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{song.title}</div>
                        <div className="text-xs text-text-muted">
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
