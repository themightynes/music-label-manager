import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { Clock, PlayCircle } from 'lucide-react';
import { ReleaseWorkflowCard } from '@/components/ReleaseWorkflowCard';
import type { Song, Release } from './types';

interface ReleasesTabProps {
  artistReleases: Release[];
  songs: Song[];
  artistName: string;
  currentWeek: number;
  onNavigate: (path: string) => void;
}

function ReleasesTabComponent({
  artistReleases,
  songs,
  artistName,
  currentWeek,
  onNavigate,
}: ReleasesTabProps) {
  return (
    <TabsContent value="releases" className="space-y-6 relative z-20">
      {/* Upcoming Releases */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Upcoming Releases</span>
          <Badge variant="outline" className="ml-2">
            {artistReleases.filter(r => r.status === 'planned').length}
          </Badge>
        </h3>

        {artistReleases.filter(r => r.status === 'planned').length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/70 mb-4">No planned releases</p>
              <Button onClick={() => onNavigate('/plan-release')}>
                Plan New Release
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {artistReleases.filter(r => r.status === 'planned').map(release => (
              <ReleaseWorkflowCard
                key={release.id}
                release={release}
                currentWeek={currentWeek}
                artistName={artistName}
                songs={songs}
                onReleasePage={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Released */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <PlayCircle className="w-5 h-5" />
          <span>Released</span>
          <Badge variant="outline" className="ml-2">
            {artistReleases.filter(r => r.status === 'released' || r.status === 'catalog').length}
          </Badge>
        </h3>

        {artistReleases.filter(r => r.status === 'released' || r.status === 'catalog').length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <PlayCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/70">No releases yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {artistReleases.filter(r => r.status === 'released' || r.status === 'catalog').map(release => (
              <ReleaseWorkflowCard
                key={release.id}
                release={release}
                currentWeek={currentWeek}
                artistName={artistName}
                songs={songs}
                onReleasePage={true}
              />
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  );
}

export const ReleasesTab = React.memo(ReleasesTabComponent);
