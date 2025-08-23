import React from 'react';
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
  Users
} from 'lucide-react';

interface ReleaseWorkflowCardProps {
  release: any;
  currentMonth: number;
  artistName: string;
  onReleasePage?: boolean;
}

export function ReleaseWorkflowCard({ 
  release, 
  currentMonth, 
  artistName,
  onReleasePage = false 
}: ReleaseWorkflowCardProps) {
  const metadata = release.metadata as any;
  const leadSingleStrategy = metadata?.leadSingleStrategy;
  const hasLeadSingle = leadSingleStrategy && release.type !== 'single';
  
  // Calculate timeline progress
  const getTimelineProgress = () => {
    if (!hasLeadSingle) {
      // Simple single release or EP without lead single
      const progress = currentMonth >= release.releaseMonth ? 100 : 0;
      return { progress, phase: progress === 100 ? 'released' : 'planned' };
    }
    
    // Multi-phase campaign
    const leadMonth = leadSingleStrategy.leadSingleReleaseMonth;
    const mainMonth = release.releaseMonth;
    
    if (currentMonth < leadMonth) {
      return { progress: 0, phase: 'pre-campaign' };
    } else if (currentMonth >= leadMonth && currentMonth < mainMonth) {
      const campaignProgress = ((currentMonth - leadMonth + 1) / (mainMonth - leadMonth + 1)) * 50;
      return { progress: campaignProgress, phase: 'lead-single-active' };
    } else if (currentMonth >= mainMonth) {
      return { progress: 100, phase: 'fully-released' };
    }
    
    return { progress: 0, phase: 'planned' };
  };

  const timeline = getTimelineProgress();
  
  // Get phase display info
  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'pre-campaign':
        return {
          icon: Clock,
          color: 'text-slate-500 bg-slate-100',
          label: 'Campaign Planned',
          description: 'Release strategy ready to execute'
        };
      case 'lead-single-active':
        return {
          icon: Play,
          color: 'text-blue-600 bg-blue-100',
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
          description: 'Awaiting release month'
        };
    }
  };

  const phaseInfo = getPhaseInfo(timeline.phase);
  const PhaseIcon = phaseInfo.icon;

  return (
    <Card className={`transition-all ${
      timeline.phase === 'lead-single-active' ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''
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
            <p className="text-sm text-slate-600 mt-1">by {artistName}</p>
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
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <div className="font-medium text-sm text-slate-900">{phaseInfo.label}</div>
            <div className="text-xs text-slate-600">{phaseInfo.description}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-semibold">{Math.round(timeline.progress)}%</div>
            <div className="text-xs text-slate-500">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={timeline.progress} 
            className="h-2" 
          />
          <div className="text-xs text-slate-500 text-center">
            Campaign Progress
          </div>
        </div>

        {/* Campaign Timeline */}
        {hasLeadSingle && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Campaign Timeline</span>
            </h4>
            
            <div className="space-y-2">
              {/* Lead Single Phase */}
              <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                currentMonth >= leadSingleStrategy.leadSingleReleaseMonth 
                  ? 'bg-green-50 border border-green-200' 
                  : currentMonth === leadSingleStrategy.leadSingleReleaseMonth - 1
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-slate-50'
              }`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  currentMonth >= leadSingleStrategy.leadSingleReleaseMonth 
                    ? 'bg-green-500' 
                    : currentMonth === leadSingleStrategy.leadSingleReleaseMonth - 1
                    ? 'bg-yellow-500'
                    : 'bg-slate-300'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Play className="w-3 h-3" />
                    <span className="text-sm font-medium">Lead Single</span>
                    <Badge variant="secondary" className="text-xs">
                      Month {leadSingleStrategy.leadSingleReleaseMonth}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Build anticipation and test market reception
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Main Release Phase */}
              <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                currentMonth >= release.releaseMonth 
                  ? 'bg-green-50 border border-green-200' 
                  : currentMonth === release.releaseMonth - 1
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-slate-50'
              }`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  currentMonth >= release.releaseMonth 
                    ? 'bg-green-500' 
                    : currentMonth === release.releaseMonth - 1
                    ? 'bg-yellow-500'
                    : 'bg-slate-300'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Music className="w-3 h-3" />
                    <span className="text-sm font-medium">Full {release.type}</span>
                    <Badge variant="secondary" className="text-xs">
                      Month {release.releaseMonth}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Complete release with lead single momentum
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Marketing Investment */}
        {release.marketingBudget && (
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-slate-600" />
                <span className="text-slate-600">Total Marketing</span>
              </div>
              <span className="font-mono font-semibold">
                ${(release.marketingBudget + (leadSingleStrategy?.totalLeadSingleBudget || 0)).toLocaleString()}
              </span>
            </div>
            
            {hasLeadSingle && leadSingleStrategy.totalLeadSingleBudget > 0 && (
              <div className="mt-2 space-y-1 text-xs text-slate-500">
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

        {/* Performance Metrics (if available) */}
        {release.streamsGenerated > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="font-mono font-semibold text-blue-600">
                  {release.streamsGenerated.toLocaleString()}
                </div>
                <div className="text-xs text-slate-600">Total Streams</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-semibold text-green-600">
                  ${release.revenueGenerated.toLocaleString()}
                </div>
                <div className="text-xs text-slate-600">Revenue</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}