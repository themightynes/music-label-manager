import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Heart, Info, ExternalLink } from 'lucide-react';
import { SongCatalog } from './SongCatalog';
import { useArtistROI } from '@/hooks/useAnalytics';
import { useProjects } from '@/hooks/useProjects';
import { getArtistStatus } from '@/utils/tourHelpers';

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
  // Phase 3 PR-7: projects are cache-owned; read via useProjects.
  const { data: projects = [] } = useProjects();

  // Fetch ROI from backend only if not provided as prop (backward compatibility)
  const { data: fetchedRoiData } = useArtistROI(passedRoiData ? null : artist.id);
  const roiData = passedRoiData || fetchedRoiData;
  const avgROI = roiData?.overallROI ?? 0;

  const currentWeek = gameState?.currentWeek || 1;
  const artistStatus = getArtistStatus(artist.id, currentWeek, projects || []);
  const energyValue = artist.energy ?? artist.loyalty ?? 50;
  const energyColor = energyValue >= 70 ? 'text-positive' : energyValue >= 40 ? 'text-warning' : 'text-negative';

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
    <div className="relative border border-white/[0.08] rounded-card p-3 bg-surface-inner/50">
      {/* Condensed Artist Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-medium text-text-primary text-sm flex items-center">
            {artist.name}
            <StatusIcon className={`w-3 h-3 ml-1 ${relationship.statusColor}`} />
          </h4>
          <div className="flex items-center space-x-1 text-xs text-text-body">
            <span>{artist.archetype}</span>
            <span>•</span>
            <span className={relationship.statusColor}>{relationship.statusText}</span>
            <span>•</span>
            <span className="font-mono text-money">${roiData?.totalRevenue?.toLocaleString() || insights.totalRevenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`text-xs px-2 py-1 ${
              artistStatus === 'ON TOUR' ? 'border-neon-magenta/40 bg-neon-magenta/[0.14] text-neon-magenta' :
              artistStatus === 'RECORDING' ? 'border-neon-purple/40 bg-neon-purple/[0.14] text-neon-purple' :
              'border-white/10 bg-white/[0.04] text-text-muted'
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
            className="text-text-muted hover:text-text-body p-1"
          >
            <Info className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Condensed Metrics */}
      <div className="grid grid-cols-6 gap-2 mb-2 text-center">
        <div className="p-1 bg-white/[0.03] rounded-chip text-xs">
          <div className="font-medium font-mono text-text-primary">{insights.projects}</div>
          <div className="text-text-muted">Projects</div>
        </div>
        <div className="p-1 bg-white/[0.03] rounded-chip text-xs">
          <div className={`font-medium font-mono ${avgROI >= 0 ? 'text-positive' : avgROI < 0 ? 'text-negative' : 'text-text-primary'}`}>
            {roiData && (roiData.totalInvestment > 0 || roiData.totalRevenue > 0) ? `${avgROI > 0 ? '+' : ''}${avgROI.toFixed(0)}%` : '--'}
          </div>
          <div className="text-text-muted">ROI</div>
        </div>
        <div className="p-1 bg-white/[0.03] rounded-chip text-xs">
          <div className={`font-medium font-mono ${(artist.mood || 50) >= 70 ? 'text-positive' : (artist.mood || 50) >= 40 ? 'text-warning' : 'text-negative'}`}>
            {artist.mood || 50}%
          </div>
          <div className="text-text-muted">Mood</div>
        </div>
        <div className="p-1 bg-white/[0.03] rounded-chip text-xs">
          <div className={`font-medium font-mono ${energyColor}`}>
            {energyValue}%
          </div>
          <div className="text-text-muted">Energy</div>
        </div>
        <div className="p-1 bg-white/[0.03] rounded-chip text-xs">
          <div className={`font-medium font-mono ${(artist.popularity || 0) >= 70 ? 'text-positive' : (artist.popularity || 0) >= 40 ? 'text-warning' : 'text-negative'}`}>
            {artist.popularity || 0}%
          </div>
          <div className="text-text-muted">Popularity</div>
        </div>
        <div className="p-1 bg-white/[0.03] rounded-chip text-xs">
          <div className={`font-medium font-mono ${(artist.talent || 0) >= 70 ? 'text-positive' : (artist.talent || 0) >= 40 ? 'text-warning' : 'text-negative'}`}>
            {artist.talent || 0}%
          </div>
          <div className="text-text-muted">Talent</div>
        </div>
      </div>

      {/* Priority Recommendation */}
      {recommendations.length > 0 && (
        <div className="mb-2">
          <div className={`text-xs p-2 rounded-chip flex items-center space-x-2 ${
            recommendations[0].type === 'urgent' ? 'bg-negative/[0.14] text-negative border border-negative/40' :
            recommendations[0].type === 'action' ? 'bg-neon-lilac/[0.14] text-neon-lilac border border-neon-lilac/40' :
            'bg-warning/[0.14] text-warning border border-warning/40'
          }`}>
            <span>{recommendations[0].icon}</span>
            <span className="flex-1 truncate">{recommendations[0].text}</span>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-3">
          {/* Financial Summary */}
          {roiData && (roiData.totalRevenue > 0 || roiData.totalInvestment > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-white/[0.03] rounded-chip">
                <div className="text-text-muted mb-0.5">Total Revenue</div>
                <div className="font-mono font-semibold text-positive">
                  ${(roiData.totalRevenue || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-2 bg-white/[0.03] rounded-chip">
                <div className="text-text-muted mb-0.5">Total Streams</div>
                <div className="font-mono font-semibold text-neon-cyan">
                  {((roiData.totalStreams || 0) / 1000).toFixed(0)}k
                </div>
              </div>
              <div className="p-2 bg-white/[0.03] rounded-chip">
                <div className="text-text-muted mb-0.5">Recording Costs</div>
                <div className="font-mono font-semibold text-text-body">
                  ${(roiData.totalProductionInvestment || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-2 bg-white/[0.03] rounded-chip">
                <div className="text-text-muted mb-0.5">Marketing Costs</div>
                <div className="font-mono font-semibold text-text-body">
                  ${(roiData.totalMarketingInvestment || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Archetype Details */}
          <div>
            <h5 className="text-xs font-semibold text-text-primary mb-2">Archetype: {artist.archetype}</h5>
            <p className="text-xs text-text-body mb-2">{archetype.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-medium text-text-primary">Strengths:</span>
                <ul className="text-text-body ml-2 mt-1">
                  {archetype.strengths.map((strength: string, idx: number) => (
                    <li key={idx}>• {strength}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-text-primary">Preferences:</span>
                <ul className="text-text-body ml-2 mt-1">
                  {archetype.preferences.map((pref: string, idx: number) => (
                    <li key={idx}>• {pref}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Management Tips */}
          <div className="p-2 bg-neon-lilac/[0.14] border border-neon-lilac/40 rounded-chip">
            <div className="text-xs font-medium text-neon-lilac mb-1">💡 Management Tip</div>
            <p className="text-xs text-neon-lilac/90">{archetype.tips}</p>
          </div>

          {/* Detailed Mood Factors */}
          <div>
            <h5 className="text-xs font-semibold text-text-primary mb-2">What Affects {artist.name}</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-medium text-positive">Positive Factors:</span>
                <ul className="text-text-body ml-2 mt-1">
                  {archetype.moodFactors.positive.map((factor: string, idx: number) => (
                    <li key={idx}>• {factor}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-negative">Negative Factors:</span>
                <ul className="text-text-body ml-2 mt-1">
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
              <h5 className="text-xs font-semibold text-text-primary mb-2">Additional Recommendations</h5>
              <div className="space-y-1">
                {recommendations.slice(2).map((rec, index) => (
                  <div key={index} className={`text-xs p-2 rounded-chip flex items-center space-x-2 ${
                    rec.type === 'urgent' ? 'bg-negative/[0.14] text-negative border border-negative/40' :
                    rec.type === 'action' ? 'bg-neon-lilac/[0.14] text-neon-lilac border border-neon-lilac/40' :
                    'bg-warning/[0.14] text-warning border border-warning/40'
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

export const getRelationshipStatus = (mood: number, energy: number) => {
  const moodStatus = mood >= 80 ? 'excellent' : mood >= 60 ? 'good' : mood >= 40 ? 'okay' : 'poor';
  const energyStatus = energy >= 80 ? 'excellent' : energy >= 60 ? 'good' : energy >= 40 ? 'okay' : 'poor';

  const overallStatus = Math.floor((mood + energy) / 2);

  let statusColor = 'text-positive';
  let statusIcon = TrendingUp;
  let statusText = 'Thriving';

  if (overallStatus < 40) {
    statusColor = 'text-negative';
    statusIcon = TrendingDown;
    statusText = 'At Risk';
  } else if (overallStatus < 60) {
    statusColor = 'text-warning';
    statusIcon = Heart;
    statusText = 'Stable';
  }

  return {
    moodStatus,
    energyStatus,
    loyaltyStatus: energyStatus,
    overallStatus,
    statusColor,
    statusIcon,
    statusText
  };
};