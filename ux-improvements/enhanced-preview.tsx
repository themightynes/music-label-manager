import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, Target, Star, BarChart3, PieChart, Calendar, AlertCircle } from 'lucide-react';

// Enhanced Release Preview with Better Data Visualization
export function EnhancedReleasePreview({ metrics, decisions, gameState }) {
  const [activeView, setActiveView] = useState<'overview' | 'breakdown' | 'timeline'>('overview');

  const roi = metrics.projectedROI || 0;
  const roiColor = roi > 50 ? 'text-green-600' : roi > 0 ? 'text-blue-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* ROI Alert */}
      {roi < 0 && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">
            This release may lose money. Consider adjusting your marketing budget.
          </span>
        </div>
      )}

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 gap-3">
        <PerformanceCard
          title="Revenue Impact"
          value={`$${(metrics.estimatedRevenue || 0).toLocaleString()}`}
          subtitle={`-$${(metrics.totalMarketingCost || 0).toLocaleString()} cost`}
          trend={roi}
          icon={DollarSign}
          color={roi > 0 ? 'green' : 'red'}
        />
        <PerformanceCard
          title="Reach Potential"
          value={`${(metrics.estimatedStreams || 0).toLocaleString()}`}
          subtitle="estimated streams"
          trend={Math.round(((metrics.marketingMultiplier || 1) - 1) * 100)}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Quality & Strategy Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-white">{metrics.songCount || 0}</div>
              <div className="text-xs text-white/70">Songs</div>
              <QualityIndicator quality={metrics.averageQuality || 0} />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{decisions.releaseType || 'Single'}</div>
              <div className="text-xs text-white/70">Release Type</div>
              <Badge variant="outline" className="text-xs mt-1">
                +{metrics.releaseBonus || 0}% bonus
              </Badge>
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {Math.round(((metrics.seasonalMultiplier || 1) - 1) * 100) > 0 ? '+' : ''}
                {Math.round(((metrics.seasonalMultiplier || 1) - 1) * 100)}%
              </div>
              <div className="text-xs text-white/70">Seasonal</div>
              <SeasonalIndicator multiplier={metrics.seasonalMultiplier || 1} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="breakdown" className="text-xs">Marketing</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewBreakdown metrics={metrics} decisions={decisions} />
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <MarketingBreakdown metrics={metrics} decisions={decisions} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TimelineView decisions={decisions} gameState={gameState} />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <ROIOptimizationSuggestion metrics={metrics} decisions={decisions} />
      </div>
    </div>
  );
}

