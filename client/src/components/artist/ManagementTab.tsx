import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { Heart, Settings, Mic, Users, Calendar } from 'lucide-react';
import type { Artist } from './types';

interface MoodStatus {
  status: string;
  color: string;
  bgColor: string;
}

interface ArchetypeInfo {
  color: string;
  icon: any;
  description: string;
}

interface ManagementTabProps {
  artist: Artist;
  moodStatus: MoodStatus;
  archetypeInfo: ArchetypeInfo;
  onNavigate: (path: string) => void;
}

function ManagementTabComponent({
  artist,
  moodStatus,
  archetypeInfo,
  onNavigate,
}: ManagementTabProps) {
  return (
    <TabsContent value="management" className="space-y-6 relative z-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Artist Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <Heart className="w-5 h-5 text-negative" />
              <span>Artist Relationship</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-chip bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-text-primary">Overall Status</span>
                <Badge className={`${moodStatus.color} border-current`} variant="outline">
                  {moodStatus.status}
                </Badge>
              </div>
              <p className="text-sm text-text-body">
                {(artist.mood || 50) >= 70
                  ? 'Artist is happy and motivated. Continue current management approach.'
                  : (artist.mood || 50) >= 40
                  ? 'Artist relationship is stable but could be improved with attention.'
                  : 'Artist is unhappy. Immediate attention needed to improve relationship.'
                }
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]">
                <span className="text-sm text-text-muted">Talent</span>
                <span className={`font-mono text-sm font-medium ${(artist.talent || 0) >= 70 ? 'text-positive' : (artist.talent || 0) >= 40 ? 'text-warning' : 'text-negative'}`}>
                  {artist.talent || 0}%
                </span>
              </div>
            </div>

            {/* Archetype Information */}
            <div className="p-4 rounded-chip bg-neon-purple/[0.06] border border-neon-purple/30">
              <h4 className="font-medium mb-2 text-text-primary">Archetype: {artist.archetype}</h4>
              <p className="text-sm text-text-body mb-3">{archetypeInfo.description}</p>
              <div className="text-xs text-text-muted">
                <strong className="text-text-body">Management Tip:</strong> {
                  artist.archetype === 'Visionary'
                    ? 'Provide creative freedom and avoid purely commercial decisions.'
                    : artist.archetype === 'Workhorse'
                    ? 'Maintain consistent project flow and clear communication.'
                    : 'Focus on commercial viability and current market trends.'
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <Settings className="w-5 h-5 text-neon-lilac" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => onNavigate('/plan-release')}
            >
              <Mic className="w-4 h-4 mr-2" />
              Plan New Release
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              disabled
            >
              <Users className="w-4 h-4 mr-2" />
              Schedule Meeting
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              disabled
            >
              <Calendar className="w-4 h-4 mr-2" />
              View Contract
            </Button>

            <div className="pt-3 border-t border-white/[0.07]">
              <div className="text-sm text-text-muted mb-2">Weekly Cost</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-semibold text-money">${(artist.weeklyCost || artist.weeklyCost || 0).toLocaleString()}</span>
                <Badge variant="outline" className="text-xs">
                  Per Week
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}

export const ManagementTab = React.memo(ManagementTabComponent);
