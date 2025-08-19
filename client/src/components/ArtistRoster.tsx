import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { ArtistDiscoveryModal } from './ArtistDiscoveryModal';
import { useState } from 'react';
import { TrendingUp, TrendingDown, Heart, Star, Info, DollarSign } from 'lucide-react';
import { SongCatalog } from './SongCatalog';

export function ArtistRoster() {
  const { gameState, artists, signArtist, openDialogue, projects } = useGameStore();
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);

  const handleSignArtist = async (artistData: any) => {
    try {
      await signArtist(artistData);
    } catch (error) {
      console.error('Failed to sign artist:', error);
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleArtistMeeting = async (artist: any) => {
    await openDialogue('Artist', `meeting_${artist.id}`);
  };

  // Enhanced artist analytics
  const getArtistInsights = (artist: any) => {
    const archetype = artist.archetype;
    const mood = artist.mood || 50;
    const loyalty = artist.loyalty || 50;
    const popularity = artist.popularity || 0;
    
    // Artist projects
    const artistProjects = projects.filter(p => p.artistId === artist.id);
    const releasedProjects = artistProjects.filter(p => p.stage === 'released');
    
    // Calculate total revenue from artist projects
    const totalRevenue = releasedProjects.reduce((sum, project) => {
      const metadata = project.metadata as any || {};
      return sum + (metadata.revenue || 0);
    }, 0);

    // Performance metrics
    const avgROI = releasedProjects.length > 0 ? 
      releasedProjects.reduce((sum, project) => {
        const metadata = project.metadata as any || {};
        const budget = project.totalCost || project.budgetPerSong || 0;
        const revenue = metadata.revenue || 0;
        return sum + (budget > 0 ? ((revenue - budget) / budget) * 100 : 0);
      }, 0) / releasedProjects.length : 0;

    return {
      projects: artistProjects.length,
      releasedProjects: releasedProjects.length,
      totalRevenue,
      avgROI,
      archetype,
      mood,
      loyalty,
      popularity
    };
  };

  // Get archetype-specific preferences and traits
  const getArchetypeInfo = (archetype: string) => {
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

  // Get mood/loyalty status and recommendations
  const getRelationshipStatus = (mood: number, loyalty: number) => {
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

  // Get recommendations for improving artist relationship
  const getArtistRecommendations = (artist: any, insights: any) => {
    const archetype = getArchetypeInfo(artist.archetype);
    const relationship = getRelationshipStatus(artist.mood || 50, artist.loyalty || 50);
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

    if (insights.avgROI < 0 && insights.releasedProjects > 0) {
      recommendations.push({
        type: 'strategy',
        text: 'Review project strategy - recent releases underperformed',
        icon: '📈'
      });
    }

    return recommendations;
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
      <CardContent className="p-4">
        <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-microphone text-secondary mr-2"></i>
            Artist Roster
          </div>
          <Badge variant="secondary" className="text-xs">
            {artists?.length || 0}/3
          </Badge>
        </h3>

        <div className="space-y-3">

          {/* Empty state when no artists */}
          {(!artists || artists.length === 0) && (
            <div className="text-center text-slate-500 py-6">
              <i className="fas fa-microphone text-slate-300 text-3xl mb-3"></i>
              <p className="text-sm font-medium text-slate-600 mb-2">No Artists Signed</p>
              <p className="text-xs text-slate-500 mb-4">Discover talent to build your roster</p>
              <Button
                onClick={() => setShowDiscoveryModal(true)}
                size="sm"
                className="bg-primary text-white hover:bg-primary/90"
              >
                <i className="fas fa-search mr-1"></i>
                Discover Artists
              </Button>
            </div>
          )}

          {/* Enhanced Artist Cards */}
          {artists && artists.length > 0 && artists.map(artist => {
            const insights = getArtistInsights(artist);
            const archetype = getArchetypeInfo(artist.archetype);
            const relationship = getRelationshipStatus(artist.mood || 50, artist.loyalty || 50);
            const recommendations = getArtistRecommendations(artist, insights);
            const isExpanded = expandedArtist === artist.id;
            const StatusIcon = relationship.statusIcon;

            return (
              <div key={artist.id} className="border border-slate-200 rounded-lg p-3">
                {/* Condensed Artist Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm flex items-center">
                      {artist.name}
                      <StatusIcon className={`w-3 h-3 ml-1 ${relationship.statusColor}`} />
                    </h4>
                    <div className="flex items-center space-x-1 text-xs text-slate-600">
                      <span>{artist.archetype}</span>
                      <span>•</span>
                      <span className={relationship.statusColor}>{relationship.statusText}</span>
                      <span>•</span>
                      <span>${insights.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedArtist(isExpanded ? null : artist.id)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <Info className="w-3 h-3" />
                  </Button>
                </div>

                {/* Condensed Metrics */}
                <div className="grid grid-cols-4 gap-2 mb-2 text-center">
                  <div className="p-1 bg-slate-50 rounded text-xs">
                    <div className="font-medium text-slate-900">{insights.projects}</div>
                    <div className="text-slate-500">Projects</div>
                  </div>
                  <div className="p-1 bg-slate-50 rounded text-xs">
                    <div className={`font-medium ${insights.avgROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {insights.releasedProjects > 0 ? `${insights.avgROI > 0 ? '+' : ''}${insights.avgROI.toFixed(0)}%` : '--'}
                    </div>
                    <div className="text-slate-500">ROI</div>
                  </div>
                  <div className="p-1 bg-slate-50 rounded text-xs">
                    <div className={`font-medium ${(artist.mood || 50) >= 70 ? 'text-green-600' : (artist.mood || 50) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {artist.mood || 50}%
                    </div>
                    <div className="text-slate-500">Mood</div>
                  </div>
                  <div className="p-1 bg-slate-50 rounded text-xs">
                    <div className={`font-medium ${(artist.loyalty || 50) >= 70 ? 'text-green-600' : (artist.loyalty || 50) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {artist.loyalty || 50}%
                    </div>
                    <div className="text-slate-500">Loyalty</div>
                  </div>
                </div>

                {/* Priority Recommendation */}
                {recommendations.length > 0 && (
                  <div className="mb-2">
                    <div className={`text-xs p-2 rounded flex items-center space-x-2 ${
                      recommendations[0].type === 'urgent' ? 'bg-red-50 text-red-700' :
                      recommendations[0].type === 'action' ? 'bg-blue-50 text-blue-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                      <span>{recommendations[0].icon}</span>
                      <span className="flex-1 truncate">{recommendations[0].text}</span>
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
                    {/* Archetype Details */}
                    <div>
                      <h5 className="text-xs font-semibold text-slate-700 mb-2">Archetype: {artist.archetype}</h5>
                      <p className="text-xs text-slate-600 mb-2">{archetype.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="font-medium text-slate-700">Strengths:</span>
                          <ul className="text-slate-600 ml-2 mt-1">
                            {archetype.strengths.map((strength: string, idx: number) => (
                              <li key={idx}>• {strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Preferences:</span>
                          <ul className="text-slate-600 ml-2 mt-1">
                            {archetype.preferences.map((pref: string, idx: number) => (
                              <li key={idx}>• {pref}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Management Tips */}
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="text-xs font-medium text-blue-700 mb-1">💡 Management Tip</div>
                      <p className="text-xs text-blue-600">{archetype.tips}</p>
                    </div>

                    {/* Detailed Mood/Loyalty Factors */}
                    <div>
                      <h5 className="text-xs font-semibold text-slate-700 mb-2">What Affects {artist.name}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="font-medium text-green-700">Positive Factors:</span>
                          <ul className="text-slate-600 ml-2 mt-1">
                            {archetype.moodFactors.positive.map((factor: string, idx: number) => (
                              <li key={idx}>• {factor}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-medium text-red-700">Negative Factors:</span>
                          <ul className="text-slate-600 ml-2 mt-1">
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
                        <h5 className="text-xs font-semibold text-slate-700 mb-2">Additional Recommendations</h5>
                        <div className="space-y-1">
                          {recommendations.slice(2).map((rec, index) => (
                            <div key={index} className={`text-xs p-2 rounded flex items-center space-x-2 ${
                              rec.type === 'urgent' ? 'bg-red-50 text-red-700' :
                              rec.type === 'action' ? 'bg-blue-50 text-blue-700' :
                              'bg-yellow-50 text-yellow-700'
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

                {/* Compact Action Buttons */}
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleArtistMeeting(artist)}
                  >
                    <i className="fas fa-handshake mr-1"></i>
                    Meet
                  </Button>
                  {insights.projects === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-green-600 hover:text-green-700"
                      onClick={() => {
                        console.log('Start project for', artist.name);
                      }}
                    >
                      <i className="fas fa-plus mr-1"></i>
                      Project
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Browse Talent - Compact */}
          {artists && artists.length > 0 && artists.length < 3 && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-indigo-700 text-xs font-medium w-full"
                onClick={() => setShowDiscoveryModal(true)}
              >
                <i className="fas fa-plus mr-1"></i>
                {artists.length >= 3 ? 'Roster Full' : 'Browse Talent'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Artist Discovery Modal */}
      {gameState && (
        <ArtistDiscoveryModal
          open={showDiscoveryModal}
          onOpenChange={setShowDiscoveryModal}
          gameState={gameState}
          signedArtists={artists as any[]}
          onSignArtist={handleSignArtist}
        />
      )}
    </Card>
  );
}
