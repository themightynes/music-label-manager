import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Heart, Info, ExternalLink } from 'lucide-react';
import { SongCatalog } from './SongCatalog';
import { useArtistROI } from '@/hooks/useAnalytics';
import { useGameStore } from '@/store/gameStore';

export interface ArtistCardProps {
  artist: any;
  insights: any;
  relationship: any;
  archetype: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMeet: () => void;
  onNavigate: () => void;
  gameState: any;
  roiData?: any; // Optional prop to avoid duplicate ROI fetching
}

export function ArtistCard({
  artist,
  insights,
  relationship,
  archetype,
  isExpanded,
  onToggleExpand,
  onMeet,
  onNavigate,
  gameState,
  roiData: passedRoiData
}: ArtistCardProps) {
  const { projects } = useGameStore();

  // Fetch ROI from backend only if not provided as prop (backward compatibility)
  const { data: fetchedRoiData } = useArtistROI(passedRoiData ? null : artist.id);
  const roiData = passedRoiData || fetchedRoiData;
  const avgROI = roiData?.overallROI ?? 0;

  // Helper function to determine artist status based on current projects
  const getArtistStatus = (artistId: string, currentWeek: number, projects: any[]) => {
    if (!projects || !Array.isArray(projects)) return 'IDLE';

    // Find active projects for this artist in the current week
    const artistProjects = projects.filter(project =>
      project.artistId === artistId &&
      project.stage === 'production' &&
      project.startWeek &&
      currentWeek >= project.startWeek
    );

    // Check for active tours (Mini-Tour type in production)
    const activeTour = artistProjects.find(project => project.type === 'Mini-Tour');
    if (activeTour) return 'ON TOUR';

    // Check for active recordings (Single/EP type in production)
    const activeRecording = artistProjects.find(project =>
      (project.type === 'Single' || project.type === 'EP')
    );
    if (activeRecording) return 'RECORDING';

    return 'IDLE';
  };

  const currentWeek = gameState?.currentWeek || 1;
  const artistStatus = getArtistStatus(artist.id, currentWeek, projects || []);

  // Get recommendations with backend ROI
  const getArtistRecommendations = (artist: any, insights: any, roi?: number) => {
    const recommendations = [];

    if (relationship.overallStatus < 60) {
      recommendations.push({
        type: 'urgent',
        text: `Schedule a meeting to address ${artist.name}'s concerns`,
        icon: '🤝'
      });
    }

    if (insights.releasedProjects === 0 && insights.projects > 0) {
      recommendations.push({
        type: 'action',
        text: 'Focus on completing current projects to build momentum',
        icon: '🎵'
      });
    }

    if (insights.projects === 0) {
      recommendations.push({
        type: 'action',
        text: `Start a ${archetype.idealProjects[0].toLowerCase()} to engage ${artist.name}`,
        icon: '🚀'
      });
    }

    if (roi !== undefined && roi < 0 && insights.releasedProjects > 0) {
      recommendations.push({
        type: 'strategy',
        text: 'Review project strategy - recent releases underperformed',
        icon: '📈'
      });
    }

    return recommendations;
  };

  const recommendations = getArtistRecommendations(artist, insights, avgROI);
  const StatusIcon = relationship.statusIcon;

  return (
    <div className="border border-brand-purple rounded-lg p-3">
      {/* Condensed Artist Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-medium text-white text-sm flex items-center">
            {artist.name}
            <StatusIcon className={`w-3 h-3 ml-1 ${relationship.statusColor}`} />
          </h4>
          <div className="flex items-center space-x-1 text-xs text-white/70">
            <span>{artist.archetype}</span>
            <span>•</span>
            <span className={relationship.statusColor}>{relationship.statusText}</span>
            <span>•</span>
            <span>${roiData?.totalRevenue?.toLocaleString() || insights.totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={`text-xs px-2 py-1 ${
              artistStatus === 'ON TOUR' ? 'bg-brand-burgundy text-white' :
              artistStatus === 'RECORDING' ? 'bg-brand-purple-light text-white' :
              'bg-brand-purple text-white/70'
            }`}
          >
            {artistStatus === 'ON TOUR' ? 'On Tour' :
             artistStatus === 'RECORDING' ? 'Recording' :
             'Idle'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="text-white/50 hover:text-white/70 p-1"
          >
            <Info className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Condensed Metrics */}
      <div className="grid grid-cols-5 gap-2 mb-2 text-center">
        <div className="p-1 bg-brand-dark-card/30 rounded text-xs">
          <div className="font-medium text-white">{insights.projects}</div>
          <div className="text-white/50">Projects</div>
        </div>
        <div className="p-1 bg-brand-dark-card/30 rounded text-xs">
          <div className={`font-medium ${avgROI >= 0 ? 'text-green-600' : avgROI < 0 ? 'text-red-600' : 'text-white'}`}>
            {roiData && (roiData.totalInvestment > 0 || roiData.totalRevenue > 0) ? `${avgROI > 0 ? '+' : ''}${avgROI.toFixed(0)}%` : '--'}
          </div>
          <div className="text-white/50">ROI</div>
        </div>
        <div className="p-1 bg-brand-dark-card/30 rounded text-xs">
          <div className={`font-medium ${(artist.mood || 50) >= 70 ? 'text-green-600' : (artist.mood || 50) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
            {artist.mood || 50}%
          </div>
          <div className="text-white/50">Mood</div>
        </div>
        <div className="p-1 bg-brand-dark-card/30 rounded text-xs">
          <div className={`font-medium ${(artist.loyalty || 50) >= 70 ? 'text-green-600' : (artist.loyalty || 50) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
            {artist.loyalty || 50}%
          </div>
          <div className="text-white/50">Loyalty</div>
        </div>
        <div className="p-1 bg-brand-dark-card/30 rounded text-xs">
          <div className={`font-medium ${(artist.popularity || 0) >= 70 ? 'text-green-600' : (artist.popularity || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
            {artist.popularity || 0}%
          </div>
          <div className="text-white/50">Popularity</div>
        </div>
      </div>

      {/* Priority Recommendation */}
      {recommendations.length > 0 && (
        <div className="mb-2">
          <div className={`text-xs p-2 rounded flex items-center space-x-2 ${
            recommendations[0].type === 'urgent' ? 'bg-red-900/30 text-red-300 border border-red-600/40' :
            recommendations[0].type === 'action' ? 'bg-brand-burgundy/20 text-brand-burgundy border border-brand-burgundy/40' :
            'bg-amber-900/30 text-amber-300 border border-amber-600/40'
          }`}>
            <span>{recommendations[0].icon}</span>
            <span className="flex-1 truncate">{recommendations[0].text}</span>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-brand-purple space-y-3">
          {/* Financial Summary */}
          {roiData && (roiData.totalRevenue > 0 || roiData.totalInvestment > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-brand-dark-card/30 rounded">
                <div className="text-white/50 mb-0.5">Total Revenue</div>
                <div className="font-mono font-semibold text-green-600">
                  ${(roiData.totalRevenue || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-2 bg-brand-dark-card/30 rounded">
                <div className="text-white/50 mb-0.5">Total Streams</div>
                <div className="font-mono font-semibold text-blue-600">
                  {((roiData.totalStreams || 0) / 1000).toFixed(0)}k
                </div>
              </div>
              <div className="p-2 bg-brand-dark-card/30 rounded">
                <div className="text-white/50 mb-0.5">Recording Costs</div>
                <div className="font-mono font-semibold text-white/70">
                  ${(roiData.totalProductionInvestment || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-2 bg-brand-dark-card/30 rounded">
                <div className="text-white/50 mb-0.5">Marketing Costs</div>
                <div className="font-mono font-semibold text-white/70">
                  ${(roiData.totalMarketingInvestment || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Archetype Details */}
          <div>
            <h5 className="text-xs font-semibold text-white/90 mb-2">Archetype: {artist.archetype}</h5>
            <p className="text-xs text-white/70 mb-2">{archetype.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-medium text-white/90">Strengths:</span>
                <ul className="text-white/70 ml-2 mt-1">
                  {archetype.strengths.map((strength: string, idx: number) => (
                    <li key={idx}>• {strength}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-white/90">Preferences:</span>
                <ul className="text-white/70 ml-2 mt-1">
                  {archetype.preferences.map((pref: string, idx: number) => (
                    <li key={idx}>• {pref}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Management Tips */}
          <div className="p-2 bg-brand-burgundy/20 border border-brand-burgundy/40 rounded">
            <div className="text-xs font-medium text-brand-burgundy mb-1">💡 Management Tip</div>
            <p className="text-xs text-brand-burgundy">{archetype.tips}</p>
          </div>

          {/* Detailed Mood/Loyalty Factors */}
          <div>
            <h5 className="text-xs font-semibold text-white/90 mb-2">What Affects {artist.name}</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-medium text-green-400">Positive Factors:</span>
                <ul className="text-white/70 ml-2 mt-1">
                  {archetype.moodFactors.positive.map((factor: string, idx: number) => (
                    <li key={idx}>• {factor}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-red-400">Negative Factors:</span>
                <ul className="text-white/70 ml-2 mt-1">
                  {archetype.moodFactors.negative.map((factor: string, idx: number) => (
                    <li key={idx}>• {factor}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* All Recommendations */}
          {recommendations.length > 2 && (
            <div>
              <h5 className="text-xs font-semibold text-white/90 mb-2">Additional Recommendations</h5>
              <div className="space-y-1">
                {recommendations.slice(2).map((rec, index) => (
                  <div key={index} className={`text-xs p-2 rounded flex items-center space-x-2 ${
                    rec.type === 'urgent' ? 'bg-red-900/30 text-red-300 border border-red-600/40' :
                    rec.type === 'action' ? 'bg-brand-burgundy/20 text-brand-burgundy border border-brand-burgundy/40' :
                    'bg-amber-900/30 text-amber-300 border border-amber-600/40'
                  }`}>
                    <span>{rec.icon}</span>
                    <span>{rec.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Song Catalog */}
          <SongCatalog
            artistId={artist.id}
            gameId={gameState?.id || ''}
            className="mt-4"
          />
        </div>
      )}

    </div>
  );
}

// Helper functions that were in the original ArtistCard
export const getArchetypeInfo = (archetype: string) => {
  const archetypeData: Record<string, any> = {
    'Visionary': {
      description: 'Creative and experimental',
      strengths: ['High creativity', 'Artistic integrity', 'Innovation'],
      preferences: ['Creative freedom', 'Artistic projects', 'Experimental approaches'],
      moodFactors: {
        positive: ['Creative projects', 'Artistic recognition', 'Freedom to experiment'],
        negative: ['Commercial pressure', 'Restrictive contracts', 'Rushed timelines']
      },
      idealProjects: ['Singles with artistic merit', 'Experimental EPs', 'Creative collaborations'],
      tips: 'Give creative freedom and avoid purely commercial decisions'
    },
    'Workhorse': {
      description: 'Reliable and productive',
      strengths: ['Consistency', 'Reliability', 'Work ethic'],
      preferences: ['Clear schedules', 'Professional environment', 'Regular projects'],
      moodFactors: {
        positive: ['Consistent work', 'Professional treatment', 'Meeting deadlines'],
        negative: ['Uncertainty', 'Chaotic schedules', 'Unclear expectations']
      },
      idealProjects: ['Regular single releases', 'Structured EP campaigns', 'Tour schedules'],
      tips: 'Maintain consistent project flow and clear communication'
    },
    'Trendsetter': {
      description: 'Trend-aware and commercial',
      strengths: ['Market awareness', 'Commercial appeal', 'Adaptability'],
      preferences: ['Trending sounds', 'Commercial success', 'Market opportunities'],
      moodFactors: {
        positive: ['Commercial success', 'Trending projects', 'Market recognition'],
        negative: ['Outdated approaches', 'Poor sales', 'Missing trends']
      },
      idealProjects: ['Commercial singles', 'Trend-following EPs', 'Market-focused campaigns'],
      tips: 'Focus on commercial viability and current market trends'
    }
  };

  return archetypeData[archetype] || archetypeData['Workhorse'];
};

export const getRelationshipStatus = (mood: number, loyalty: number) => {
  const moodStatus = mood >= 80 ? 'excellent' : mood >= 60 ? 'good' : mood >= 40 ? 'okay' : 'poor';
  const loyaltyStatus = loyalty >= 80 ? 'excellent' : loyalty >= 60 ? 'good' : loyalty >= 40 ? 'okay' : 'poor';

  const overallStatus = Math.floor((mood + loyalty) / 2);

  let statusColor = 'text-green-600';
  let statusIcon = TrendingUp;
  let statusText = 'Thriving';

  if (overallStatus < 40) {
    statusColor = 'text-red-600';
    statusIcon = TrendingDown;
    statusText = 'At Risk';
  } else if (overallStatus < 60) {
    statusColor = 'text-yellow-600';
    statusIcon = Heart;
    statusText = 'Stable';
  }

  return { moodStatus, loyaltyStatus, overallStatus, statusColor, statusIcon, statusText };
};