// Performance Card Component
function PerformanceCard({ title, value, subtitle, trend, icon: Icon, color }) {
  const colorClasses = {
    green: 'border-green-200 bg-green-50',
    blue: 'border-blue-200 bg-blue-50',
    red: 'border-red-200 bg-red-50',
    slate: 'border-[#4e324c]/50 bg-[#3c252d]/10'
  };

  const textColorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    slate: 'text-white/70'
  };

  return (
    <div className={`p-4 border rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-4 h-4 ${textColorClasses[color]}`} />
        {trend !== undefined && (
          <Badge variant="outline" className={`text-xs ${textColorClasses[color]}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <div className={`text-lg font-bold ${textColorClasses[color]}`}>{value}</div>
        <div className="text-xs text-white/70">{subtitle}</div>
      </div>
    </div>
  );
}

// Quality Indicator
function QualityIndicator({ quality }) {
  const getQualityColor = (q) => {
    if (q >= 90) return 'bg-green-500';
    if (q >= 80) return 'bg-blue-500';
    if (q >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full bg-[#65557c]/30 rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all ${getQualityColor(quality)}`}
        style={{ width: `${quality}%` }}
      />
    </div>
  );
}

// Seasonal Indicator
function SeasonalIndicator({ multiplier }) {
  const isPositive = multiplier > 1;
  return (
    <Badge
      variant={isPositive ? "default" : "secondary"}
      className={`text-xs mt-1 ${isPositive ? 'bg-green-100 text-green-700' : 'bg-[#65557c]/20 text-white/70'}`}
    >
      {isPositive ? 'Optimal' : 'Off-peak'}
    </Badge>
  );
}

// Overview Breakdown
function OverviewBreakdown({ metrics, decisions }) {
  const netProfit = (metrics.estimatedRevenue || 0) - (metrics.totalMarketingCost || 0);
  
  return (
    <div className="space-y-4">
      {/* Revenue Flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Revenue Flow</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <RevenueFlowBar
              baseRevenue={metrics.estimatedRevenue || 0}
              marketingCost={metrics.totalMarketingCost || 0}
              netProfit={netProfit}
            />
            
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-green-600 font-semibold">
                  ${(metrics.estimatedRevenue || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/50">Gross Revenue</div>
              </div>
              <div>
                <div className="text-red-600 font-semibold">
                  -${(metrics.totalMarketingCost || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/50">Marketing Cost</div>
              </div>
              <div>
                <div className={`font-semibold ${netProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netProfit > 0 ? '+' : ''}${netProfit.toLocaleString()}
                </div>
                <div className="text-xs text-white/50">Net Profit</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multiplier Stack */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Star className="w-4 h-4" />
            <span>Performance Multipliers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MultiplierStack
            base={100}
            multipliers={[
              { name: 'Base Quality', value: 100, type: 'base' },
              { name: 'Release Bonus', value: metrics.releaseBonus || 0, type: 'bonus' },
              { name: 'Seasonal', value: Math.round(((metrics.seasonalMultiplier || 1) - 1) * 100), type: 'seasonal' },
              { name: 'Marketing', value: Math.round(((metrics.marketingMultiplier || 1) - 1) * 100), type: 'marketing' },
              { name: 'Lead Single', value: Math.round(((metrics.leadSingleBoost || 1) - 1) * 100), type: 'lead' }
            ].filter(m => m.value > 0 || m.type === 'base')}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Revenue Flow Visualization
function RevenueFlowBar({ baseRevenue, marketingCost, netProfit }) {
  const maxValue = Math.max(baseRevenue, marketingCost) * 1.1;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-green-500 rounded-sm" />
        <span className="text-xs text-white/70">Revenue</span>
        <div className="flex-1 bg-[#65557c]/30 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${(baseRevenue / maxValue) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-red-500 rounded-sm" />
        <span className="text-xs text-white/70">Costs</span>
        <div className="flex-1 bg-[#65557c]/30 rounded-full h-2">
          <div
            className="bg-red-500 h-2 rounded-full"
            style={{ width: `${(marketingCost / maxValue) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Multiplier Stack Visualization
function MultiplierStack({ base, multipliers }) {
  let runningTotal = base;
  
  return (
    <div className="space-y-2">
      {multipliers.map((multiplier, index) => {
        const isBase = multiplier.type === 'base';
        const contribution = isBase ? multiplier.value : (runningTotal * multiplier.value / 100);
        if (!isBase) runningTotal += contribution;
        
        const colors = {
          base: 'bg-[#65557c]/80',
          bonus: 'bg-blue-500',
          seasonal: 'bg-green-500',
          marketing: 'bg-[#791014]',
          lead: 'bg-orange-500'
        };
        
        return (
          <div key={index} className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-sm ${colors[multiplier.type]}`} />
            <span className="text-sm text-white/90 min-w-[100px]">{multiplier.name}</span>
            <Badge variant="outline" className="text-xs">
              {isBase ? multiplier.value : `+${multiplier.value}%`}
            </Badge>
            <div className="flex-1 text-right text-sm font-mono">
              {Math.round(runningTotal).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Marketing Channel Breakdown
function MarketingBreakdown({ metrics, decisions }) {
  const channels = Object.entries(metrics.channelEffectiveness || {})
    .filter(([_, data]) => data.budget > 0)
    .sort((a, b) => b[1].budget - a[1].budget);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <PieChart className="w-4 h-4" />
            <span>Channel Allocation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {channels.map(([channelId, data]) => (
              <div key={channelId} className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{channelId}</span>
                    <span className="text-sm font-mono">${data.budget.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-[#65557c]/30 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${data.contribution}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>{data.effectiveness}% effective</span>
                    <span>{data.contribution.toFixed(1)}% of budget</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Timeline View
function TimelineView({ decisions, gameState }) {
  const currentMonth = gameState?.currentMonth || 1;
  const releaseMonth = decisions.releaseMonth || currentMonth + 2;
  const leadSingleMonth = decisions.leadSingleMonth || releaseMonth - 1;
  
  const timelineEvents = [
    {
      month: currentMonth,
      title: 'Planning Complete',
      type: 'milestone',
      status: 'completed'
    },
    ...(decisions.releaseType !== 'single' && decisions.leadSingle ? [{
      month: leadSingleMonth,
      title: 'Lead Single Release',
      type: 'release',
      status: 'planned'
    }] : []),
    {
      month: releaseMonth,
      title: `${decisions.releaseType || 'Single'} Release`,
      type: 'release',
      status: 'planned'
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Release Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timelineEvents.map((event, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  event.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{event.title}</span>
                    <Badge variant="outline" className="text-xs">
                      Month {event.month}
                    </Badge>
                  </div>
                  <div className="text-xs text-white/50">
                    {event.month === currentMonth ? 'This month' : 
                     event.month < currentMonth ? `${currentMonth - event.month} months ago` :
                     `${event.month - currentMonth} months from now`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ROI Optimization Suggestion
function ROIOptimizationSuggestion({ metrics, decisions }) {
  const roi = metrics.projectedROI || 0;
  
  if (roi > 25) return null; // Already good ROI
  
  const suggestions = [];
  
  if (roi < 0) {
    suggestions.push('Reduce marketing budget by 25%');
    suggestions.push('Focus on highest quality songs only');
  } else if (roi < 15) {
    suggestions.push('Increase digital marketing allocation');
    suggestions.push('Consider Q4 timing for seasonal bonus');
  }
  
  if (suggestions.length === 0) return null;
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="pt-4">
        <div className="flex items-start space-x-2">
          <Target className="w-4 h-4 text-orange-600 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-orange-900 mb-1">
              Optimization Opportunities
            </h5>
            <ul className="text-xs text-orange-700 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}