import React, { useState } from 'react';
import { cn } from '@/lib/utils';
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

// v2 chip recipe (spec §6): mono 11-12px, rounded-pill, hue-tinted bg/border/text
const CHIP_BASE = 'inline-flex items-center rounded-pill font-mono text-[11px] px-2.5 py-1 border';

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
          <span className="text-xs text-[rgba(233,230,244,0.5)]">
            {song.weeksOnChart}w
          </span>
        )}
        {song.peakPosition && (
          <span className="text-xs text-[rgba(233,230,244,0.5)]">
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

  // Get phase display info — v2 hue-tinted chip colors instead of flat light bg/text
  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'pre-campaign':
        return {
          icon: Clock,
          color: 'text-[rgba(233,230,244,0.6)] bg-white/[0.06]',
          label: 'Campaign Planned',
          description: 'Release strategy ready to execute'
        };
      case 'lead-single-active':
        return {
          icon: Play,
          color: 'text-neon-lilac bg-neon-purple/20',
          label: 'Lead Single Live',
          description: 'Building momentum for main release'
        };
      case 'fully-released':
        return {
          icon: CheckCircle,
          color: 'text-positive bg-positive/15',
          label: 'Campaign Complete',
          description: 'Full release strategy executed'
        };
      case 'released':
        return {
          icon: CheckCircle,
          color: 'text-positive bg-positive/15',
          label: 'Released',
          description: 'Single release complete'
        };
      default:
        return {
          icon: Calendar,
          color: 'text-warning bg-warning/15',
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
        <h4 className="text-sm font-semibold text-foreground flex items-center space-x-2">
          <Award className="w-4 h-4 text-neon-lilac" />
          <span>Campaign Summary</span>
        </h4>

        <div className="p-3 rounded-lg border border-white/[0.08] bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{campaignOutcome.icon}</span>
              <div>
                <div className="font-medium text-sm capitalize text-foreground">{campaignOutcome.tier.replace('_', ' ')}</div>
                <div className="text-xs text-[rgba(233,230,244,0.6)]">{campaignOutcome.description}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">{campaignData.strategy === 'lead_single' ? 'Lead Single Strategy' : 'Direct Release'}</div>
              <div className="text-xs text-[rgba(233,230,244,0.5)]">{campaignData.campaignDuration} week campaign</div>
            </div>
          </div>

          {(campaignData.totalInvestment > 0 || releaseSongs.some(s => s.productionBudget > 0)) && (
            <div className="mt-2 pt-2 border-t border-white/[0.08]">
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
                      <span className="text-[rgba(233,230,244,0.7)]">Total Investment:</span>
                      <span className="font-mono font-semibold text-money">{formatCurrency(grandTotal)}</span>
                    </div>

                    {/* Cost breakdown */}
                    <div className="mt-1 space-y-0.5 text-xs text-[rgba(233,230,244,0.5)]">
                      {totalProductionCost > 0 && (
                        <div className="flex justify-between">
                          <span className="ml-2">Recording Sessions:</span>
                          <span className="font-mono">{formatCurrency(totalProductionCost)}</span>
                        </div>
                      )}
                      {totalMarketingCost > 0 && (
                        <div className="flex justify-between">
                          <span className="ml-2">Total Marketing:</span>
                          <span className="font-mono">{formatCurrency(totalMarketingCost)}</span>
                        </div>
                      )}
                      {/* Sub-breakdown of marketing if applicable */}
                      {campaignData.leadSingleBudget > 0 && (
                        <div className="flex justify-between ml-4 text-[rgba(233,230,244,0.4)]">
                          <span>&bull; Lead Single:</span>
                          <span className="font-mono">{formatCurrency(campaignData.leadSingleBudget)}</span>
                        </div>
                      )}
                      {campaignData.mainBudget > 0 && campaignData.leadSingleBudget > 0 && (
                        <div className="flex justify-between ml-4 text-[rgba(233,230,244,0.4)]">
                          <span>&bull; Main Release:</span>
                          <span className="font-mono">{formatCurrency(campaignData.mainBudget)}</span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {performanceMetrics && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[rgba(233,230,244,0.7)]">ROI:</span>
                  <span className={cn(
                    'font-mono font-semibold',
                    performanceMetrics.totalROI >= 0 ? 'text-positive' : 'text-negative'
                  )}>
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
        <h4 className="text-sm font-semibold text-foreground flex items-center space-x-2">
          <Music className="w-4 h-4 text-neon-lilac" />
          <span>Track Performance</span>
        </h4>

        {trackBreakdown.leadSingle && (
          <div className="p-3 rounded-lg border border-neon-purple/30 bg-neon-purple/[0.08]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-neon-lilac" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm text-foreground">{trackBreakdown.leadSingle.song.title}</span>
                    {renderChartBadge(trackBreakdown.leadSingle.song)}
                  </div>
                  <div className="text-xs text-neon-lilac">Lead Single</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-semibold text-foreground">{formatStreams(trackBreakdown.leadSingle.streams)}</div>
                <div className="text-xs text-[rgba(233,230,244,0.5)]">{trackBreakdown.leadSingle.contributionPercentage.toFixed(0)}% of revenue</div>
              </div>
            </div>
          </div>
        )}

        {trackBreakdown.mainTracks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-[rgba(233,230,244,0.5)] font-medium">All Tracks:</div>
            {trackBreakdown.mainTracks.slice(0, showDetailedAnalytics ? undefined : 3).map((track, index) => (
              <div key={track.song.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[rgba(233,230,244,0.5)] w-4">#{track.rank}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-foreground">{track.song.title}</span>
                      {renderChartBadge(track.song)}
                    </div>
                    <div className="text-xs text-[rgba(233,230,244,0.5)]">Quality: {track.song.quality || 'N/A'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-foreground">{formatStreams(track.streams)}</div>
                  <div className="text-xs text-[rgba(233,230,244,0.5)]">{formatCurrency(track.revenue)}</div>
                </div>
              </div>
            ))}

            {trackBreakdown.mainTracks.length > 3 && (
              <button
                onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
                className="w-full text-xs text-[rgba(233,230,244,0.5)] hover:text-foreground flex items-center justify-center space-x-1 py-1 transition-colors"
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
        <h4 className="text-sm font-semibold text-foreground flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-neon-lilac" />
          <span>Performance Analytics</span>
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="text-xs text-[rgba(233,230,244,0.5)]">Campaign Effectiveness</div>
            <div className={cn('text-sm font-semibold', effectivenessStyle.color.split(' ')[0])}>
              {effectivenessStyle.label}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="text-xs text-[rgba(233,230,244,0.5)]">Cost Per Stream</div>
            <div className="text-sm font-mono font-semibold text-money">
              ${performanceMetrics.costPerStream.toFixed(3)}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="text-xs text-[rgba(233,230,244,0.5)]">Avg Revenue/Track</div>
            <div className="text-sm font-mono font-semibold text-money">
              {formatCurrency(performanceMetrics.averageRevenuePerTrack)}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="text-xs text-[rgba(233,230,244,0.5)]">Stream Distribution</div>
            <div className="text-sm font-semibold capitalize text-foreground">
              {performanceMetrics.streamDistribution.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      'glass-panel chromatic-hairline p-5 transition-all',
      timeline.phase === 'lead-single-active' && 'border-neon-purple/40 shadow-[0_0_16px_rgba(160,90,240,0.25)]'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-foreground">{release.title}</span>
            <span className={cn(CHIP_BASE, 'bg-white/[0.06] border-white/[0.12] text-[rgba(233,230,244,0.75)]')}>
              {release.type.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-[rgba(233,230,244,0.6)] mt-1">by {artistName}</p>
        </div>

        <div className={cn('p-1.5 rounded-full', phaseInfo.color)}>
          <PhaseIcon className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Phase Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div>
            <div className="font-medium text-sm text-foreground">{phaseInfo.label}</div>
            <div className="text-xs text-[rgba(233,230,244,0.6)]">{phaseInfo.description}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-semibold text-foreground">{Math.round(timeline.progress)}%</div>
            <div className="text-xs text-[rgba(233,230,244,0.5)]">Complete</div>
          </div>
        </div>

        {/* Progress Bar — v2 pill track/fill (spec §6) */}
        <div className="space-y-2">
          <div className="h-[6px] rounded-pill bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-pill bg-gradient-to-r from-neon-purple to-neon-cyan transition-all"
              style={{ width: `${Math.min(100, Math.max(0, timeline.progress))}%` }}
            />
          </div>
          <div className="text-xs text-[rgba(233,230,244,0.5)] text-center">
            Campaign Progress
          </div>
        </div>

        {/* Campaign Timeline */}
        {hasLeadSingle && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Target className="w-4 h-4 text-neon-lilac" />
              <span>Campaign Timeline</span>
            </h4>

            <div className="space-y-2">
              {/* Lead Single Phase */}
              <div className={cn(
                'flex items-center space-x-3 p-2 rounded-lg border transition-colors',
                currentWeek >= leadSingleStrategy.leadSingleReleaseWeek
                  ? 'bg-positive/10 border-positive/30'
                  : currentWeek === leadSingleStrategy.leadSingleReleaseWeek - 1
                  ? 'bg-warning/10 border-warning/30'
                  : 'bg-white/[0.03] border-white/[0.06]'
              )}>
                <div className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  currentWeek >= leadSingleStrategy.leadSingleReleaseWeek
                    ? 'bg-positive'
                    : currentWeek === leadSingleStrategy.leadSingleReleaseWeek - 1
                    ? 'bg-warning'
                    : 'bg-neon-purple/50'
                )} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Play className="w-3 h-3 text-[rgba(233,230,244,0.7)]" />
                    <span className="text-sm font-medium text-foreground">Lead Single</span>
                    <span className={cn(CHIP_BASE, 'bg-white/[0.06] border-white/[0.12] text-[rgba(233,230,244,0.75)]')}>
                      Week {leadSingleStrategy.leadSingleReleaseWeek}
                    </span>
                  </div>
                  <div className="text-xs text-[rgba(233,230,244,0.6)] mt-1">
                    Build anticipation and test market reception
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-[rgba(233,230,244,0.4)]" />
              </div>

              {/* Main Release Phase */}
              <div className={cn(
                'flex items-center space-x-3 p-2 rounded-lg border transition-colors',
                currentWeek >= release.releaseWeek
                  ? 'bg-positive/10 border-positive/30'
                  : currentWeek === release.releaseWeek - 1
                  ? 'bg-warning/10 border-warning/30'
                  : 'bg-white/[0.03] border-white/[0.06]'
              )}>
                <div className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  currentWeek >= release.releaseWeek
                    ? 'bg-positive'
                    : currentWeek === release.releaseWeek - 1
                    ? 'bg-warning'
                    : 'bg-neon-purple/50'
                )} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Music className="w-3 h-3 text-[rgba(233,230,244,0.7)]" />
                    <span className="text-sm font-medium text-foreground">Full {release.type}</span>
                    <span className={cn(CHIP_BASE, 'bg-white/[0.06] border-white/[0.12] text-[rgba(233,230,244,0.75)]')}>
                      Week {release.releaseWeek}
                    </span>
                  </div>
                  <div className="text-xs text-[rgba(233,230,244,0.6)] mt-1">
                    Complete release with lead single momentum
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Marketing Investment */}
        {release.marketingBudget && (
          <div className="pt-2 border-t border-white/[0.08]">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[rgba(233,230,244,0.6)]" />
                <span className="text-[rgba(233,230,244,0.7)]">Total Marketing</span>
              </div>
              <span className="font-mono font-semibold text-money">
                {formatCurrency(campaignData.totalInvestment)}
              </span>
            </div>

            {hasLeadSingle && leadSingleStrategy.totalLeadSingleBudget > 0 && (
              <div className="mt-2 space-y-1 text-xs text-[rgba(233,230,244,0.5)]">
                <div className="flex justify-between">
                  <span>Lead Single Campaign:</span>
                  <span className="font-mono">${leadSingleStrategy.totalLeadSingleBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Main Release Campaign:</span>
                  <span className="font-mono">{formatCurrency(campaignData.mainBudget)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Performance Section - Shows for ALL released items */}
        {isReleased && (
          <div className="space-y-4">
            {/* Basic Performance Metrics — stat blocks (spec §6) */}
            <div className="pt-2 border-t border-white/[0.08]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-mono font-semibold text-foreground">
                    {formatStreams(actualTotalStreams)}
                  </div>
                  <div className="text-xs text-[rgba(233,230,244,0.6)]">Total Streams</div>
                </div>
                <div className="text-center">
                  <div className="font-mono font-semibold text-money">
                    {formatCurrency(actualTotalRevenue)}
                  </div>
                  <div className="text-xs text-[rgba(233,230,244,0.6)]">Revenue</div>
                </div>
              </div>
            </div>

            {/* Campaign Summary - Always shows for released items */}
            {renderCampaignSummary()}

            {/* Track Breakdown - Shows if songs are available */}
            {renderTrackBreakdown()}

            {/* Detailed Analytics Toggle */}
            <div className="pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
                className="w-full text-sm text-[rgba(233,230,244,0.7)] hover:text-foreground flex items-center justify-center space-x-2 py-2 transition-colors"
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
      </div>
    </div>
  );
}
