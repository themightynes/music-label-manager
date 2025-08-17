import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';

export function AccessTierBadges() {
  const { gameState } = useGameStore();

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
      case 'None': return 'bg-slate-400 text-white';
      case 'Niche':
      case 'Blogs':
      case 'Clubs': return 'bg-success text-white';
      case 'Mid':
      case 'Mid-Tier': return 'bg-warning text-white';
      case 'Flagship':
      case 'Major':
      case 'Theaters': return 'bg-primary text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <i className="fas fa-key text-primary mr-2"></i>
          Access Tiers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Playlist Access */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <i className="fas fa-list-ul text-primary"></i>
              <div>
                <div className="text-sm font-medium text-slate-900">Playlist Access</div>
                <div className="text-xs text-slate-600">Streaming platforms</div>
              </div>
            </div>
            <Badge className={`text-xs font-medium px-2 py-1 rounded-full ${getAccessBadgeClass(gameState.playlistAccess || 'none')}`}>
              {gameState.playlistAccess || 'none'}
            </Badge>
          </div>

          {/* Press Access */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <i className="fas fa-newspaper text-warning"></i>
              <div>
                <div className="text-sm font-medium text-slate-900">Press Access</div>
                <div className="text-xs text-slate-600">Media coverage</div>
              </div>
            </div>
            <Badge className={`text-xs font-medium px-2 py-1 rounded-full ${getAccessBadgeClass(gameState.pressAccess || 'none')}`}>
              {gameState.pressAccess || 'none'}
            </Badge>
          </div>

          {/* Venue Access */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <i className="fas fa-building text-secondary"></i>
              <div>
                <div className="text-sm font-medium text-slate-900">Venue Access</div>
                <div className="text-xs text-slate-600">Live performances</div>
              </div>
            </div>
            <Badge className={`text-xs font-medium px-2 py-1 rounded-full ${getAccessBadgeClass(gameState.venueAccess || 'none')}`}>
              {gameState.venueAccess || 'none'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
