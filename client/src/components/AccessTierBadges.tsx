import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameState } from '@shared/types/gameTypes';
import { Key, Music, Megaphone, Building } from 'lucide-react';

interface AccessTierBadgesProps {
  gameState: GameState;
}

export function AccessTierBadges({ gameState }: AccessTierBadgesProps) {

  if (!gameState) return null;

  const getAccessBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'None': return 'secondary';
      case 'Niche':
      case 'Blogs':
      case 'Clubs': return 'default';
      case 'Mid':
      case 'Mid-Tier': return 'default';
      case 'Flagship':
      case 'Major':
      case 'Theaters': return 'default';
      default: return 'secondary';
    }
  };

  const getAccessBadgeClass = (tier: string) => {
    switch (tier) {
      case 'None': return 'bg-gray-600 text-gray-300';
      case 'Niche':
      case 'Blogs':
      case 'Clubs': return 'bg-green-600 text-white';
      case 'Mid':
      case 'Mid-Tier': return 'bg-yellow-600 text-white';
      case 'Flagship':
      case 'Major':
      case 'Theaters': return 'bg-purple-600 text-white';
      default: return 'bg-gray-600 text-gray-300';
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-yellow-500 flex items-center">
          <Key className="w-5 h-5 mr-2" />
          Access Tiers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Playlist Access */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Music className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-sm font-medium text-white">Playlist Access</div>
                <div className="text-xs text-gray-400">Streaming platforms</div>
              </div>
            </div>
            <Badge className={`text-xs font-medium px-2 py-1 rounded-full ${getAccessBadgeClass(gameState.playlistAccess || 'None')}`}>
              {gameState.playlistAccess || 'None'}
            </Badge>
          </div>

          {/* Press Access */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Megaphone className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-sm font-medium text-white">Press Access</div>
                <div className="text-xs text-gray-400">Media coverage</div>
              </div>
            </div>
            <Badge className={`text-xs font-medium px-2 py-1 rounded-full ${getAccessBadgeClass(gameState.pressAccess || 'None')}`}>
              {gameState.pressAccess || 'None'}
            </Badge>
          </div>

          {/* Venue Access */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Building className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-sm font-medium text-white">Venue Access</div>
                <div className="text-xs text-gray-400">Live performances</div>
              </div>
            </div>
            <Badge className={`text-xs font-medium px-2 py-1 rounded-full ${getAccessBadgeClass(gameState.venueAccess || 'None')}`}>
              {gameState.venueAccess || 'None'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
