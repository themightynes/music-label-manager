import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Music, Trophy, Zap, X, BarChart3 } from 'lucide-react';
import { ChartPerformanceCard } from './ChartPerformanceCard';
import { WeekSummary as WeekSummaryType, GameChange } from '../../../shared/types/gameTypes';

interface WeekSummaryProps {
  weeklyStats: WeekSummaryType;
  onAdvanceWeek: () => void;
  isAdvancing?: boolean;
  isWeekResults?: boolean;
  onClose?: () => void;
}

export function WeekSummary({ weeklyStats, onAdvanceWeek, isAdvancing, isWeekResults, onClose }: WeekSummaryProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects'>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'project_complete': return '🎵'; // Changed from 🎉 for recording completion
      case 'revenue': return '💰';
      case 'ongoing_revenue': return '📻';
      case 'release': return '🚀'; // New releases generating initial revenue
      case 'expense': return '💸';
      case 'unlock': return '🔓';
      case 'artist': return '🎤';
      case 'mood': return '💭'; // Mood changes
      case 'reputation': return '⭐'; // Reputation changes
      default: return '📊';
    }
  };

  // NEW: Determine the scope of a mood change
  type MoodScope = 'global' | 'predetermined' | 'user_selected' | 'routine';
  const determineMoodScope = (change: GameChange): MoodScope => {
    // Check source field directly for scope value
    if (change.source) {
      if (change.source === 'user_selected') {
        return 'user_selected';
      }
      if (change.source === 'predetermined') {
        return 'predetermined';
      }
      if (change.source === 'global') {
        return 'global';
      }
      // BUGFIX: Match both 'weekly_routine' and 'weekly_drift' for natural mood changes
      if (change.source === 'weekly_routine' || change.source === 'weekly_drift') {
        return 'routine';
      }
    }

    // Fallback: If has artistId but no clear source, could be user_selected or predetermined
    if (change.artistId) {
      // Default to predetermined for per-artist meeting effects without explicit source
      return 'predetermined';
    }

    // No artistId means global effect
    return 'global';
  };

  // NEW: Get scope icon based on mood scope
  const getScopeIcon = (scope: MoodScope): string => {
    switch (scope) {
      case 'global': return '🌍';
      case 'predetermined': return '⭐';
      case 'user_selected': return '👤';
      case 'routine': return '🔄';
      default: return '💭';
    }
  };

  // NEW: Format mood change description with scope-specific formatting
  const formatMoodChange = (change: GameChange): string => {
    const scope = determineMoodScope(change);

    // Extract artist name from description if present, or use artistId
    // Most mood changes should have the artist name in the description already
    const description = change.description || 'Mood Change';

    // Format based on scope (no icon in text - it's displayed separately)
    switch (scope) {
      case 'global':
        return `${description} (All Artists)`;

      case 'predetermined':
        return `${description} (Most Popular)`;

      case 'user_selected':
        return `${description} (Your Choice)`;

      case 'routine':
        return `${description}`; // Routine changes already have descriptive text

      default:
        return `${description}`;
    }
  };

  const categorizeChanges = (changes: GameChange[]) => {
    const categories = {
      revenue: [] as GameChange[],
      expenses: [] as GameChange[],
      achievements: [] as GameChange[],
      mood: [] as GameChange[],
      other: [] as GameChange[]
    };

    changes.forEach(change => {
      if (change.type === 'revenue' || change.type === 'ongoing_revenue' || change.type === 'release') {
        categories.revenue.push(change);
      } else if (change.type === 'expense') {
        categories.expenses.push(change);
      } else if (change.type === 'unlock' || change.type === 'reputation') {
        categories.achievements.push(change);
      } else if (change.type === 'mood') {
        categories.mood.push(change);
      } else if (change.type === 'project_complete') {
        // Projects go to other category, will be shown in Projects tab
        categories.other.push(change);
      } else {
        categories.other.push(change);
      }
    });

    return categories;
  };

  const revenue = weeklyStats?.revenue || 0;
  const expenses = weeklyStats?.expenses || 0;
  const netIncome = revenue - expenses;
  const changes = weeklyStats?.changes || [];
  const categorizedChanges = categorizeChanges(changes);

  return (
    <div className="glass-panel chromatic-hairline hud-ticks rounded-card w-full max-w-7xl mx-auto text-text-primary">
      {/* Header Section - Clean and prominent */}
      <div className="px-8 py-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {isWeekResults ? `Week ${weeklyStats?.week || ''} Results` : 'Week Summary'}
            </h1>
            <p className="text-sm text-text-body mt-1">
              Your financial performance and key achievements
            </p>
          </div>

          {/* Close button - only show if onClose is provided */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-text-body hover:text-text-primary hover:bg-white/[0.08]"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {/* Big prominent net income display */}
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-[12px] ${netIncome >= 0 ? 'bg-positive/[0.14]' : 'bg-negative/[0.14]'}`}>
                {netIncome >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-positive" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-negative" />
                )}
              </div>
              <div>
                <div className={`text-2xl font-bold font-mono ${
                  netIncome >= 0 ? 'text-positive' : 'text-negative'
                }`}>
                  {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome)}
                </div>
                <div className="text-sm text-text-muted font-medium">Net Income</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Bar - Horizontal layout for easy scanning */}
      <div className="px-8 py-6 border-b border-white/[0.06]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Revenue Card */}
          <div className="glass-panel rounded-[14px] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-positive/[0.14] rounded-[12px]">
                  <TrendingUp className="h-5 w-5 text-positive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-positive">Revenue</h3>
                  <p className="text-xs text-text-muted">Income earned</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-money">
                  {formatCurrency(revenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="glass-panel rounded-[14px] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-negative/[0.14] rounded-[12px]">
                  <TrendingDown className="h-5 w-5 text-negative" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-negative">Expenses</h3>
                  <p className="text-xs text-text-muted">Costs incurred</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-money">
                  {formatCurrency(expenses)}
                </div>
              </div>
            </div>
          </div>

          {/* Profit Margin Card */}
          <div className="glass-panel rounded-[14px] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-[12px] ${netIncome >= 0 ? 'bg-neon-lilac/[0.14]' : 'bg-neon-amber/[0.14]'}`}>
                  <DollarSign className={`h-5 w-5 ${netIncome >= 0 ? 'text-neon-lilac' : 'text-neon-amber'}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${netIncome >= 0 ? 'text-neon-lilac' : 'text-neon-amber'}`}>
                    Profit Margin
                  </h3>
                  <p className="text-xs text-text-muted">Performance ratio</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold font-mono ${netIncome >= 0 ? 'text-neon-lilac' : 'text-neon-amber'}`}>
                  {revenue > 0 ? `${((netIncome / revenue) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual breakdown bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">Financial Breakdown</h4>
            <div className="text-xs text-text-muted">
              Revenue vs Expenses
            </div>
          </div>

          <div className="relative bg-white/[0.08] rounded-pill h-4 overflow-hidden">
            {revenue > 0 && (
              <div
                className="absolute left-0 top-0 h-full bg-positive rounded-pill transition-all duration-500"
                style={{ width: `${(revenue / (revenue + expenses)) * 100}%` }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xs font-medium text-text-primary/90">
                {revenue > 0 ? `${formatCurrency(revenue)} earned` : 'No revenue'}
                {expenses > 0 && ` • ${formatCurrency(expenses)} spent`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-8 py-6">
        {isWeekResults && (changes.length > 0 || (weeklyStats?.chartUpdates?.length ?? 0) > 0) ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Charts</span>
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center space-x-2">
                <Music className="h-4 w-4" />
                <span>Projects</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Revenue Sources */}
                {categorizedChanges.revenue.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-positive text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span>Revenue Sources</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categorizedChanges.revenue.map((change: GameChange, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-positive/[0.08] rounded-[12px] border border-positive/20">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">{getChangeIcon(change.type)}</span>
                            <span className="text-sm font-medium text-text-primary">{change.description}</span>
                          </div>
                          <Badge variant="outline" className="text-xs font-mono text-positive border-positive/40 font-semibold">
                            +{formatCurrency(change.amount || 0)}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Chart Performance Summary for Overview */}
                {weeklyStats?.chartUpdates && weeklyStats.chartUpdates.filter((update: any) => !update.isCompetitorSong).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-neon-amber text-sm">
                        <BarChart3 className="h-4 w-4" />
                        <span>Chart Highlights</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartPerformanceCard
                        chartUpdates={weeklyStats.chartUpdates?.filter((update: any) => !update.isCompetitorSong) || []}
                        showHeader={false}
                        compact={true}
                        variant="dark"
                        className="border-0 p-0 bg-transparent"
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Achievements */}
                {categorizedChanges.achievements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-neon-lilac text-sm">
                        <Trophy className="h-4 w-4" />
                        <span>Achievements</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categorizedChanges.achievements.map((change: GameChange, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-neon-purple/10 rounded-[12px] border border-neon-purple/20">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">{getChangeIcon(change.type)}</span>
                            <span className="text-sm font-medium text-neon-lilac">{change.description}</span>
                          </div>
                          {change.type === 'reputation' && change.amount !== undefined && change.amount !== 0 && (
                            <Badge variant="outline" className="text-xs font-mono text-neon-lilac border-neon-purple/40 font-semibold">
                              {change.amount > 0 ? '+' : ''}{change.amount}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Mood Changes - NEW */}
                {categorizedChanges.mood.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-neon-lilac text-sm">
                        <span className="text-base">💭</span>
                        <span>Mood Changes</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categorizedChanges.mood.map((change: GameChange, index: number) => {
                        const scope = determineMoodScope(change);
                        const scopeIcon = getScopeIcon(scope);
                        const moodDelta = change.moodChange || 0;
                        const isPositive = moodDelta >= 0;

                        // Determine scope-specific styling
                        const scopeColors: Record<MoodScope, string> = {
                          global: 'bg-neon-blue/20 text-neon-blue border-neon-blue/30',
                          predetermined: 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30',
                          user_selected: 'bg-neon-purple/20 text-neon-lilac border-neon-purple/30',
                          routine: 'bg-white/[0.06] text-white/60 border-white/[0.12]',
                        };

                        return (
                          <div
                            key={index}
                            className={`p-3 rounded-[12px] border ${
                              isPositive
                                ? 'bg-neon-purple/10 border-neon-purple/20'
                                : 'bg-neon-amber/10 border-neon-amber/20'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Scope Icon with visual styling */}
                              <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg border ${
                                  scopeColors[scope]
                                }`}
                              >
                                {scopeIcon}
                              </div>

                              {/* Content */}
                              <div className="flex-1 flex items-start justify-between gap-2">
                                <span className="text-sm font-medium text-white/90">
                                  {formatMoodChange(change)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-mono font-semibold flex-shrink-0 ${
                                    isPositive
                                      ? 'text-neon-lilac border-neon-purple/40'
                                      : 'text-neon-amber border-neon-amber/40'
                                  }`}
                                >
                                  {isPositive ? '+' : ''}{moodDelta}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Performance Summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center space-x-2 p-4 rounded-xl ${
                      netIncome >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
                    }`}>
                      {netIncome >= 0 ? (
                        <Zap className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                      <span className="text-sm font-semibold">
                        {netIncome >= 0 ? 
                          `Excellent! You generated ${formatCurrency(netIncome)} in profit this week.` :
                          `Focus needed: You had a ${formatCurrency(Math.abs(netIncome))} loss this week.`
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="charts" className="space-y-6">
              {weeklyStats?.chartUpdates && weeklyStats.chartUpdates.filter((update: any) => !update.isCompetitorSong).length > 0 ? (
                <div className="space-y-6">
                  <ChartPerformanceCard
                    chartUpdates={weeklyStats.chartUpdates?.filter((update: any) => !update.isCompetitorSong) || []}
                    variant="dark"
                    className="border-white/[0.08]"
                  />

                  {/* Chart Movement Summary */}
                  <Card className="border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-white text-sm">
                        <BarChart3 className="h-4 w-4" />
                        <span>Chart Movement Analysis</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold font-mono text-neon-yellow">
                            {weeklyStats.chartUpdates.filter((u: any) => u.isDebut && !u.isCompetitorSong).length}
                          </div>
                          <div className="text-sm text-white/70">New Debuts</div>
                          <div className="text-xs text-white/50 mt-1">Your songs entering charts</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold font-mono text-positive">
                            {weeklyStats.chartUpdates.filter((u: any) => u.movement && u.movement > 0 && !u.isCompetitorSong).length}
                          </div>
                          <div className="text-sm text-white/70">Climbing</div>
                          <div className="text-xs text-white/50 mt-1">Your songs moving up</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold font-mono text-neon-cyan">
                            {weeklyStats.chartUpdates.filter((u: any) => u.position && u.position <= 10 && !u.isCompetitorSong).length}
                          </div>
                          <div className="text-sm text-white/70">Top 10</div>
                          <div className="text-xs text-white/50 mt-1">Your songs in elite positions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-white/[0.08]">
                  <CardContent className="p-12 text-center">
                    <div className="w-[52px] h-[52px] rounded-[14px] bg-neon-purple/[0.12] border border-neon-purple/[0.32] shadow-glow-purple flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-5 w-5 text-neon-lilac" />
                    </div>
                    <h3 className="text-sm font-semibold text-white/85 mb-2">No Chart Activity</h3>
                    <p className="text-xs text-white/45">No songs charted this week</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              {changes.filter((c: GameChange) => c.type === 'project_complete' || c.type === 'song_release').length > 0 ? (
                <div className="grid gap-4">
                  {changes.filter((c: GameChange) => c.type === 'project_complete' || c.type === 'song_release').map((change: GameChange, index: number) => (
                    <Card key={index} className="border-white/[0.08] hover:shadow-panel transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-positive/[0.14] rounded-full">
                              <Music className="h-5 w-5 text-positive" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-text-primary">{change.description}</h4>
                              <div className="flex items-center space-x-4 text-xs text-white/50 mt-1">
                                <span>Revenue: <span className="font-mono text-money">{formatCurrency(change.amount || 0)}</span></span>
                                {change.projectId && <span className="font-mono">Project ID: {change.projectId}</span>}
                              </div>
                            </div>
                          </div>
                          <Badge className="rounded-pill bg-positive/[0.14] border border-positive/40 font-mono text-positive px-2 py-1 text-xs">
                            {change.type === 'project_complete' ? 'Recorded' : 'Released'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-white/[0.08]">
                  <CardContent className="p-12 text-center">
                    <div className="w-[52px] h-[52px] rounded-[14px] bg-neon-cyan/[0.12] border border-neon-cyan/[0.32] shadow-glow-cyan flex items-center justify-center mx-auto mb-4">
                      <Music className="h-5 w-5 text-neon-cyan" />
                    </div>
                    <h3 className="text-sm font-semibold text-white/85 mb-2">No Projects Completed</h3>
                    <p className="text-xs text-white/45">No projects were completed this week</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Empty state for no results */
          <Card className="border-white/[0.08]">
            <CardContent className="p-12 text-center">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-neon-purple/[0.12] border border-neon-purple/[0.32] shadow-glow-purple mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-neon-lilac" />
              </div>
              <h3 className="text-base font-semibold text-white/85 mb-2">No Results Available</h3>
              <p className="text-sm text-white/45">No detailed results are available for this week</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-6 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-md mx-auto">
          <Button
            onClick={onAdvanceWeek}
            disabled={isAdvancing}
            size="lg"
            className="w-full bg-gradient-to-br from-action-pink to-action-purple text-white font-semibold py-4 px-6 rounded-button transition-all duration-200 shadow-action hover:opacity-95"
          >
            {isAdvancing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Advancing...
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                {isWeekResults ? (
                  <>
                    <DollarSign className="h-5 w-5" />
                    <span>Back to Dashboard</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    <span>Continue to Next Week</span>
                  </>
                )}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}