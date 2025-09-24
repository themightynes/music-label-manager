import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Play, 
  Music, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Target,
  Users,
  BarChart3,
  Award,
  Star,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import {
  extractCampaignData,
  getReleaseSongs,
  calculatePerformanceMetrics,
  analyzeTrackBreakdown,
  assessCampaignOutcome,
  formatCurrency,
  formatStreams,
  getEffectivenessStyle,
  type CampaignData,
  type PerformanceMetrics,
  type TrackBreakdown,
  type CampaignOutcome
} from '@/lib/releaseAnalytics';
import {
  formatChartPosition,
  formatChartMovement,
  getChartPositionColor,
  getMovementColor
} from '../../../shared/utils/chartUtils';

interface ReleaseWorkflowCardProps {
  release: any;
  currentWeek: number;
  artistName: string;
  onReleasePage?: boolean;
  songs?: any[]; // Songs from useGameStore for enhanced released view
}

export function ReleaseWorkflowCard({ 
  release, 
  currentWeek, 
  artistName,
  onReleasePage = false,
  songs = []
}: ReleaseWorkflowCardProps) {
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);
  
  const metadata = release.metadata as any;
  const leadSingleStrategy = metadata?.leadSingleStrategy;
  const hasLeadSingle = leadSingleStrategy && release.type !== 'single';
  
  // Get release songs for enhanced analytics
  const releaseSongs = getReleaseSongs(release.id, songs);
  const campaignData = extractCampaignData(release);
  
  // Calculate actual totals from songs if release totals are missing
  const totalStreamsFromSongs = releaseSongs.reduce((sum, song) => sum + (song.totalStreams || 0), 0);
  const totalRevenueFromSongs = releaseSongs.reduce((sum, song) => sum + (song.totalRevenue || 0), 0);
  
  // Use song totals if release totals are 0 or missing
  const actualTotalStreams = release.streamsGenerated || totalStreamsFromSongs;
  const actualTotalRevenue = release.revenueGenerated || totalRevenueFromSongs;
  
  // Debug logging for released items
  if (release.status === 'released') {
    console.log('ReleaseWorkflowCard Debug - Released Item:', {
      releaseId: release.id,
      releaseTitle: release.title,
      status: release.status,
      originalStreams: release.streamsGenerated || 0,
      originalRevenue: release.revenueGenerated || 0,
      calculatedStreams: totalStreamsFromSongs,
      calculatedRevenue: totalRevenueFromSongs,
      actualTotalStreams,
      actualTotalRevenue,
      songsProvided: songs?.length || 0,
      releaseSongsFound: releaseSongs.length,
      metadata: release.metadata,
      leadSingleStrategy,
      hasLeadSingle,
      campaignData: {
        ...campaignData,
        breakdown: {
          leadSingleBudget: campaignData.leadSingleBudget,
          mainBudget: campaignData.mainBudget,
          totalInvestment: campaignData.totalInvestment
        }
      }
    });
  }
  
  // Calculate timeline progress
  const getTimelineProgress = () => {
    if (!hasLeadSingle) {
      // Simple single release or EP without lead single
      const progress = currentWeek >= release.releaseWeek ? 100 : 0;
      return { progress, phase: progress === 100 ? 'released' : 'planned' };
    }
    
    // Multi-phase campaign
    const leadWeek = leadSingleStrategy.leadSingleReleaseWeek;
    const mainWeek = release.releaseWeek;
    
    if (currentWeek < leadWeek) {
      return { progress: 0, phase: 'pre-campaign' };
    } else if (currentWeek >= leadWeek && currentWeek < mainWeek) {
      const campaignProgress = ((currentWeek - leadWeek + 1) / (mainWeek - leadWeek + 1)) * 50;
      return { progress: campaignProgress, phase: 'lead-single-active' };
    } else if (currentWeek >= mainWeek) {
      return { progress: 100, phase: 'fully-released' };
    }
    
    return { progress: 0, phase: 'planned' };
  };

  const timeline = getTimelineProgress();

  // Calculate enhanced metrics for ALL released items
  const isReleased = timeline.phase === 'released' || timeline.phase === 'fully-released';

  // Chart badge rendering function - consistent with ActiveReleases
  const renderChartBadge = (song: any) => {
    if (!song.chartPosition) return null;

    return (
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs font-semibold rounded ${getChartPositionColor(song.chartPosition)}`}>
          {formatChartPosition(song.chartPosition)}
        </span>
        {song.chartMovement && song.chartMovement !== 0 && (
          <span className={`text-xs ${getMovementColor(song.chartMovement)}`}>
            {formatChartMovement(song.chartMovement)}
          </span>
        )}
        {song.weeksOnChart && (
          <span className="text-xs text-white/50">
            {song.weeksOnChart}w
          </span>
        )}
        {song.peakPosition && (
          <span className="text-xs text-white/50">
            Peak {formatChartPosition(song.peakPosition)}
          </span>
        )}
      </div>
    );
  };
  
  let performanceMetrics: PerformanceMetrics | null = null;
  let trackBreakdown: TrackBreakdown | null = null;
  let campaignOutcome: CampaignOutcome | null = null;
  
  // Always calculate metrics for released items to show enhanced UI
  if (isReleased) {
    // Create release object with corrected totals for metrics calculations
    const releaseWithActuals = {
      ...release,
      streamsGenerated: actualTotalStreams,
      revenueGenerated: actualTotalRevenue
    };
    
    performanceMetrics = calculatePerformanceMetrics(releaseWithActuals, releaseSongs, campaignData);
    // Only create track breakdown if we have songs
    if (releaseSongs.length > 0) {
      trackBreakdown = analyzeTrackBreakdown(releaseWithActuals, releaseSongs);
    }
    campaignOutcome = assessCampaignOutcome(performanceMetrics, campaignData);
  }
  
  // Get phase display info
  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'pre-campaign':
        return {
          icon: Clock,
          color: 'text-white/50 bg-[#3c252d]/30',
          label: 'Campaign Planned',
          description: 'Release strategy ready to execute'
        };
      case 'lead-single-active':
        return {
          icon: Play,
          color: 'text-[#A75A5B] bg-[#A75A5B]/20',
          label: 'Lead Single Live',
          description: 'Building momentum for main release'
        };
      case 'fully-released':
        return {
          icon: CheckCircle,
          color: 'text-green-600 bg-green-100',
          label: 'Campaign Complete',
          description: 'Full release strategy executed'
        };
      case 'released':
        return {
          icon: CheckCircle,
          color: 'text-green-600 bg-green-100',
          label: 'Released',
          description: 'Single release complete'
        };
      default:
        return {
          icon: Calendar,
          color: 'text-yellow-600 bg-yellow-100',
          label: 'Scheduled',
          description: 'Awaiting release week'
        };
    }
  };

  const phaseInfo = getPhaseInfo(timeline.phase);
  const PhaseIcon = phaseInfo.icon;

  // Enhanced Released View Components
  const renderCampaignSummary = () => {
    if (!campaignOutcome) return null;
    
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white/90 flex items-center space-x-2">
          <Award className="w-4 h-4" />
          <span>Campaign Summary</span>
        </h4>
        
        <div className={`p-3 rounded-lg border ${campaignOutcome.color.replace('text-', 'border-').replace('bg-', 'border-').replace('-600', '-200').replace('-100', '-200')}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{campaignOutcome.icon}</span>
              <div>
                <div className="font-medium text-sm capitalize">{campaignOutcome.tier.replace('_', ' ')}</div>
                <div className="text-xs text-white/70">{campaignOutcome.description}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{campaignData.strategy === 'lead_single' ? 'Lead Single Strategy' : 'Direct Release'}</div>
              <div className="text-xs text-white/50">{campaignData.campaignDuration} week campaign</div>
            </div>
          </div>
          
          {(campaignData.totalInvestment > 0 || releaseSongs.some(s => s.productionBudget > 0)) && (
            <div className="mt-2 pt-2 border-t border-current border-opacity-20">
              {/* Calculate production costs */}
              {(() => {
                const totalProductionCost = releaseSongs.reduce((sum, song) => 
                  sum + (song.productionBudget || 0), 0
                );
                const totalMarketingCost = campaignData.totalInvestment;
                const grandTotal = totalProductionCost + totalMarketingCost;
                
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Total Investment:</span>
                      <span className="font-mono font-semibold">{formatCurrency(grandTotal)}</span>
                    </div>
                    
                    {/* Cost breakdown */}
                    <div className="mt-1 space-y-0.5 text-xs text-white/50">
                      {totalProductionCost > 0 && (
                        <div className="flex justify-between">
                          <span className="ml-2">Recording Sessions:</span>
                          <span>{formatCurrency(totalProductionCost)}</span>
                        </div>
                      )}
                      {totalMarketingCost > 0 && (
                        <div className="flex justify-between">
                          <span className="ml-2">Total Marketing:</span>
                          <span>{formatCurrency(totalMarketingCost)}</span>
                        </div>
                      )}
                      {/* Sub-breakdown of marketing if applicable */}
                      {campaignData.leadSingleBudget > 0 && (
                        <div className="flex justify-between ml-4 text-white/40">
                          <span>• Lead Single:</span>
                          <span>{formatCurrency(campaignData.leadSingleBudget)}</span>
                        </div>
                      )}
                      {campaignData.mainBudget > 0 && campaignData.leadSingleBudget > 0 && (
                        <div className="flex justify-between ml-4 text-white/40">
                          <span>• Main Release:</span>
                          <span>{formatCurrency(campaignData.mainBudget)}</span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              
              {performanceMetrics && (
                <div className="flex justify-between text-sm mt-1">
                  <span>ROI:</span>
                  <span className={`font-mono font-semibold ${
                    performanceMetrics.totalROI >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(performanceMetrics.totalROI * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderTrackBreakdown = () => {
    // Always show track breakdown section for released items, even without linked songs
    if (!trackBreakdown) return null;
    
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white/90 flex items-center space-x-2">
          <Music className="w-4 h-4" />
          <span>Track Performance</span>
        </h4>
        
        {trackBreakdown.leadSingle && (
          <div className="p-3 bg-[#A75A5B]/10 border border-[#A75A5B]/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-[#A75A5B]" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{trackBreakdown.leadSingle.song.title}</span>
                    {renderChartBadge(trackBreakdown.leadSingle.song)}
                  </div>
                  <div className="text-xs text-[#A75A5B]">Lead Single</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-semibold">{formatStreams(trackBreakdown.leadSingle.streams)}</div>
                <div className="text-xs text-white/50">{trackBreakdown.leadSingle.contributionPercentage.toFixed(0)}% of revenue</div>
              </div>
            </div>
          </div>
        )}
        
        {trackBreakdown.mainTracks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-white/50 font-medium">All Tracks:</div>
            {trackBreakdown.mainTracks.slice(0, showDetailedAnalytics ? undefined : 3).map((track, index) => (
              <div key={track.song.id} className="flex items-center justify-between p-2 bg-[#3c252d]/20 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-white/50 w-4">#{track.rank}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{track.song.title}</span>
                      {renderChartBadge(track.song)}
                    </div>
                    <div className="text-xs text-white/50">Quality: {track.song.quality || 'N/A'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">{formatStreams(track.streams)}</div>
                  <div className="text-xs text-white/50">{formatCurrency(track.revenue)}</div>
                </div>
              </div>
            ))}
            
            {trackBreakdown.mainTracks.length > 3 && (
              <button
                onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
                className="w-full text-xs text-white/50 hover:text-white/90 flex items-center justify-center space-x-1 py-1"
              >
                {showDetailedAnalytics ? (
                  <><ChevronUp className="w-3 h-3" /><span>Show Less</span></>
                ) : (
                  <><ChevronDown className="w-3 h-3" /><span>Show All {trackBreakdown.mainTracks.length} Tracks</span></>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };
  
  const renderPerformanceAnalytics = () => {
    if (!performanceMetrics || !showDetailedAnalytics) return null;
    
    const effectivenessStyle = getEffectivenessStyle(performanceMetrics.campaignEffectiveness);
    
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white/90 flex items-center space-x-2">
          <BarChart3 className="w-4 h-4" />
          <span>Performance Analytics</span>
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-[#3c252d]/20 rounded">
            <div className="text-xs text-white/50">Campaign Effectiveness</div>
            <div className={`text-sm font-semibold ${effectivenessStyle.color.split(' ')[0]}`}>
              {effectivenessStyle.label}
            </div>
          </div>
          
          <div className="p-2 bg-[#3c252d]/20 rounded">
            <div className="text-xs text-white/50">Cost Per Stream</div>
            <div className="text-sm font-mono font-semibold">
              ${performanceMetrics.costPerStream.toFixed(3)}
            </div>
          </div>
          
          <div className="p-2 bg-[#3c252d]/20 rounded">
            <div className="text-xs text-white/50">Avg Revenue/Track</div>
            <div className="text-sm font-mono font-semibold">
              {formatCurrency(performanceMetrics.averageRevenuePerTrack)}
            </div>
          </div>
          
          <div className="p-2 bg-[#3c252d]/20 rounded">
            <div className="text-xs text-white/50">Stream Distribution</div>
            <div className="text-sm font-semibold capitalize">
              {performanceMetrics.streamDistribution.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`transition-all ${
      timeline.phase === 'lead-single-active' ? 'ring-2 ring-[#A75A5B]/20 bg-[#A75A5B]/10/30' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-3 text-base">
              <span>{release.title}</span>
              <Badge variant="outline" className="text-xs">
                {release.type.toUpperCase()}
              </Badge>
            </CardTitle>
            <p className="text-sm text-white/70 mt-1">by {artistName}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-full ${phaseInfo.color}`}>
              <PhaseIcon className="w-4 h-4" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Phase Status */}
        <div className="flex items-center justify-between p-3 bg-[#3c252d]/20 rounded-lg">
          <div>
            <div className="font-medium text-sm text-white">{phaseInfo.label}</div>
            <div className="text-xs text-white/70">{phaseInfo.description}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-semibold">{Math.round(timeline.progress)}%</div>
            <div className="text-xs text-white/50">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={timeline.progress} 
            className="h-2" 
          />
          <div className="text-xs text-white/50 text-center">
            Campaign Progress
          </div>
        </div>

        {/* Campaign Timeline */}
        {hasLeadSingle && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/90 flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Campaign Timeline</span>
            </h4>
            
            <div className="space-y-2">
              {/* Lead Single Phase */}
              <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                currentWeek >= leadSingleStrategy.leadSingleReleaseWeek 
                  ? 'bg-green-900/30 border border-green-600/40' 
                  : currentWeek === leadSingleStrategy.leadSingleReleaseWeek - 1
                  ? 'bg-amber-900/30 border border-amber-600/40'
                  : 'bg-[#3c252d]/20'
              }`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  currentWeek >= leadSingleStrategy.leadSingleReleaseWeek 
                    ? 'bg-green-600' 
                    : currentWeek === leadSingleStrategy.leadSingleReleaseWeek - 1
                    ? 'bg-amber-600'
                    : 'bg-[#65557c]/60'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Play className="w-3 h-3" />
                    <span className="text-sm font-medium">Lead Single</span>
                    <Badge variant="secondary" className="text-xs">
                      Week {leadSingleStrategy.leadSingleReleaseWeek}
                    </Badge>
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    Build anticipation and test market reception
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-white/50" />
              </div>

              {/* Main Release Phase */}
              <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                currentWeek >= release.releaseWeek 
                  ? 'bg-green-900/30 border border-green-600/40' 
                  : currentWeek === release.releaseWeek - 1
                  ? 'bg-amber-900/30 border border-amber-600/40'
                  : 'bg-[#3c252d]/20'
              }`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  currentWeek >= release.releaseWeek 
                    ? 'bg-green-600' 
                    : currentWeek === release.releaseWeek - 1
                    ? 'bg-amber-600'
                    : 'bg-[#65557c]/60'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Music className="w-3 h-3" />
                    <span className="text-sm font-medium">Full {release.type}</span>
                    <Badge variant="secondary" className="text-xs">
                      Week {release.releaseWeek}
                    </Badge>
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    Complete release with lead single momentum
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Marketing Investment */}
        {release.marketingBudget && (
          <div className="pt-2 border-t border-[#4e324c]">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-white/70" />
                <span className="text-white/70">Total Marketing</span>
              </div>
              <span className="font-mono font-semibold">
                ${(release.marketingBudget + (leadSingleStrategy?.totalLeadSingleBudget || 0)).toLocaleString()}
              </span>
            </div>
            
            {hasLeadSingle && leadSingleStrategy.totalLeadSingleBudget > 0 && (
              <div className="mt-2 space-y-1 text-xs text-white/50">
                <div className="flex justify-between">
                  <span>Lead Single Campaign:</span>
                  <span>${leadSingleStrategy.totalLeadSingleBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Main Release Campaign:</span>
                  <span>${release.marketingBudget.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Performance Section - Shows for ALL released items */}
        {isReleased && (
          <div className="space-y-4">
            {/* Basic Performance Metrics */}
            <div className="pt-2 border-t border-[#4e324c]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-mono font-semibold text-[#A75A5B]">
                    {formatStreams(actualTotalStreams)}
                  </div>
                  <div className="text-xs text-white/70">Total Streams</div>
                </div>
                <div className="text-center">
                  <div className="font-mono font-semibold text-green-600">
                    {formatCurrency(actualTotalRevenue)}
                  </div>
                  <div className="text-xs text-white/70">Revenue</div>
                </div>
              </div>
            </div>
            
            {/* Campaign Summary - Always shows for released items */}
            {renderCampaignSummary()}
            
            {/* Track Breakdown - Shows if songs are available */}
            {renderTrackBreakdown()}
            
            {/* Detailed Analytics Toggle */}
            <div className="pt-2 border-t border-[#4e324c]">
              <button
                onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
                className="w-full text-sm text-white/70 hover:text-white flex items-center justify-center space-x-2 py-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>{showDetailedAnalytics ? 'Hide' : 'Show'} Detailed Analytics</span>
                {showDetailedAnalytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Performance Analytics */}
            {renderPerformanceAnalytics()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}