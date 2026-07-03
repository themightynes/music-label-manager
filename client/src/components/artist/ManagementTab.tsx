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
            <CardTitle className="flex items-center space-x-2">
              <Heart className="w-5 h-5" />
              <span>Artist Relationship</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg ${moodStatus.bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Overall Status</span>
                <Badge className={`${moodStatus.color} border-current`} variant="outline">
                  {moodStatus.status}
                </Badge>
              </div>
              <p className="text-sm text-white/70">
                {(artist.mood || 50) >= 70
                  ? 'Artist is happy and motivated. Continue current management approach.'
                  : (artist.mood || 50) >= 40
                  ? 'Artist relationship is stable but could be improved with attention.'
                  : 'Artist is unhappy. Immediate attention needed to improve relationship.'
                }
              </p>
            </div>

            {/* Archetype Information */}
            <div className="p-4 border border-brand-purple/50 rounded-lg">
              <h4 className="font-medium mb-2">Archetype: {artist.archetype}</h4>
              <p className="text-sm text-white/70 mb-3">{archetypeInfo.description}</p>
              <div className="text-xs text-white/50">
                <strong>Management Tip:</strong> {
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
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
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

            <div className="pt-3 border-t border-brand-purple/50">
              <div className="text-sm text-white/70 mb-2">Weekly Cost</div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">${(artist.weeklyCost || artist.weeklyCost || 0).toLocaleString()}</span>
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
